# Stayful — Business Facts and Positioning

**Scope: Stayful Airbnb-management overlay.** The set of facts that must appear consistently across every page. Entity consistency (`CORE__02_phase-2__geo-ai-overview-checklist.md`) depends on this set being identical wherever each fact appears.

When any fact changes, run the cross-site refresh per `CORE__06_measurement__update-cadence-and-triggers.md` (event-triggered updates → business facts change).

---

## The canonical business facts

| Fact | Value | Where it appears |
|---|---|---|
| Management fee | 15% + VAT | Body copy, "How Stayful compares" table, FAQ |
| Setup fee | £0 — none ever | Body copy, "How Stayful compares" table, FAQ |
| Stayful average occupancy | 65–70% | Body copy, structural reassurance, schema |
| Market average occupancy | 55% (AirDNA) | Comparison context — always paired with Stayful figure |
| Google rating | 4.8 stars | Body copy (naturally), schema AggregateRating, trust cluster |
| Direct bookings | 40% | Body copy, structural reassurance, FAQ (mechanism explained) |
| Properties currently managed | 70+ | Proof row, body copy |
| Total revenue earned for hosts | £3M+ | Proof row, body copy |
| Onboarding to live | 7–14 days | "How it works" Step 3, FAQ |
| Phone | 0113 479 0251 | NAP block, schema LocalBusiness |
| Platforms | Airbnb, Booking.com, VRBO, Google, Stayful direct | Body copy, "How Stayful compares" table |
| Insurance cover | £100,000 | Damage objection answer, body copy near CTA |
| Security deposit | £200 | Damage objection answer |
| Payout window | 1st–5th of each month | Trust cluster near form |

**Confirm current numbers before major page builds.** Numbers change. Run a verification call with operations before any quarterly refresh batch.

---

## The positioning statement (full)

> Stayful is not an Airbnb management company selling a service. For this audience, Stayful is: **a better property decision for owners who want more income and more flexibility than a standard tenancy, without taking on more work or uncertainty alone.**

Every page supports this positioning. The page is the better decision; the conversion is the next step in acting on it.

---

## Why entity consistency matters

AI extraction systems (Google AI Overviews, AI Mode, ChatGPT, Perplexity) penalise sites where the same fact appears with different values across pages. The penalty is silent — pages stop being cited as authoritative — but real.

Common drift sources:

- Page written 6 months ago says "70+ properties"; page written this week says "around 80 properties"
- One page says "65–70% occupancy"; another says "65% average"; another says "above 70% in our managed portfolio"
- One page says "15% + VAT"; another says "15% management fee plus VAT"; another says "15% all-in"

Each variation is small. Cumulative effect across a domain: the site reads as approximations rather than facts.

The fix: pick ONE canonical phrasing per fact. Use it identically on every page. The phrasings in the table above ARE the canonical phrasings.

---

## When a fact changes — protocol

Per `CORE__06_measurement__update-cadence-and-triggers.md`:

1. **Immediately:** re-run Phase 2 Section A (schema) and Section G (answer capsule) across every relevant page
2. **Within 7 days:** update every page where the affected fact appears in body copy
3. **Within 14 days:** re-verify entity consistency across all pages

The clock starts when the fact changes internally — not when someone notices the discrepancy on a page.

---

## The "Why Stayful" condensed pitch

For internal use when drafting body copy. The differentiators that can be referenced naturally across pages:

1. **15% + VAT, £0 setup** — competitive on fee, structurally below typical industry margins on setup
2. **40% direct bookings** — asymmetric vs. platform-only management (which is typically <10% direct)
3. **65–70% occupancy** — meaningfully above the 55% AirDNA market average
4. **4.8 stars** — the trust signal
5. **70+ managed, £3M+ delivered** — scale proof
6. **7–14 days to live** — speed signal
7. **5 platforms listed** — Airbnb, Booking.com, VRBO, Google, Stayful direct — channel proof

When body copy references "why Stayful" or "what makes us different", pull from this list. The differentiators are asymmetric (most competitors can't match) and verifiable.

---

## Facts that should NEVER appear

Some facts are not facts:

- "Guaranteed income" — Stayful does not offer this; no STL provider honestly can
- "Hands-off completely" — owners can block dates, manage their calendar; "hands-off" implies they lose control
- "Best in the UK" / "Leading provider" — unverifiable superlatives
- Specific income figures for properties that aren't real comparables in Stayful's data
- Forward-looking promises ("you will earn", "you will save") — replace with conditional/historical ("typically earns", "comparable properties have netted")

---

## Related files

- `CORE__02_phase-2__geo-ai-overview-checklist.md` — entity consistency check
- `CORE__06_measurement__update-cadence-and-triggers.md` — protocol for business fact changes
- `STAYFUL__brand__voice-language-rules.md` — how to phrase facts in body copy
- `STAYFUL__proof__levers-and-disqualifier.md` — how each fact functions as proof
- `STAYFUL__phase-2-sections__stayful-specific-html.md` — Section A (schema) where facts appear in structured form
