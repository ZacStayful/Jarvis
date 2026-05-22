// lib/whatsapp-templates.ts
// Outbound SMS message templates for cold-lead outreach. (File name is
// historical — the engine was originally built for WhatsApp and the
// routes still live under /api/whatsapp/.)
//
// Tone follows the Stayful lead-intelligence framework:
// VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION. Outreach is
// property-owner-to-property-owner, direct, never pushy, never AI.
// First message never includes the Calendly link — that's earned by
// a reply.
//
// SMS is plain text only — no markdown, no bold, no bullets, no emoji.
// Keep messages short; each SMS segment is ~160 GSM-7 chars.
//
// Follow-ups are mode-aware:
//   cold         — lead has never replied; rotate angle across steps.
//   reengagement — lead replied then went silent; reference the
//                  conversation history naturally.

import type { ConversationState } from './whatsapp-conversation'
import { getLastInboundMessage } from './whatsapp-conversation'

export interface LeadProfile {
  name: string
  address: string
  estimatedRent: number | null
  strNetMonthly: number | null
  longLetNetMonthly: number | null
  monthlySurplus: number | null
  profileType: string
  bestOpeningMessage: string | null
}

function firstName(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0]
}

function shortAddress(address: string): string {
  const trimmed = (address || '').trim()
  if (!trimmed) return 'your property'
  // Use the first comma-separated chunk if available — keeps the message tight.
  const first = trimmed.split(',')[0].trim()
  return first || trimmed
}

function gbp(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`
}

// PATH A — we have Deal Analyser numbers. Lead with the specific surplus
// figure — that's the strongest reframe we have.
function pathA(lead: LeadProfile): string {
  const fn = firstName(lead.name)
  const addr = shortAddress(lead.address)
  const surplus = lead.monthlySurplus
  const strNet = lead.strNetMonthly
  const longNet = lead.longLetNetMonthly

  // QUANTIFY block — phrase varies depending on which figures we have.
  let quantify = ''
  if (surplus && surplus > 0) {
    quantify = `Based on our analyser, running ${addr} as a short-stay let looks roughly ${gbp(surplus)} per month ahead of a standard long-let after costs.`
  } else if (strNet && longNet) {
    const diff = strNet - longNet
    if (diff > 0) {
      quantify = `Based on our analyser, ${addr} comes out around ${gbp(diff)} per month ahead as a short-stay let vs a standard tenancy, net of costs.`
    } else {
      quantify = `Based on our analyser, ${addr} looks net ${gbp(strNet)} per month as a short-stay let after costs.`
    }
  } else if (strNet) {
    quantify = `Based on our analyser, ${addr} looks net ${gbp(strNet)} per month as a short-stay let after costs.`
  } else {
    quantify = `We've run the numbers on ${addr} and the short-stay net looks materially ahead of a standard long-let.`
  }

  // Profile-aware reframe — small variations only. Keep it owner-to-owner.
  const profile = (lead.profileType || '').toLowerCase()
  let reframe: string
  if (profile.includes('switch') || profile.includes('existing')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK. I had a quick look at ${addr} on the assumption you might be open to a stronger return than a standard let is delivering.`
  } else if (profile.includes('abroad')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK for owners who aren't on the ground day-to-day. Pulled the numbers on ${addr} to see whether it stacks up.`
  } else if (profile.includes('sell') || profile.includes('special')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK. I had a look at ${addr} before you make any decision on selling — the income picture changes the maths.`
  } else if (profile.includes('purchase')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK. Pulled the numbers on ${addr} so you've got a real income picture before you commit.`
  } else {
    reframe = `I run Stayful — we manage short-stay lets across the UK. I pulled some numbers on ${addr} and the gap to a standard long-let was big enough to flag.`
  }

  const question = `Worth a quick look at the figures, ${fn}?`

  return `Hi ${fn}, ${reframe} ${quantify} ${question}`
}

