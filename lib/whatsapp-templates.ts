// lib/whatsapp-templates.ts
// Outbound WhatsApp message templates for cold-lead outreach.
//
// Tone follows the Stayful lead-intelligence framework:
// VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION. Outreach is
// property-owner-to-property-owner, direct, never pushy, never AI.
// First message never includes the Calendly link — that's earned by
// a reply.

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

export function getFollowUpTemplate(step: 1 | 2 | 3, lead: LeadProfile): string {
  const fn = firstName(lead.name)
  const addr = shortAddress(lead.address)
  const hasNumbers = lead.strNetMonthly !== null

  if (step === 1) {
    // Day+1: light touch. Assume they just missed it.
    return `Hey ${fn}, wanted to check this didn't get lost in your messages. Happy to send over the figures on ${addr} whenever's good.`
  }

  if (step === 2) {
    // Day+3: lean on the opportunity. One specific anchor.
    if (hasNumbers && lead.monthlySurplus && lead.monthlySurplus > 0) {
      return `Hi ${fn} — circling back on ${addr}. The short-stay net was coming in about ${gbp(lead.monthlySurplus)} a month ahead of a standard let in our analyser. Worth me sending the full breakdown?`
    }
    return `Hi ${fn} — circling back on ${addr}. The short-stay net tends to come in materially ahead of a standard tenancy for properties in your area. Worth me sending the full breakdown?`
  }

  // step === 3 — Day+7: clear close or graceful exit.
  return `Hi ${fn}, last note from me on this. If short-stay management of ${addr} isn't a fit right now, no problem — I'll close it off here. If you'd rather see the figures first, just say the word.`
}
