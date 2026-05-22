// app/api/whatsapp/reply/route.ts
// Twilio inbound webhook for SMS replies (routed under /api/whatsapp/ for
// continuity — the engine was originally built for WhatsApp).
//
// Twilio retries any webhook that doesn't 200 within 15 seconds, and a
// retry causes the lead to receive duplicate replies. So we ack
// immediately with a plain 200 OK and run all processing in a detached
// promise. The outbound reply is sent via Twilio's REST API ourselves —
// no TwiML required. Errors during processing are caught and logged;
// they never surface back to Twilio.

import { NextRequest } from 'next/server'
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
import { classifyIntent, type Intent } from '@/lib/whatsapp-intent'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripChannelPrefix(phone: string): string {
  // Defensive — strip any leftover channel prefix in case Twilio's payload
  // ever includes one (it doesn't for SMS, but historical data might).
  return phone.replace(/^(whatsapp|sms):/i, '').trim()
}

interface LeadLookup {
  id: string
  name: string
  address: string
  conversation: ConversationState
  waStatus: string
}

async function findLeadByPhone(phone: string): Promise<LeadLookup | null> {
  // Try multiple variations — Monday stores phone with/without + and
  // may have spaces depending on entry path.
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
          column_values(ids: ["${COL.address}", "${COL.waConversation}", "${COL.waStatus}"]) {
            id text value
          }
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
        address: cols.get(COL.address)?.text || '',
        conversation,
        waStatus: cols.get(COL.waStatus)?.text || '',
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

  // SMS — plain E.164 on both From and To, no channel prefix.
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

// Compose a contextual reply via Claude. Returns null on error.
async function generateReply(
  conversation: ConversationState,
  leadName: string,
  leadAddress: string,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const recent = conversation.messages.slice(-6)
  const messages = recent.map((m) => ({
    role: m.role === 'outbound' ? 'assistant' : 'user',
    content: m.content,
  }))

  // If the most recent message is not an inbound one, Claude needs
  // something to respond to — skip.
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return null
  }

  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/stayful/web-meeting'
  const system = `You are an SMS assistant for Stayful, a Sheffield-based short-term rental property management company. You are texting a UK property owner who was cold contacted about letting Stayful manage their property as a short-term rental. Your role: qualify the lead, handle objections using the VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION framework, and guide toward booking a web meeting. You are warm, professional, specific, and never pushy. You write like a knowledgeable person, not a chatbot. Maximum 3 sentences per reply. SMS is plain text — never use bold, markdown, bullet points, or emoji. Never mention you are an AI.

Lead context:
- Name: ${leadName || 'unknown'}
- Property: ${leadAddress || 'unknown'}
- Booking link (only share when the lead is ready to book): ${calendly}

Respond as the next outbound SMS. Plain text only, no greeting boilerplate, no signature.`

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
        max_tokens: 300,
        system,
        messages,
      }),
    })
    if (!res.ok) return null
    const json: any = await res.json()
    const text = json?.content?.[0]?.text
    if (typeof text !== 'string') return null
    return text.trim()
  } catch (err) {
    console.error('[whatsapp/reply] claude reply failed', err)
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

// ── Async processor (fire-and-forget) ────────────────────────────────────────

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

  const intent: Intent = await classifyIntent(body, lead.conversation)
  let conversation = appendMessage(lead.conversation, 'inbound', body, intent)

  // Abandonment — close out, no reply.
  if (intent === 'abandonment') {
    try {
      await updateConversationColumns(lead.id, {
        [COL.waStatus]: { label: 'Abandoned' },
        [COL.waCompleted]: { checked: 'true' },
        [COL.waConversation]: serializeConversation({
          ...conversation,
          abandonmentSignals: (conversation.abandonmentSignals || 0) + 1,
        }),
        [COL.waReplies]: (conversation.messages.filter((m) => m.role === 'inbound').length),
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

  // Booking — acknowledge with Calendly link, mark Booked.
  const calendly = process.env.CALENDLY_LINK || 'https://calendly.com/stayful/web-meeting'
  let replyText: string | null = null
  let newStatus: 'Booked' | 'Replied' = 'Replied'

  if (intent === 'booking_signal') {
    newStatus = 'Booked'
    conversation = { ...conversation, bookingDetected: true }
    replyText =
      `Brilliant — easiest way is to grab a slot here: ${calendly}. ` +
      `Pick whichever works and I'll have the figures and a couple of comparable cases ready for you. Looking forward to it.`
  } else {
    // For all other intents, generate a contextual reply.
    replyText = await generateReply(conversation, lead.name, lead.address)
    if (!replyText) {
      // Don't go silent: send a safe fallback.
      replyText =
        `Thanks for coming back to me. Happy to share the breakdown for your property and answer any specifics — what would be most useful to know first?`
    }
  }

  // Send the reply.
  const sendResult = await sendTwilio(phone, replyText)
  if ('error' in sendResult) {
    console.error('[whatsapp/reply] twilio send failed', sendResult.error)
    // Still record the inbound message so we don't lose state.
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

  // Final Monday update.
  const inboundCount = conversation.messages.filter((m) => m.role === 'inbound').length
  const updates: Record<string, any> = {
    [COL.waConversation]: serializeConversation(conversation),
    [COL.waReplies]: inboundCount,
  }
  // Only set status if not already Booked (preserve the stronger state).
  if (newStatus === 'Booked') {
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

  // Fire-and-forget the async processing. Twilio needs the 200 fast.
  if (fromPhone && body) {
    processInboundReply(fromPhone, body).catch((err) => {
      console.error('[whatsapp/reply] processing error', err)
    })
  }

  // SMS — no TwiML required. We send the outbound reply via Twilio's REST
  // API inside processInboundReply, so a plain 200 is enough.
  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
