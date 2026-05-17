# Quickstart — Build a new page

**Scope: Universal.** This is the sequence for building a new sales / service / content page on any website. Stayful Airbnb-management pages add the `STAYFUL__*` overlay at step 8.

---

## Before you write a single line of HTML

### Step 1 — Run the Phase 0 gate

Do NOT skip this. Most wasted SEO work happens because a page is built that should not have existed.

Open: `CORE__02_phase-0__should-this-page-exist.md`

Answer three questions in writing:

1. Does this page pass the **Pages That Earn Their Place** test? State which of Criterion A (meaningfully different query intent), B (external signal earning potential), or C (content the main page cannot absorb) it passes, and why.
2. Is this cluster at or over the **cannibalisation hard limit** (3 pages per cluster targeting different primary intents)? Run `site:[domain] [city/topic]` and count.
3. Is there **indexed inbound link capacity**? Identify three already-indexed pages that will provide contextual links to the new page.

If all three pass → continue. If any fails → do not build. Document the reason.

### Step 2 — Confirm the concept test

Open: `CORE__03_reader-momentum__concept-test-attention-reset-monologue.md`

Write the core proposition of the page in **one sentence a reader would repeat to another reader**. If it can't be stated in one sentence, the concept needs sharpening before any copy is written.

### Step 3 — Identify the primary lead profile

Open: `CORE__04_frameworks__lead-profiles-framework.md`

State which reader profile this page primarily serves. The page is written for that profile first; other profiles get served through FAQ and supporting sections.

For Stayful Airbnb-management pages, use the specific A–F profiles in `STAYFUL__lead-profiles__A-to-F.md`. Default primary is Profile B (existing landlord considering a switch).

---

## Plan the page

### Step 4 — Choose page structure

Open: `CORE__02_phase-2__canonical-section-order-and-html-additions.md`

The canonical 20-section order is non-negotiable for service / commercial pages. Skip sections that don't apply but never reorder.

### Step 5 — Plan the meta title and description

Open: `CORE__03_meta__title-and-description-rules.md`

Draft both before writing the page. Title must be ≤55 characters, keyword in first 40, curiosity gap present. Description must be ≤150 characters, first sentence must stand alone as a reason to click, no generic CTA.

### Step 6 — Plan the internal link map by tier

Open: `CORE__01_strategic__navigation-and-internal-linking.md`

Identify:
- Whether this page belongs in a content vertical with 3+ pages — if so, add to navigation (Tier 1)
- 3+ indexed source pages that will link to it contextually (Tier 2)
- Anchor text variation plan (~20% exact / ~30% partial / ~30% branded / ~20% natural)

---

## Write the page

### Step 7 — Apply content principles

Read every file in this order:

1. `CORE__03_content__immediate-answer-and-intro-structure.md` — the 5-step opening sequence
2. `CORE__03_content__ai-citation-and-discover-readiness.md` — first-200-words rule, three-tier structure, Discover headline integrity
3. `CORE__03_reader-momentum__forward-pull-and-h2-hooks.md` — every H2 must be a hook, not a label
4. `CORE__03_reader-momentum__escalating-stakes-and-curiosity-gap.md` — possibility → credibility → commitment
5. `CORE__03_reader-momentum__concept-test-attention-reset-monologue.md` — visual break every 3 prose sections; reader's 9-question monologue
6. `CORE__03_content__long-body-text-and-paragraph-formatting.md` — accordion for blocks over 75 words; one sentence per paragraph
7. `CORE__03_content__people-first-test.md` — the 5 publication tests

### Step 8 — Apply the business overlay (Stayful only)

For Stayful Airbnb-management pages, layer:

- `STAYFUL__brand__visual-identity.md` — colours, typography, alignment
- `STAYFUL__brand__voice-language-rules.md` — use/never use
- `STAYFUL__business__facts-and-positioning.md` — every fact stated identically across pages
- `STAYFUL__objections__six-mandatory.md` — all six must be addressed
- `STAYFUL__objections__worst-case-framing-language.md` — the 5 framing rules
- `STAYFUL__faq__lead-language-tables.md` — FAQ language must mirror how leads speak
- `STAYFUL__cta__form-context-and-trust-cluster.md` — what surrounds the income estimate form
- `STAYFUL__phase-2-sections__stayful-specific-html.md` — schema, FHL tax, NAP, etc.
- `STAYFUL__postcode-data__*` — if uplift component is recommended

### Step 9 — Pull HTML scaffolding

Copy from `HTML__*` files. Do not write HTML from scratch — every component already exists.

For Stayful pages, the CSS is in `HTML__css__brand-styles.css`. Confirm it's loaded before pasting components.

### Step 10 — Add schema

Open: `CORE__02_phase-2__schema-rules.md` and `HTML__schema__jsonld-combined-and-videoobject.html`

A single combined JSON-LD array containing Service, LocalBusiness, BreadcrumbList, FAQPage, WebPage — and VideoObject if a video is embedded. Never split across multiple script blocks. `dateModified` must be today's date.

---

## Before publishing

### Step 11 — Run the QA checklists

In order:

1. `CORE__02_phase-2__content-quality-qa-checklist.md` — comprehensive pre-publication QA
2. `CORE__02_phase-2__geo-ai-overview-checklist.md` — AI citation readiness
3. `CORE__05_technical__core-web-vitals-and-engagement.md` — the four CWV checks

Every item must pass before the page goes live.

### Step 12 — Publish, then run the indexation checklist

Open: `CORE__02_phase-2__post-publication-indexation-checklist.md`

- Within 24h: confirm sitemap inclusion, navigation inclusion, 3+ contextual links from indexed pages, submit to GSC
- At 7d, 14d, 30d, 60d: check indexation status
- If still not indexed at 14d: run `CORE__07_indexation__decision-tree.md`

---

## Common mistakes that fail Phase 0

- Building `holiday-let-management-[city]` because the template "usually" includes one, when `airbnb-management-[city]` already exists. Same intent, no separate page allowed.
- Pre-building 5 supporting pages in a new cluster before the primary page has any impression data. Apply the **two-page rule** (`CORE__01_strategic__pages-earn-their-place.md`).
- Adding a new page to a cluster that's already at the cannibalisation limit — fix the cluster first via pruning.
- Assuming "internal linking will boost indexation" when the linking pages are themselves not indexed. Tier 4 links carry near-zero weight.