// PATH B — no analyser numbers. Lead with the concept and ask a single
// open question. Shorter, lower-commitment.
function pathB(lead: LeadProfile): string {
  const fn = firstName(lead.name)
  const addr = shortAddress(lead.address)

  const profile = (lead.profileType || '').toLowerCase()
  let reframe: string
  if (profile.includes('switch') || profile.includes('existing')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK. Saw ${addr} and wanted to flag that for owners already letting, the short-stay net often comes in materially ahead of a standard tenancy after costs.`
  } else if (profile.includes('abroad')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK, fully hands-off for owners who aren't on the ground. Came across ${addr} and wanted to flag it.`
  } else if (profile.includes('sell')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK. Saw ${addr} and wanted to flag that short-stay income often shifts the maths on selling vs holding.`
  } else if (profile.includes('purchase')) {
    reframe = `I run Stayful — we manage short-stay lets across the UK. Saw ${addr} and wanted to flag what the short-stay income picture tends to look like before you commit.`
  } else {
    reframe = `I run Stayful — we manage short-stay lets across the UK. Saw ${addr} and wanted to flag that owners typically clear more net per month from short-stay than a standard let, fully managed.`
  }

  const question = `Is ${addr} something you're letting currently, ${fn}?`

  return `Hi ${fn}, ${reframe} ${question}`
}

export function getInitialTemplate(lead: LeadProfile): string {
  // If learnings have surfaced a winning opening, use it as the structural
  // basis but personalise with lead-specific data. Session 5 turns this on.
  if (lead.bestOpeningMessage && lead.bestOpeningMessage.trim()) {
    const fn = firstName(lead.name)
    const addr = shortAddress(lead.address)
    return lead.bestOpeningMessage
      .replace(/\{name\}/gi, fn)
      .replace(/\{firstName\}/gi, fn)
      .replace(/\{address\}/gi, addr)
      .replace(/\{surplus\}/gi, lead.monthlySurplus ? gbp(lead.monthlySurplus) : '')
      .trim()
  }

  if (lead.strNetMonthly !== null) {
    return pathA(lead)
  }
  return pathB(lead)
}

// ── Cold-mode helpers ────────────────────────────────────────────────────────

// Current season — used by cold step 2 to anchor a timing message.
function currentSeason(now: Date = new Date()): string {
  const m = now.getMonth() // 0-11
  if (m >= 2 && m <= 4) return 'spring'
  if (m >= 5 && m <= 7) return 'summer'
  if (m >= 8 && m <= 9) return 'autumn'
  return 'the festive run'
}

// Did the initial outreach use the figure-led PATH_A variant? The first
// outbound message in the conversation tells us — if it includes a £
// figure, PATH_A. Used so cold step 1 picks a different angle from the
// opener.
function initialUsedFigures(conversation: ConversationState): boolean {
  const first = conversation?.messages?.find((m) => m.role === 'outbound')
  return !!first && /£\s*\d/.test(first.content)
}

// ── Re-engagement helpers ────────────────────────────────────────────────────

// Pick a coarse topic label from the lead's last inbound message so a
// re-engagement open can reference it without quoting verbatim. Keeps
// the tone natural rather than surveillance-y.
function topicFromInbound(text: string | null): string {
  if (!text) return 'what we were chatting about'
  const t = text.toLowerCase()
  if (/\b(fee|cost|%|price|expensive|charge)/.test(t)) return 'the fee side'
  if (/\b(tenant|long.?let|ast|sitting tenant)/.test(t)) return 'your current tenancy'
  if (/\b(hassle|hands.?on|time|day.to.?day|manage|effort)/.test(t)) return 'the day-to-day side'
  if (/\b(law|regulation|licen[cs]e|stl|article 4)/.test(t)) return 'the regulation side'
  if (/\b(income|money|rent|yield|return|earn|net)/.test(t)) return 'the income picture'
  if (/\b(area|location|local|market)/.test(t)) return 'how the area performs'
  return 'what we were chatting about'
}

function conversationHadObjection(conversation: ConversationState): boolean {
  return (
    conversation?.messages?.some(
      (m) => m.role === 'inbound' && m.intent === 'objection',
    ) ?? false
  )
}

// ── Cold templates ───────────────────────────────────────────────────────────

function coldFollowUp(
  step: 1 | 2 | 3 | 4,
  lead: LeadProfile,
  conversation: ConversationState,
): string {
  const fn = firstName(lead.name)
  const addr = shortAddress(lead.address)

  if (step === 1) {
    // Different angle from the initial message. If the opener led with
    // figures, ask about their situation. If it led with the concept,
    // anchor on what other owners locally are doing.
    if (initialUsedFigures(conversation)) {
      return `Hi ${fn}, didn't want to lead with the numbers again. What's the picture with ${addr} at the moment — let, sitting empty, or somewhere in between?`
    }
    return `Hi ${fn}, slightly different angle — we've got a handful of owners around ${addr} moving across from standard lets to short-stay at the moment. Curious where you've landed on it.`
  }

  if (step === 2) {
    // Timing / urgency. Short. One question.
    const season = currentSeason()
    return `Hi ${fn}, ${season} demand for short-stays is climbing — usually when owners take a proper look at this. Worth a quick chat on ${addr}?`
  }

  if (step === 3) {
    // Soft close — no question, address referenced, easy to come back to.
    return `Totally get if the timing's off, ${fn}. If short-stay on ${addr} becomes worth a look later in the year, my number's here.`
  }

  // step === 4 — door stays open. Shouldn't be reached in normal flow but
  // safe to call. No question, no pressure.
  return `No pressure either way, ${fn} — door's open on ${addr} whenever it suits.`
}

// ── Re-engagement templates ──────────────────────────────────────────────────

function reengagementFollowUp(
  step: 1 | 2 | 3 | 4,
  lead: LeadProfile,
  conversation: ConversationState,
): string {
  const fn = firstName(lead.name)
  const addr = shortAddress(lead.address)
  const lastInbound = getLastInboundMessage(conversation)
  const topic = topicFromInbound(lastInbound)

  if (step === 1) {
    // Pick up from their last message. Reference the topic naturally,
    // one warm continuation question.
    return `Hi ${fn} — following up on what you mentioned about ${topic}. Where did you land on ${addr} in the end?`
  }

  if (step === 2) {
    // Different angle. If they raised an objection earlier, apply
    // VALIDATE → REFRAME. Otherwise try proof / local examples.
    if (conversationHadObjection(conversation)) {
      return `Fair concern, ${fn} — most owners flag the same before they see how it plays out. The bit that usually surprises people is how predictable the net comes in once the calendar's working. Worth 15 mins to walk through it on ${addr}?`
    }
    return `Hi ${fn}, different angle — we've had a couple of owners near ${addr} switch across recently and the numbers came in ahead of forecast. Want me to send over the comparison?`
  }

  if (step === 3) {
    // Short and direct. Address + one data point. Single question.
    if (lead.strNetMonthly && lead.strNetMonthly > 0) {
      return `${fn} — on ${addr}, short-stay net was modelling around ${gbp(lead.strNetMonthly)} a month. Worth a quick call to walk through it?`
    }
    if (lead.estimatedRent && lead.estimatedRent > 0) {
      return `${fn} — on ${addr}, the model puts gross short-stay around ${gbp(lead.estimatedRent)} a month. Quick call to walk through the net?`
    }
    return `${fn} — on ${addr}, the short-stay net tends to land materially ahead of a standard let. Quick call to walk through the figures?`
  }

  // step === 4 — final, warm, permanent door-open. No question, no pressure.
  return `Last note from me on ${addr}, ${fn} — no pressure either way. If short-stay ever becomes worth another look, my line's open whenever.`
}

// ── Public follow-up entry point ─────────────────────────────────────────────

export function getFollowUpTemplate(
  step: 1 | 2 | 3 | 4,
  lead: LeadProfile,
  mode: 'cold' | 'reengagement',
  conversation: ConversationState,
): string {
  if (mode === 'reengagement') {
    return reengagementFollowUp(step, lead, conversation)
  }
  return coldFollowUp(step, lead, conversation)
}
