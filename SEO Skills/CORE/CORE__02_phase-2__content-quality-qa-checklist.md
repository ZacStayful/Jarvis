# Phase 2 — Content Quality QA Checklist (Pre-Publication)

**Scope: Universal structure, with Stayful-specific instances flagged.** This is the comprehensive pre-publication checklist. Run at the end of every Phase 2 session. Do not mark Phase 2 as complete if any item is unchecked.

Two narrower checklists complement this one:
- `CORE__02_phase-2__geo-ai-overview-checklist.md` — AI/AEO/Discover citation readiness
- `CORE__02_phase-2__post-publication-indexation-checklist.md` — 24h to 60d indexation gates

---

## Schema

- [ ] FAQPage schema present; every visible FAQ has corresponding mainEntity entry
- [ ] Single combined JSON-LD array (one `<script>` block)
- [ ] `dateModified` is today's date
- [ ] AggregateRating uses real `ratingValue`; `reviewCount` only if real number known
- [ ] BreadcrumbList sequential from 1
- [ ] VideoObject included if video present

---

## Content — Objections

For Stayful pages, see `STAYFUL__objections__six-mandatory.md` for the specific six objections. For other businesses, identify the equivalent set per `CORE__04_frameworks__objections-and-faq-language-framework.md`.

- [ ] Slow months / worst-case figure in body copy (not FAQ only)
- [ ] Income guarantee / outcome guarantee addressed honestly — no guarantee stated
- [ ] Property control / friction-reducer statement near CTA
- [ ] Total fee / cost load addressed proactively
- [ ] Risk mitigation (guest vetting, insurance, deposit) addressed unprompted

---

## Content — General

- [ ] Concept test passed — proposition statable in one sentence (`CORE__03_reader-momentum__concept-test-attention-reset-monologue.md`)
- [ ] At least three expert-insight markers in visible copy
- [ ] At least one data point from first-party / verified source
- [ ] At least one worst-case figure alongside headline figure
- [ ] Outbound links to at least one authoritative external source
- [ ] "Last updated" date label shows current month and year

### Expert-insight markers — what counts

For Stayful pages, three of these on every page:
- A named local demand driver specific enough to be verifiable
- A specific occupancy / rate figure referenced to a comparable property type in that postcode
- An honest acknowledgement of a genuine local risk or seasonality pattern
- A named event, development, or employer with direct line to short-let demand
- An observation about local guest profile specific to that market

Generic statements about "strong local demand" or "popular tourist destination" do not qualify.

---

## FAQ Language

- [ ] All FAQ triggers in lead language (`CORE__04_frameworks__objections-and-faq-language-framework.md` — Stayful instances in `STAYFUL__faq__lead-language-tables.md`)
- [ ] Every PAA question harvested in Phase 1 Step 7 answered somewhere on the page
- [ ] PAA phrasing used verbatim
- [ ] No FAQ answer starts with "Great question" or any affirmation
- [ ] Every FAQ answer leads with the direct answer, then explanation

---

## HTML / CSS

- [ ] No new CSS classes created (only existing component system used)
- [ ] All SVG containers: `style="width:100%;height:auto;display:block;"`
- [ ] Explicit `width` and `height` on all SVGs
- [ ] Accordion transitions use CSS `max-height` only (no JavaScript height recalculation)
- [ ] H1 appears before any large SVG or component in the HTML source
- [ ] System font stack used (no external font imports inside code blocks)

---

## Internal Linking

- [ ] All internal links styled with brand colour, font-weight 700, subtle border-bottom (Stayful: `color: #5D8156; border-bottom: 1.5px solid rgba(93,129,86,0.3)`)
- [ ] No blue hyperlinks
- [ ] All cluster links included even if target pages not yet live
- [ ] Primary conversion linked (Stayful: `/calculateyourincome-airbnb-management`)
- [ ] Anchor text varied per `CORE__01_strategic__navigation-and-internal-linking.md` (Rule 3)

---

## AI Citation Structure

