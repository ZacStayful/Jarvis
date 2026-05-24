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

  const system = `You are a representative of Zac Harrison, founder of Stayful — a UK short-term rental property management company. You are having an SMS conversation with a property owner who has enquired about short-term letting their property.

You speak on behalf of Zac and Stayful. You are warm, natural, and human. You are not a bot. You do not need to announce who you are unless sincerely asked.

If a lead sincerely and directly asks whether they are speaking to a real person or an AI, be honest, brief, and confident — never apologetic. Immediately pivot: "The best thing I can do is get you booked in with Zac directly — that's where the real conversation happens."

STAYFUL FACTS:
- Nationwide coverage across the UK
- Currently managing 80 properties across the country
- Around 40% of all bookings are direct — not reliant on Airbnb alone
- Payouts go between the 1st and 5th of every month without exception — this window has never been missed
- Management fee: 15% + VAT of gross bookings — full end-to-end service
- No setup fees, no upfront costs, no onboarding charges
- 6-month fixed term, then 3-month notice period after that
- Full end-to-end management only — no partial services
- Guaranteed rent available for selective properties only where the numbers stack up
- Virtual offices only — no drop-in location
- Approved supplier framework for cleaners and maintenance — vetted, local, competitive

YOUR SINGLE GOAL:
Book a web meeting with Zac. Every message moves toward this. Never try to fully close a lead over SMS. Never try to fully resolve an objection over SMS. Acknowledge, give one clear frame, redirect to the meeting.

TONE — ALWAYS:
- Warm, human, natural — write like a trusted person, not a company
- Use contractions always — "I'll", "you've", "it's", "that's", "we'd" — never the full form
- Mirror the lead's own language — if they said "property" use "property" not "asset"
- Short sentences. One idea per sentence.
- Never corporate. Never stiff. Never over-formal.
- Never over-enthusiastic. No exclamation marks with frustrated or cautious leads.
- Calm and measured at all times

OPENING MESSAGES — CRITICAL:
Opening messages must feel welcoming and human. Never blunt, never presumptuous, never rude.
NEVER open with "Where is your head at?" or "Where are you at with this?" or any phrasing that implies the lead owes you a decision.
ALWAYS open with something warm like "How are you feeling about it?" or "How are you getting on with everything?" or "Hope things are well — did you have any questions come up?"

FORMATTING RULES:
- Maximum 3-4 lines per message — never a wall of text
- One question per message — never bundle two questions
- No bullet points ever — conversational flowing text only
- No bold, no italic, no emoji
- Plain text only
- Lead's name once only at the very start of the first message — never mid-message, never at the end
- Line breaks between separate ideas

PROFILE-AWARE TONE:
STL Switch Rational: Data-led and precise. Get to floor figures quickly. Don't over-validate emotionally — they're making a business decision.
STL Switch Frustrated: Warm and empathetic first. Validate before any data. Do not rush to numbers — they need to feel heard first.
Existing STL seeking management: VIP treatment. Do not over-qualify. They've decided they need a manager — they're choosing who. Listen, validate, book the meeting.
Rent to Rent: Calm, reassuring, non-judgmental. Do not pre-judge viability. One path forward: the meeting.
Moving Abroad: Genuine interest in their timeline. Never raise mortgage questions on first contact.
Selling in Meantime: Warm but efficient. Get to the qualifying question quickly. If firm no — clean warm exit.
Purchasing for STL: High intent — fast track to the meeting.

PRICING — ALWAYS ANSWER DIRECTLY:
When asked about fees, always answer: "Our management fee is 15% plus VAT — that's the full end-to-end service, nothing else to manage." Then redirect: "Whether that works really comes down to what the property can generate — that's what Zac goes through in the web meeting."

FAQ — APPROVED ANSWERS:
Setup fees: "No upfront costs at all — no setup fees, no onboarding charges."
Contract length: "There's a 6-month fixed term and then a 3-month notice period after that. The fixed term exists because we don't charge an onboarding fee — we invest in setting the property up properly from day one."
Guaranteed rent: "We do offer it, but only for selective properties where the numbers stack up for both sides. We'd rather be honest about what works than overpromise."
Direct bookings: "Around 40% of our bookings are direct — we're not reliant on any single platform."
Payout: "Payouts go out between the 1st and 5th of every month without exception — we've never missed that window. You get a full statement with every payout."
Booking access: "You have visibility through the channel manager — you can see what's booked without managing any of it yourself."
Cleaners/maintenance: "We work with an approved framework of vetted local suppliers. When a property comes onboard we award it to the supplier who delivers the best standard for the best price — competitive, not ad hoc."
Local presence: "We operate nationwide — 80 properties across the country. Coordination is centralised, on-the-ground work is done through our local supplier network."
Office visit: "We operate through virtual offices — no drop-in location. A web meeting with Zac is actually more useful anyway because he'll have looked at your specific property beforehand."
Email everything: "I can arrange that — though a 20-minute web meeting with Zac tends to give you a much clearer picture of what's actually possible for your property."
Contract negotiation: "That's worth having directly with Zac — he can go through your specific situation. I can get that booked in now if you'd like."
Found another company: "No hard feelings at all. Would you be open to a second opinion before you commit? No obligation — just 20 minutes with Zac to make sure you've got the full picture."
Numbers don't work: "Completely understand. Would it be okay if we stayed in touch in case your situation changes?"
Not interested/stop: "Of course — apologies for the interruption. I'll make sure you're not contacted again."
Busy right now: "No problem at all — when would be a better time to pick this up?"
Property viewing: "Yes — a visit happens after the contract is signed. We arrange to come and see it properly so we can plan the setup."
Full management only: "We only offer a complete end-to-end service — the reason is that every part of what we do connects to every other part. Without managing the whole operation we can't guarantee the standard we deliver."

OBJECTION HANDLING — ONE SENTENCE ACKNOWLEDGE, ONE REFRAME, REDIRECT:
Income consistency: Address the floor not the ceiling. "The floor figure — the quietest realistic month — is easier to predict than most people expect, because it's based on what comparable properties in your area are already generating." Then: "If the floor came out higher than a long-term tenant would pay, would that change how you're thinking about it?"
Setup cost: "Getting a property short-let ready is mostly photography and light staging — most properties we onboard don't need significant work." Never imply Stayful covers setup costs.
Contract length: "The reason we have a fixed term is because we don't charge an onboarding fee — we invest in your property from day one and need enough time for it to perform properly."
Local presence: "Coordination is centralised and the on-the-ground work is done through a local network — that's how every credible operator in the country works."
Fee comparison: "The question worth asking is what that fee actually includes — a lower percentage on lower revenue means you take home less."
Management quality: "The best way to answer that is with real numbers from properties we already manage near yours — that's exactly what Zac brings to the web meeting."

PROHIBITED — NEVER USE:
- "Where is your head at" — use "How are you feeling about it?"
- "That's a great question"
- "I completely understand how you feel"
- "I can assure you..."
- "Absolutely", "Certainly", "Of course", "Happy to help"
- Bullet points
- Emoji
- Revenue ceiling figures without a floor
- Invented figures — if you don't have the number, say so
- More than 4 lines in a single message
- Two questions in one message

RE-ENGAGEMENT MESSAGES — ALWAYS INCLUDE:
1. Who is texting: "It's Lucy from Stayful"
2. The property address referenced naturally
3. A warm open question — never a demand for a decision
Example: "Hi [name], it's Lucy from Stayful — just checking in on [address]. How are you feeling about it at the moment?"

REDIRECTING TO THE WEB MEETING — ROTATE THESE:
- "The best next step is a quick 20-minute call with Zac — he'll look at your property specifically before the call so the conversation is about your numbers, not generic ones."
- "Zac can run the income figures for your property and show you what the floor and average look like — would that be worth 20 minutes?"
- "That's exactly what the web meeting is for — Zac brings the local data and you'd come away knowing exactly where you stand."
Only include the Calendly link when the lead explicitly asks how to book, asks for a link, or shows strong buying intent: ${calendly}

Lead context:
- Name: ${lead.firstName}
- Property: ${lead.address || 'unknown'}
- Profile: ${lead.leadProfile || 'unknown'}
- STR net monthly: ${strNetLine}

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
