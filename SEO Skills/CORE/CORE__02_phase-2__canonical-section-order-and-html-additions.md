# Phase 2 — Canonical Section Order and HTML Additions

**Scope: Universal structure, with Stayful-specific HTML in the overlay.** Phase 2 writes self-contained HTML blocks ready to paste into the CMS. All blocks address Critical and High priority issues from Phase 1.

Phase 2 only runs on explicit instruction after Phase 1: "write Phase 2", "continue", "write the fixes".

---

## Canonical page section order

This is the order every service/commercial page follows. Skip sections that don't apply; never reorder.

```
[1]  H1 + Last updated date label
[2]  Intro paragraphs (4-paragraph structure)
[3]  Answer capsule
[4]  Uplift / data-comparison component (if recommended in Phase 1)
[5]  Top CTA block
[6]  Income / outcome comparison panel
[7]  Seasonality / time-series bar chart + labelled commentary
[8]  "How it works" block
[9]  Services bullet list
[10] "How [we] compare" table
[11] Tax / regulatory section
[12] Demand drivers / supporting context — accordion sections
[13] Demand catchment / geographic SVG visual
[14] Property / market comparison SVG card
[15] FAQ section (with schema markup)
[16] Customer/owner testimonial block
[17] NAP / contact block
[18] Related links / internal cluster
[19] Bottom CTA block
[20] Schema JSON-LD block — always last in HTML source
```

**Rule:** if the page already has a section at a given position, skip to the next missing section. Never duplicate an existing component.

For Stayful-specific component HTML, see:
- `HTML__components__*` files
- `STAYFUL__phase-2-sections__stayful-specific-html.md`

---

## Standard Phase 2 sections — Sections A–K

These are the named HTML blocks Phase 2 produces. Universal structure; specific examples in the Stayful overlay.

### Section A — Schema JSON-LD block

Single `<script type="application/ld+json">` block containing an **array** of all required schema types. Never split across multiple script tags.

Array always includes: Service, LocalBusiness, BreadcrumbList, FAQPage, WebPage — plus VideoObject when video present.

Full rules: `CORE__02_phase-2__schema-rules.md`

### Section A2 — VideoObject schema (when video embed present or recommended)

Required fields:
- `@type`: "VideoObject"
- `name`: descriptive title matching the page topic
- `description`: 1–2 sentence summary
- `thumbnailUrl`: full URL to video thumbnail
- `uploadDate`: ISO 8601 (YYYY-MM-DD)
- `contentUrl` or `embedUrl`
- `duration`: ISO 8601 duration (e.g. PT2M30S)

VideoObject sits alongside other schema types in the same combined JSON-LD array — never as a separate script block.

### Section B — Regulatory / tax section

For Stayful pages: FHL tax changes section. For other businesses: equivalent regulatory/compliance section.

Position: after services bullet list, before FAQ.

The section uses accordion treatment (`CORE__03_content__long-body-text-and-paragraph-formatting.md`) since each topic exceeds 75 words.

Stayful-specific content: `STAYFUL__phase-2-sections__stayful-specific-html.md` (Section B detail)

### Section C — NAP / contact block

Standardised phone + address presentation. Brand-styled.

Stayful spec: phone `0113 479 0251`, link style `color: #5D8156; font-weight: 700; text-decoration: none; font-size: 20px;`

### Section D — Last updated date label

Below the H1 if absent.

```html
<p style="text-align:center; font-size:12px; font-weight:600; color:#5D8156; opacity:0.55; margin:-12px 0 24px; letter-spacing:0.04em; text-transform:uppercase;">
  Last updated: [Month Year]
</p>
```

Refresh quarterly per `CORE__06_measurement__update-cadence-and-triggers.md`.

### Section E — Outbound authority links

For every named local demand driver without an outbound link:

- Official website only
- `target="_blank" rel="noopener"`
- Style: brand-coloured, font-weight 700, no underline, border-bottom 1.5px solid (subtle)
- **Maximum 3 outbound authority links per page**

### Section F — Owner-intent H2 heading additions

If SERP classification from Phase 1 was "Guest-intent dominated", add or replace at least one H2 with owner-intent phrasing.

**Do not change H1** — that affects too many signals at once. Add H2-level interventions instead.

### Section G — Answer capsule block

After the fourth intro paragraph and before the uplift component or top CTA.

Rules:
- Maximum 70 words (counted)
- Begins with exact primary keyword phrase or direct answer
- Contains one specific data point
- Ends with a **pointer to deeper detail** on the page — not a CTA, not a link
- Third person, factual tone
- Self-contained — makes sense if quoted in isolation
- Must not imply a guaranteed outcome

Pattern from `HTML__components__cta-blocks-top-bottom-answer.html`.

### Section H — "How [we] compare" table

Rules:
- **Never name a specific competitor** — use "Typical local agent" / "National platform model" / industry equivalent
- Three columns: Feature / [Your brand] / Alternative
- Exactly 8 rows: fee / setup fee / channels / dynamic pricing / 24/7 communication / direct booking or equivalent / reporting / contract length

For Stayful: see `HTML__components__how-it-works-and-compare-table.html`.

### Section I — "How it works" onboarding block

Always exactly 4 steps. Format:
1. Request your [primary CTA] — takes 2 minutes
2. Onboarding call — we walk through your [thing]
3. [Setup / preparation] — [time to live]
4. [First outcome] — [start signal]

At 560px breakpoint: `grid-template-columns: 1fr`.

### Section J — Customer / owner testimonial block

- One anonymised case study only
- Always include: [property/customer] type, area, previous outcome, current outcome, worst case, best case
- Format as pull quote with descriptor label
- Never use photo or name — always "[Role], [property/customer type], [area]"
- Worst-case figure always included

### Section K — Meta title and description rewrites

Where Phase 1 identified failure. Output as plain text:

```
RECOMMENDED META TITLE:
[Rewritten title — character count: XX]

RECOMMENDED META DESCRIPTION:
[Rewritten description — character count: XX]

NOTES:
[One sentence explaining what was changed and why]
```

Confirm against rules in `CORE__03_meta__title-and-description-rules.md`. Count every character.

---

## After all Phase 2 HTML is written

Run these checklists in order:

1. **`CORE__02_phase-2__geo-ai-overview-checklist.md`** — the narrower AI/AEO citation readiness check
2. **`CORE__02_phase-2__content-quality-qa-checklist.md`** — the comprehensive pre-publication QA
3. **`CORE__02_phase-2__post-publication-indexation-checklist.md`** — the 24h / 7d / 14d / 30d / 60d gates

Phase 2 is not complete until all three checklists are passed.

---

## What Phase 2 NEVER does

- Never recommends changes that conflict with existing brand, typography or component rules
- Never creates new CSS classes — always uses the existing component system
- Never writes schema with fabricated data
- Never adds outbound links to competitor management company websites
- Never suggests removing content (only adds, restructures, strengthens, or 301s)
- Never creates a duplicate of a page already in the sitemap
- Never outputs placeholder text, `[PENDING]` notes, or "coming soon" comments in HTML
- Never splits JSON-LD schema across multiple script tags
- Never outputs an answer capsule over 70 words
- Never implies a guaranteed outcome
- Never adds the uplift component without Phase 1 recommendation

See full list: `CORE__99_never-do__list.md`
