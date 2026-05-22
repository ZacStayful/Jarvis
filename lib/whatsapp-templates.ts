// lib/whatsapp-templates.ts
// Outbound SMS message templates for cold-lead outreach. (File name is
// historical — the engine was originally built for WhatsApp and the
// routes still live under /api/whatsapp/.)
//
// Voice: Zac from Stayful, UK property owner to UK property owner.
// Specific over generic. One question per message. Name on first
// contact only, at the start, never repeated and never at the end.
// SMS is plain text — no markdown, no bullets, no emoji. Read every
// message aloud — if it sounds like a robot wrote it, rewrite it.

import type { ConversationState } from './whatsapp-conversation'
import { getLastInboundMessage } from './whatsapp-conversation'

export interface LeadProfile {
  name: string
  firstName: string
  address: string
  bedrooms: string
  leadProfile: string
  estimatedRent: number | null
  strNetMonthly: number | null
  longLetNetMonthly: number | null
  monthlySurplus: number | null
  bestOpeningMessage: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Extract first name — everything before the first space. Hyphenated
// first names like "Sarah-Jane" stay intact. Single-word names returned
// as-is. Returns the original string if extraction would yield empty.
export function extractFirstName(fullName: string): string {
  const trimmed = (fullName || '').trim()
  if (!trimmed) return ''
  const first = trimmed.split(/\s+/)[0]?.trim()
  return first || trimmed
}

// Short address — first comma-separated chunk. Use for follow-up
// references where the full postcode would feel heavy mid-sentence.
function shortAddress(address: string): string {
  const trimmed = (address || '').trim()
  if (!trimmed) return ''
  const first = trimmed.split(',')[0]?.trim()
  return first || trimmed
}

function gbp(n: number): string {
  return `£${Math.round(n).toLocaleString('en-GB')}`
}

function calendlyLink(): string {
  return process.env.CALENDLY_LINK || 'https://calendly.com/stayful/web-meeting'
}

// Heuristic: did the lead's initial outreach message reference a £
// figure? Used to pick a different angle in the first cold follow-up.
function initialUsedFigures(conversation: ConversationState): boolean {
  const first = conversation?.messages?.find((m) => m.role === 'outbound')
  return !!first && /£\s*\d/.test(first.content)
}

// Re-engagement helpers ──────────────────────────────────────────────────────

type InboundTopic =
  | 'fees'
  | 'tenancy'
  | 'day-to-day'
  | 'regulation'
  | 'income'
  | 'area'
  | null

function topicFromInbound(text: string | null): InboundTopic {
  if (!text) return null
  const t = text.toLowerCase()
  if (/\b(fee|cost|%|price|expensive|charge|commission)/.test(t)) return 'fees'
  if (/\b(tenant|long.?let|ast|sitting tenant|tenancy)/.test(t)) return 'tenancy'
  if (/\b(hassle|hands.?on|time|day.to.?day|manage|effort|involve)/.test(t)) return 'day-to-day'
  if (/\b(law|regulation|licen[cs]e|stl|article 4|planning)/.test(t)) return 'regulation'
  if (/\b(income|money|rent|yield|return|earn|net|profit|figures)/.test(t)) return 'income'
  if (/\b(area|location|local|market|demand)/.test(t)) return 'area'
  return null
}

function conversationHadObjection(conversation: ConversationState): boolean {
  return (
    conversation?.messages?.some(
      (m) => m.role === 'inbound' && m.intent === 'objection',
    ) ?? false
  )
}

// ── Initial message ──────────────────────────────────────────────────────────

// Each profile-specific builder returns line 2 + line 3. The greeting
// line 1 is added by the public entrypoint so the "Hi X, it's Zac from
// Stayful." opener is identical across profiles.

function initialMoveAbroad(lead: LeadProfile): string {
  const addr = lead.address
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about ${addr} — works out at ${fig} per month net as a short-let.`
    : `I saw you enquired about short-letting ${addr} while you're abroad.`
  const line3 = `Are you currently letting it long-term or is it sitting empty?`
  return `${line2} ${line3}`
}

function initialHigherReturn(lead: LeadProfile): string {
  const addr = lead.address
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about ${addr} — works out at ${fig} per month net as a short-let.`
    : `I saw you enquired about higher-return options for ${addr}.`
  const line3 = `Are you currently letting it long-term or is it sitting empty?`
  return `${line2} ${line3}`
}

function initialExistingShortLet(lead: LeadProfile): string {
  // They already know short-let works. Don't explain it or quote figures —
  // the question is about what's wrong with the current setup.
  const line2 = `I saw you enquired about management for ${lead.address}.`
  const line3 = `What's prompting the search for a new management company?`
  return `${line2} ${line3}`
}

function initialRentToRent(lead: LeadProfile): string {
  const addr = lead.address
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about rent-to-rent short letting for ${addr} — short-let net comes in at ${fig} per month.`
    : `I saw you enquired about rent-to-rent short letting for ${addr}.`
  const line3 = `Have you agreed terms with the owner or still at the exploration stage?`
  return `${line2} ${line3}`
}

function initialSell(lead: LeadProfile): string {
  const addr = lead.address
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about ${addr} — short-let net comes in at ${fig} per month in the lead-up to selling.`
    : `I saw you enquired about short-letting ${addr} in the lead-up to selling.`
  const line3 = `What's your timeline?`
  return `${line2} ${line3}`
}

function initialFallback(lead: LeadProfile): string {
  const addr = lead.address
  if (!addr) {
    return `Thanks for enquiring about short-letting. What's the property and where are you up to with it?`
  }
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about ${addr} — works out at ${fig} per month net as a short-let.`
    : `I saw you enquired about ${addr}.`
  const line3 = `What's the situation with it at the moment — let, sitting empty, or somewhere in between?`
  return `${line2} ${line3}`
}

function dispatchByProfile(profile: string): (lead: LeadProfile) => string {
  const p = (profile || '').toLowerCase()
  if (p.includes('abroad')) return initialMoveAbroad
  if (p.includes('higher return')) return initialHigherReturn
  if (p.includes('existing short let')) return initialExistingShortLet
  if (p.includes('rent to rent') || p.includes('rent-to-rent')) return initialRentToRent
  if (p.includes('sell')) return initialSell
  return initialFallback
}

export function getInitialTemplate(lead: LeadProfile): string {
  // Allow learnings (Session 5) to override the body if a winning
  // opener has been surfaced for this profile. Greeting line is kept.
  if (lead.bestOpeningMessage && lead.bestOpeningMessage.trim()) {
    const fn = lead.firstName || 'there'
    const addr = lead.address || ''
    const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : ''
    const body = lead.bestOpeningMessage
      .replace(/\{firstName\}/gi, fn)
      .replace(/\{name\}/gi, fn)
      .replace(/\{address\}/gi, addr)
      .replace(/\{netMonthly\}/gi, fig)
      .replace(/\{surplus\}/gi, lead.monthlySurplus ? gbp(lead.monthlySurplus) : '')
      .trim()
    if (body) return `Hi ${fn}, it's Zac from Stayful. ${body}`
  }

  const fn = lead.firstName || extractFirstName(lead.name) || 'there'
  const greeting = `Hi ${fn}, it's Zac from Stayful.`
  const body = dispatchByProfile(lead.leadProfile)(lead)
  return `${greeting} ${body}`
}

// ── Cold follow-ups ──────────────────────────────────────────────────────────

function coldStep1(lead: LeadProfile, conversation: ConversationState): string {
  const addr = shortAddress(lead.address) || 'the property'
  const profile = (lead.leadProfile || '').toLowerCase()
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null

  // If the opener already showed figures, pivot to timeline.
  if (initialUsedFigures(conversation)) {
    return `What kind of timeline are you working with on ${addr} — this year or further out?`
  }

  // No figures in opener but we have them now — introduce them.
  if (fig) {
    return `Quick context on ${addr} — short-let net comes in at ${fig} per month. Worth running through the rest of the figures?`
  }

  // No figures available. Profile-aware angle so it doesn't feel
  // recycled from the opener.
  if (profile.includes('sell')) {
    return `Where are you at with ${addr} — sale on the horizon, or still exploring the short-let route first?`
  }
  if (profile.includes('existing short let')) {
    return `What's the current setup at ${addr} — managing it yourself, or with another agency?`
  }
  if (profile.includes('rent to rent') || profile.includes('rent-to-rent')) {
    return `Where are you at on ${addr} — owner conversation under way, or still mapping it out?`
  }
  if (profile.includes('abroad')) {
    return `When are you planning to head off — sorting the let before you go, or once you're out there?`
  }
  return `What's the situation with ${addr} at the moment — let, sitting empty, or somewhere in between?`
}

function coldStep2(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `Is now a tough time to look at ${addr}, or worth a quick chat?`
}

function coldStep3(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `Totally understand if the timing isn't right on ${addr}. If you do want to explore it: ${calendlyLink()}`
}

function coldStep4(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `Door's open on ${addr} whenever — ${calendlyLink()}`
}

// ── Re-engagement follow-ups ─────────────────────────────────────────────────

function reengStep1(lead: LeadProfile, conversation: ConversationState): string {
  const lastInbound = getLastInboundMessage(conversation)
  const topic = topicFromInbound(lastInbound)
  const addr = shortAddress(lead.address) || 'the property'
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null

  if (topic === 'fees') {
    return `Following on from what you said about the fee side — happy to send the full breakdown for ${addr}. Want me to share it?`
  }
  if (topic === 'tenancy') {
    return `Following on from what you said about the tenancy — when's the natural break point at ${addr}?`
  }
  if (topic === 'day-to-day') {
    return `Following on from the hands-on side — at ${addr} that's all on us, calendar through to turnovers and guest comms. Worth talking through the workflow?`
  }
  if (topic === 'regulation') {
    return `Following on from the regulation side — happy to flag what currently applies to ${addr}. Want me to send the rundown?`
  }
  if (topic === 'income') {
    return fig
      ? `Following on from the income side — ${addr} works out at ${fig} per month net. Want the full P&L?`
      : `Following on from the income side — happy to send a P&L for ${addr}. Worth a look?`
  }
  if (topic === 'area') {
    return `Following on from the area side — happy to send the local occupancy and rate data near ${addr}. Worth a look?`
  }
  // No specific topic detected. Continue the thread without claiming
  // to reference a specific thing (which would feel canned).
  return `Where are you leaning on ${addr} now — still weighing it up?`
}

function reengStep2(lead: LeadProfile, conversation: ConversationState): string {
  const addr = shortAddress(lead.address) || 'the property'
  if (conversationHadObjection(conversation)) {
    // VALIDATE → REFRAME → single question.
    return `That concern is fair — most owners weigh that up before they look at short-let properly. The bit that usually changes the picture is seeing the full P&L on ${addr}. Want me to send it through?`
  }
  return `Different angle on ${addr} — what would need to be true for short-let to make sense for you on this one?`
}

function reengStep3(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  if (fig) {
    return `On ${addr}, short-let net works out at ${fig} per month. Worth a quick call to walk through the rest?`
  }
  return `Where's your head at on ${addr} now?`
}

function reengStep4(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `I'll leave it there for now — if you ever want to run the numbers on ${addr}, you can grab a slot here: ${calendlyLink()}`
}

// ── Public follow-up entry point ─────────────────────────────────────────────

export function getFollowUpTemplate(
  step: 1 | 2 | 3 | 4,
  lead: LeadProfile,
  mode: 'cold' | 'reengagement',
  conversation: ConversationState,
): string {
  if (mode === 'reengagement') {
    if (step === 1) return reengStep1(lead, conversation)
    if (step === 2) return reengStep2(lead, conversation)
    if (step === 3) return reengStep3(lead)
    return reengStep4(lead)
  }
  if (step === 1) return coldStep1(lead, conversation)
  if (step === 2) return coldStep2(lead)
  if (step === 3) return coldStep3(lead)
  return coldStep4(lead)
}
