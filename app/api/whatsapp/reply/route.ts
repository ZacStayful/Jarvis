// app/api/whatsapp/reply/route.ts
// Twilio inbound webhook for SMS replies (routed under /api/whatsapp/ for
// continuity — the engine was originally built for WhatsApp).
//
// Twilio retries any webhook that doesn't 200 within 15 seconds, and a
// retry causes the lead to receive duplicate replies. So we ack
// immediately with empty TwiML and run all processing via after() which
// guarantees execution completes after the response is sent.
//
// Intent classification and reply composition are fused into a single
// Claude call returning JSON — halves end-to-end latency vs the previous
// two-call flow and keeps the two outputs in lockstep.

import { NextRequest, after } from 'next/server'
import { mondayQuery, escapeJSONForGraphQL } from '@/lib/monday-client'
import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
} from '@/lib/monday-columns'
import {
  parseConversation,
  appendMessage,
  serializeConversation,
  type ConversationState,
} from '@/lib/whatsapp-conversation'
import { extractFirstName } from '@/lib/whatsapp-templates'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

type Intent =
  | 'booking_signal'
  | 'positive_interest'
  | 'objection'
  | 'abandonment'
  | 'question'
  | 'unclear'

const ALLOWED_INTENTS: Intent[] = [
  'booking_signal',
  'positive_interest',
  'objection',
  'abandonment',
  'question',
  'unclear',
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripChannelPrefix(phone: string): string {
  return phone.replace(/^(whatsapp|sms):/i, '').trim()
}

interface LeadLookup {
  id: string
  name: string
  firstName: string
  address: string
  bedrooms: string
  leadProfile: string
  conversation: ConversationState
  waStatus: string
  strNetMonthly: number | null
}

async function findLeadByPhone(phone: string): Promise<LeadLookup | null> {
  const variants = Array.from(
    new Set([
      phone,
      phone.replace(/^\+/, ''),
      phone.startsWith('+') ? phone : `+${phone}`,
    ]),
  )

  for (const variant of variants) {
    const query = `query {
      items_page_by_column_values(
        board_id: ${MANAGEMENT_LEADS_BOARD},
        columns: [{ column_id: "${COL.phoneE164}", column_values: ["${variant}"] }],
        limit: 1
      ) {
        items {
          id
          name
          column_values(ids: [
            "${COL.address}",
            "${COL.bedrooms}",
            "${COL.leadProfile}",
            "${COL.waConversation}",
            "${COL.waStatus}"
          ]) { id text value }
        }
      }
    }`
    try {
      const data = await mondayQuery(query)
      const item = data?.items_page_by_column_values?.items?.[0]
      if (!item) continue
      const cols = new Map<string, { text: string | null; value: string | null }>()
      for (const c of item.column_values || []) {
        cols.set(c.id, { text: c.text, value: c.value })
      }
      const rawConvo = cols.get(COL.waConversation)?.text || ''
      const conversation = parseConversation(rawConvo)
      if (!conversation.leadId) conversation.leadId = String(item.id)
      return {
        id: String(item.id),
        name: item.name || '',
        firstName: extractFirstName(item.name || ''),
        address: cols.get(COL.address)?.text || '',
        bedrooms: cols.get(COL.bedrooms)?.text || '',
        leadProfile: cols.get(COL.leadProfile)?.text || '',
        conversation,
        waStatus: cols.get(COL.waStatus)?.text || '',
        strNetMonthly: null,
      }
    } catch (err) {
      console.error('[whatsapp/reply] lookup failed for variant', variant, err)
    }
  }
  return null
}

async function sendTwilio(toPhone: string, body: string): Promise<{ messageSid: string } | { error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER
  if (!sid || !token || !from) return { error: 'twilio_env_missing' }

  const to = toPhone.replace(/^whatsapp:/i, '')
  const fromNormalised = from.replace(/^whatsapp:/i, '')
  const auth = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
  const params = new URLSearchParams({ From: fromNormalised, To: to, Body: body })

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    )
    const json: any = await res.json().catch(() => ({}))
    if (!res.ok) return { error: json?.message || `twilio_${res.status}` }
    if (!json?.sid) return { error: 'twilio_no_sid' }
    return { messageSid: json.sid }
  } catch (err) {
    return { error: (err as Error).message || 'twilio_exception' }
  }
}

