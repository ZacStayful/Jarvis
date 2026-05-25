// lib/whatsapp-templates.ts
// Outbound SMS message templates for cold-lead outreach. (File name is
// historical — the engine was originally built for WhatsApp and the
// routes still live under /api/whatsapp/.)
//
// Voice: Lucy from Stayful, UK property owner to UK property owner.
// Specific over generic. One question per message. Name on first
// contact only, at the start, never repeated and never at the end.
// SMS is plain text — no markdown, no bullets, no emoji. Read every
// message aloud — if it sounds like a robot wrote it, rewrite it.
//
// Re-engagement rules:
// - Every no-reply re-engagement must mention short-term letting and
//   identify as Lucy from Stayful — the lead may have forgotten the context.
// - Warm re-engagement (lead has replied before) picks up the thread
//   from the last thing the lead said — no re-introduction needed.
// - Never use "Where's your head at" or "Where are you at with this".
//   Always use warm, welcoming language instead.

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

// Returns true if the lead has ever sent an inbound message —
// i.e. the conversation is warm, not cold.
function leadHasReplied(conversation: ConversationState): boolean {
  return conversation?.messages?.some((m) => m.role === 'inbound') ?? false
}

// ── Initial message ──────────────────────────────────────────────────────────

// Each profile-specific builder returns line 2 + line 3. The greeting
// line 1 is added by the public entrypoint so the "Hi X, it's Lucy from
// Stayful." opener is identical across profiles.

function initialMoveAbroad(lead: LeadProfile): string {
  const addr = lead.address
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about short-term letting ${addr} — works out at ${fig} per month net.`
    : `I saw you enquired about short-term letting ${addr} while you're abroad.`
  const line3 = `Are you currently letting it long-term or is it sitting empty?`
  return `${line2} ${line3}`
}

function initialHigherReturn(lead: LeadProfile): string {
  const addr = lead.address
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about short-term letting ${addr} — works out at ${fig} per month net.`
    : `I saw you enquired about higher-return options for ${addr} through short-term letting.`
  const line3 = `Are you currently letting it long-term or is it sitting empty?`
  return `${line2} ${line3}`
}

function initialExistingShortLet(lead: LeadProfile): string {
  // They already know short-let works. Don't explain it or quote figures —
  // the question is about what's wrong with the current setup.
  const line2 = `I saw you enquired about short-let management for ${lead.address}.`
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
    ? `I saw you enquired about short-term letting ${addr} in the lead-up to selling — net comes in at ${fig} per month.`
    : `I saw you enquired about short-term letting ${addr} in the lead-up to selling.`
  const line3 = `What's your timeline?`
  return `${line2} ${line3}`
}

function initialFallback(lead: LeadProfile): string {
  const addr = lead.address
  if (!addr) {
    return `Thanks for enquiring about short-term letting. What's the property and where are you up to with it?`
  }
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null
  const line2 = fig
    ? `I saw you enquired about short-term letting ${addr} — works out at ${fig} per month net.`
    : `I saw you enquired about short-term letting ${addr}.`
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
    if (body) return `Hi ${fn}, it's Lucy from Stayful. ${body}`
  }

  const fn = lead.firstName || extractFirstName(lead.name) || 'there'
  const greeting = `Hi ${fn}, it's Lucy from Stayful.`
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
    return `Just following up on the short-term letting for ${addr} — what kind of timeline are you working with on it?`
  }

  // No figures in opener but we have them now — introduce them.
  if (fig) {
    return `Just following up on ${addr} — short-let net comes in at ${fig} per month. Worth running through the rest of the figures?`
  }

  // No figures available. Profile-aware angle.
  if (profile.includes('sell')) {
    return `Just checking in on the short-term letting for ${addr} — is the sale still on the horizon, or still exploring options?`
  }
  if (profile.includes('existing short let')) {
    return `Just checking in on ${addr} — are you still self-managing, or looking to hand it over?`
  }
  if (profile.includes('rent to rent') || profile.includes('rent-to-rent')) {
    return `Just following up on the short-term letting for ${addr} — is the conversation with the owner still moving forward?`
  }
  if (profile.includes('abroad')) {
    return `Just checking in on the short-term letting for ${addr} — when are you planning to head off?`
  }
  return `Just following up on short-term letting ${addr} — what's the situation with it at the moment?`
}

function coldStep2(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `It's Lucy from Stayful — just touching base on short-term letting ${addr}. Is the timing right to have a chat, or would a different time work better?`
}

function coldStep3(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `It's Lucy from Stayful — still happy to help with short-term letting ${addr} whenever the time is right. You can grab a slot here if useful: ${calendlyLink()}`
}

function coldStep4(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `It's Lucy from Stayful — leaving the door open on ${addr} whenever it suits. ${calendlyLink()}`
}

// ── Re-engagement follow-ups ─────────────────────────────────────────────────
//
// Two distinct scenarios:
//
// WARM — lead has replied before, conversation went quiet.
// These pick up the thread from the last thing the lead said.
// No need to re-introduce Stayful — they know who we are.
//
// NO-REPLY — lead never replied (or hasn't replied in a long time).
// Every message must identify as Lucy from Stayful and mention
// short-term letting — the lead may have forgotten the original context.