- [ ] First 200 words function as a compressed version of the entire page
- [ ] Answer capsule is 50–70 words exactly (counted)
- [ ] Answer capsule contains one specific data point
- [ ] Answer capsule self-contained — makes sense extracted
- [ ] Every citable fact in a visually distinct format (callout, stat cell, labelled paragraph)
- [ ] Every H2 section independently citable

---

## Discover Readiness

- [ ] H1 accurate and descriptive — no curiosity-gap phrasing, no emotional bait
- [ ] City name in H1, first sentence of body copy, and meta description
- [ ] Primary postcode in schema
- [ ] At least one figure from first-party data or verified comparables

---

## People-First Content Test

Five tests per `CORE__03_content__people-first-test.md`:

- [ ] **Test 1** — Page answers the reader's actual question
- [ ] **Test 2** — Core answer visible without scrolling (on mobile)
- [ ] **Test 3** — Reader would not need to search again after reading
- [ ] **Test 4** — Page contains information not findable elsewhere
- [ ] **Test 5** — Page leaves reader better informed than they arrived

---

## Section-Level Authority

- [ ] No section thinner than weakest competitor page for that keyword
- [ ] Every section contains at least one city-specific / business-specific piece of information
- [ ] Section test: "Could this paragraph appear unchanged on a competitor's page about a different city?" — if yes, rewritten

---

## Reader Momentum and Engagement Architecture

Full detail: `CORE__03_reader-momentum__*` files.

- [ ] Concept test passed
- [ ] H1 creates curiosity gap (for meta titles — H1s must be accurate; see Discover Readiness above)
- [ ] Every H2 is a hook, not a label
- [ ] No H2 could be removed without the reader noticing
- [ ] First intro paragraph creates curiosity gap
- [ ] Answer capsule ends with pointer to deeper detail (not a CTA, not a link)
- [ ] Zone 1 (opening third) establishes possibility without pushing for commitment
- [ ] Zone 2 (middle third) answers the objection raised by each preceding section
- [ ] Zone 3 (final third) makes inaction feel like the riskier choice
- [ ] No two consecutive sections repeat the same argument
- [ ] Every section transition raises a new question
- [ ] Attention reset (visual component) every three prose sections
- [ ] Final sentence before each CTA closes the most likely objection at that point
- [ ] Reader's 9-question internal monologue fully mapped
- [ ] Forward pull test passed for every H2

---

## Meta Title and Description

Full rules: `CORE__03_meta__title-and-description-rules.md`

- [ ] Title: primary keyword in first 40 characters
- [ ] Title: curiosity gap or specific promise present
- [ ] Title: 55 characters or under
- [ ] Title: profile-matched construction applied
- [ ] Description: 150 characters or under
- [ ] Description: first sentence stands alone as a reason to click
- [ ] Description: contains specific figure or honest framing
- [ ] Description: no generic CTA
- [ ] Description: moral contract present
- [ ] Description: disqualifier included where appropriate

---

## Uplift Component (Stayful pages, if present)

Complete only if component is on page. Full rules: `STAYFUL__postcode-data__uplift-component.md`.

- [ ] Recommended in Phase 1 — not added without assessment
- [ ] Uplift % shown as range, labelled "conservative estimate"
- [ ] Source line: "Based on enquiry data from comparable properties in [area/region]"
- [ ] LTR figure shown alongside every STR figure
- [ ] No figure exceeds regional conservative range
- [ ] Placed immediately above top CTA only — not repeated at bottom CTA
- [ ] Mobile: grid stacks to single column at 560px
- [ ] No income floor implied

---

## Core Web Vitals

Full detail: `CORE__05_technical__core-web-vitals-and-engagement.md`

- [ ] All SVG containers have explicit width and height
- [ ] System font stack throughout
- [ ] All accordion transitions use CSS `max-height` only
- [ ] H1 appears before the first large SVG or component in source

---

## Checklist sign-off

When every item above is checked, Phase 2 is content-complete. Proceed to:

1. `CORE__02_phase-2__geo-ai-overview-checklist.md` — AI/AEO/Discover citation readiness
2. `CORE__02_phase-2__post-publication-indexation-checklist.md` — 24h to 60d gates

If any item is unchecked, do not declare Phase 2 complete. Fix the gap and re-run the checklist.