async function logActivity(payload: {
  leadId: string
  leadName: string
  eventType: string
  source: string
  notes: string
}): Promise<void> {
  const url = process.env.N8N_LOG_ACTIVITY_WEBHOOK
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[whatsapp/reply] activity log failed', err)
  }
}

async function classifyAndReply(
  conversation: ConversationState,
  inboundBody: string,
  lead: LeadLookup,
): Promise<{ intent: Intent; reply: string } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/stayful/web-meeting'

  const recent = conversation.messages.slice(-6)
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = recent.map((m) => ({
    role: m.role === 'outbound' ? 'assistant' : 'user',
    content: m.content,
  }))
  if (
    messages.length === 0 ||
    messages[messages.length - 1].role !== 'user' ||
    messages[messages.length - 1].content !== inboundBody
  ) {
    messages.push({ role: 'user', content: inboundBody })
  }

  const strNetLine = lead.strNetMonthly
    ? `£${Math.round(lead.strNetMonthly).toLocaleString('en-GB')} per month`
    : 'not yet calculated'

  const system = `You are Zac from Stayful, a UK-based short-term rental property management company. You are having an SMS conversation with a UK property owner who enquired about short letting their property.

Your goals in order:
1. Understand what they are saying and respond naturally.
2. Answer any questions they have briefly and specifically.
3. Guide the conversation toward booking a web meeting.

Rules:
- Maximum 2-3 sentences per reply.
- Plain text only — no bullet points, no bold, no emoji.
- Never mention you are an AI or automated.
- Never use filler phrases like "great", "absolutely", "certainly", "of course", "happy to help".
- Never end with the lead's name. Never address them by name mid-message. Use first name once on the first message only.
- One question or CTA per message maximum.
- Only include the Calendly link if they explicitly ask for a call, ask how to book, or show strong buying intent.
- Calendly link: ${calendly}
- Use specific figures from their property data when available. If you don't have a figure, don't invent one.
- If they ask something you don't know — be honest and brief.

Lead context:
- Property: ${lead.address || 'unknown'}
- Profile: ${lead.leadProfile || 'unknown'}
- STR net: ${strNetLine}

Always respond in this exact JSON format and nothing else. No code fence, no preamble:
{"intent": "booking_signal|positive_interest|objection|abandonment|question|unclear", "reply": "your SMS reply here"}

intent definitions:
- booking_signal: asks for call, asks how to book, says yes, asks for more detail actively
- positive_interest: engaged but no specific action yet
- objection: raises concern about cost, trust, management, consistency, mortgage, tenants
- abandonment: stop, not interested, remove me, unsubscribe
- question: asks a specific factual question
- unclear: cannot determine`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system,
        messages,
      }),
    })
    if (!res.ok) {
      console.error('[whatsapp/reply] claude api status', res.status)
      return null
    }
    const json: any = await res.json()
    const text = json?.content?.[0]?.text
    if (typeof text !== 'string' || !text.trim()) return null

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    try {
      const parsed = JSON.parse(cleaned)
      const intent = ALLOWED_INTENTS.includes(parsed?.intent) ? (parsed.intent as Intent) : 'unclear'
      const reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : ''
      if (!reply) {
        if (cleaned && !cleaned.startsWith('{')) return { intent: 'unclear', reply: cleaned }
        return null
      }
      return { intent, reply }
    } catch {
      const safe = cleaned.replace(/^\{.*?:\s*"?/, '').replace(/"?\s*\}?$/, '').trim()
      if (!safe) return null
      return { intent: 'unclear', reply: safe }
    }
  } catch (err) {
    console.error('[whatsapp/reply] claude call failed', err)
    return null
  }
}

async function updateConversationColumns(
  leadId: string,
  updates: Record<string, any>,
): Promise<void> {
  const columnValuesJSON = JSON.stringify(updates)
  const mutation = `mutation {
    change_multiple_column_values(
      board_id: ${MANAGEMENT_LEADS_BOARD},
      item_id: ${leadId},
      column_values: "${escapeJSONForGraphQL(columnValuesJSON)}"
    ) { id }
  }`
  await mondayQuery(mutation)
}

// ── Async processor ───────────────────────────────────────────────────────────