// Rotating no-reply openers — used in reengStep1 when the lead hasn't replied.
// Seeded by message count so the same lead always gets a different variant.
const NO_REPLY_REENG_VARIANTS = [
  (addr: string) =>
    `It's Lucy from Stayful — just touching base to see if you're still interested in short-term letting ${addr}. Happy to help however I can.`,
  (addr: string) =>
    `It's Lucy from Stayful — just checking in on short-term letting ${addr}. How are you feeling about it at the moment?`,
  (addr: string) =>
    `It's Lucy from Stayful — hope things are well. Still happy to have a conversation about short-term letting ${addr} whenever the time is right.`,
  (addr: string) =>
    `It's Lucy from Stayful — just wanted to check back in on ${addr}. Are you still considering the short-term letting route?`,
]

function noReplyReengOpener(addr: string, variantIndex: number): string {
  const variant = NO_REPLY_REENG_VARIANTS[variantIndex % NO_REPLY_REENG_VARIANTS.length]
  return variant(addr)
}

function reengStep1(lead: LeadProfile, conversation: ConversationState): string {
  const lastInbound = getLastInboundMessage(conversation)
  const topic = topicFromInbound(lastInbound)
  const addr = shortAddress(lead.address) || 'the property'
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null

  // WARM — lead has replied before. Pick up the thread.
  if (leadHasReplied(conversation)) {
    if (topic === 'fees') {
      return `Following up on the fee question — our management fee is 15% plus VAT, full end-to-end. Does that work for ${addr} or worth a quick call to run the numbers?`
    }
    if (topic === 'tenancy') {
      return `Following up on the tenancy side — when's the natural break point at ${addr}?`
    }
    if (topic === 'day-to-day') {
      return `Following up on the management side — everything at ${addr} is handled end-to-end, from bookings through to turnovers and guest comms. Worth a quick call to walk through it?`
    }
    if (topic === 'regulation') {
      return `Following up on the regulation question — happy to go through what currently applies to ${addr}. Want me to send the rundown?`
    }
    if (topic === 'income') {
      return fig
        ? `Following up on the income side — ${addr} works out at ${fig} per month net on short-term letting. Want the full breakdown?`
        : `Following up on the income question — happy to run the figures for ${addr}. Worth a look?`
    }
    if (topic === 'area') {
      return `Following up on the area side — happy to send the local occupancy and rate data near ${addr}. Worth a look?`
    }
    // Warm but no specific topic — reference the conversation naturally.
    return `Just picking up where we left off on ${addr} — how are you feeling about it now?`
  }

  // NO-REPLY — lead has never replied. Use a rotating warm opener
  // that mentions short-term letting and identifies Stayful.
  const outboundCount = conversation?.messages?.filter((m) => m.role === 'outbound').length ?? 0
  return noReplyReengOpener(addr, outboundCount)
}

function reengStep2(lead: LeadProfile, conversation: ConversationState): string {
  const addr = shortAddress(lead.address) || 'the property'
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null

  // WARM — lead has replied before.
  if (leadHasReplied(conversation)) {
    if (conversationHadObjection(conversation)) {
      // Income worry resolves on a second exposure to the floor framing —
      // lead with the floor figure rather than a generic "see the numbers".
      if (topicFromInbound(getLastInboundMessage(conversation)) === 'income') {
        return `One more thing on the income side for ${addr} — the number worth focusing on is the floor, the quietest realistic month, not the average. It's usually higher than people expect because it's built from comparable properties already letting nearby. Worth seeing it?`
      }
      return `That concern is fair — most owners weigh that up before looking at short-term letting properly. The bit that usually changes the picture is seeing the actual figures for ${addr}. Want me to send them through?`
    }
    return `Different angle on ${addr} — what would need to be true for short-term letting to make sense for you on this one?`
  }

  // NO-REPLY — rotate to a different variant.
  const outboundCount = conversation?.messages?.filter((m) => m.role === 'outbound').length ?? 1
  return noReplyReengOpener(addr, outboundCount)
}

function reengStep3(lead: LeadProfile, conversation: ConversationState): string {
  const addr = shortAddress(lead.address) || 'the property'
  const fig = lead.strNetMonthly ? gbp(lead.strNetMonthly) : null

  // WARM — lead has replied before.
  if (leadHasReplied(conversation)) {
    if (fig) {
      return `Just wanted to mention — short-term letting ${addr} works out at ${fig} per month net. Worth a quick call to walk through the rest?`
    }
    return `Just checking in on ${addr} — how are you feeling about the short-term letting route at the moment?`
  }

  // NO-REPLY — third attempt, rotate variant, add figures if available.
  if (fig) {
    return `It's Lucy from Stayful — just one more touch on ${addr}. Short-term letting net comes in at ${fig} per month. Worth a 20-minute call to see if it stacks up for you?`
  }
  const outboundCount = conversation?.messages?.filter((m) => m.role === 'outbound').length ?? 2
  return noReplyReengOpener(addr, outboundCount)
}

function reengStep4(lead: LeadProfile): string {
  const addr = shortAddress(lead.address) || 'the property'
  return `It's Lucy from Stayful — I'll leave it there for now on short-term letting ${addr}. If you ever want to run the numbers, you can grab a slot here: ${calendlyLink()}`
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
    if (step === 3) return reengStep3(lead, conversation)
    return reengStep4(lead)
  }
  if (step === 1) return coldStep1(lead, conversation)
  if (step === 2) return coldStep2(lead)
  if (step === 3) return coldStep3(lead)
  return coldStep4(lead)
}