async function processInboundReply(fromPhone: string, body: string): Promise<void> {
  const phone = stripChannelPrefix(fromPhone)
  if (!phone || !body) {
    console.warn('[whatsapp/reply] empty payload, ignoring')
    return
  }

  const lead = await findLeadByPhone(phone)
  if (!lead) {
    console.warn('[whatsapp/reply] no lead found for', phone)
    return
  }

  let conversation = appendMessage(lead.conversation, 'inbound', body)

  const result = await classifyAndReply(conversation, body, lead)
  if (!result) {
    try {
      const inboundCount = conversation.messages.filter((m) => m.role === 'inbound').length
      await updateConversationColumns(lead.id, {
        [COL.waConversation]: serializeConversation(conversation),
        [COL.waReplies]: inboundCount,
        ...(lead.waStatus !== 'Booked' ? { [COL.waStatus]: { label: 'Replied' } } : {}),
      })
    } catch (err) {
      console.error('[whatsapp/reply] monday update after claude fail', err)
    }
    return
  }

  const { intent, reply: replyText } = result

  conversation = {
    ...conversation,
    messages: conversation.messages.map((m, i, arr) =>
      i === arr.length - 1 && m.role === 'inbound' ? { ...m, intent } : m,
    ),
  }

  if (intent === 'abandonment') {
    try {
      await updateConversationColumns(lead.id, {
        [COL.waStatus]: { label: 'Abandoned' },
        [COL.waCompleted]: { checked: 'true' },
        [COL.waConversation]: serializeConversation({
          ...conversation,
          abandonmentSignals: (conversation.abandonmentSignals || 0) + 1,
        }),
        [COL.waReplies]: conversation.messages.filter((m) => m.role === 'inbound').length,
      })
    } catch (err) {
      console.error('[whatsapp/reply] monday abandonment update failed', err)
    }
    await logActivity({
      leadId: lead.id,
      leadName: lead.name,
      eventType: 'WhatsApp Abandoned',
      source: 'Vercel',
      notes: 'abandonment',
    })
    return
  }

  const sendResult = await sendTwilio(phone, replyText)
  if ('error' in sendResult) {
    console.error('[whatsapp/reply] twilio send failed', sendResult.error)
    try {
      await updateConversationColumns(lead.id, {
        [COL.waConversation]: serializeConversation(conversation),
        [COL.waReplies]: conversation.messages.filter((m) => m.role === 'inbound').length,
        ...(lead.waStatus !== 'Booked' ? { [COL.waStatus]: { label: 'Replied' } } : {}),
      })
    } catch (err) {
      console.error('[whatsapp/reply] monday update failed after twilio fail', err)
    }
    return
  }

  conversation = appendMessage(conversation, 'outbound', replyText)
  if (intent === 'booking_signal') {
    conversation = { ...conversation, bookingDetected: true }
  }

  const inboundCount = conversation.messages.filter((m) => m.role === 'inbound').length
  const updates: Record<string, any> = {
    [COL.waConversation]: serializeConversation(conversation),
    [COL.waReplies]: inboundCount,
  }
  if (intent === 'booking_signal') {
    updates[COL.waStatus] = { label: 'Booked' }
  } else if (lead.waStatus !== 'Booked') {
    updates[COL.waStatus] = { label: 'Replied' }
  }

  try {
    await updateConversationColumns(lead.id, updates)
  } catch (err) {
    console.error('[whatsapp/reply] final monday update failed', err)
  }

  await logActivity({
    leadId: lead.id,
    leadName: lead.name,
    eventType: 'WhatsApp Replied',
    source: 'Vercel',
    notes: intent,
  })
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let fromPhone = ''
  let body = ''
  try {
    const form = await req.formData()
    fromPhone = String(form.get('From') || '')
    body = String(form.get('Body') || '')
  } catch (err) {
    console.error('[whatsapp/reply] form parse failed', err)
  }

  // after() guarantees processInboundReply runs to completion after the
  // response is sent. Unlike fire-and-forget .catch(), Vercel will not
  // suspend the execution context mid-processing.
  if (fromPhone && body) {
    after(async () => {
      await processInboundReply(fromPhone, body).catch((err) => {
        console.error('[whatsapp/reply] processing error', err)
      })
    })
  }

  // Return empty TwiML — no body text. A plain-text "OK" body causes
  // Twilio to deliver it as an SMS to the lead, which is the bug.
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
