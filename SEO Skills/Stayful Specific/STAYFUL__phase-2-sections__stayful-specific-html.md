# Stayful — Phase 2 Sections A to K (Stayful-Specific HTML)

**Scope: Stayful Airbnb-management overlay.** The Stayful-specific implementation of Phase 2 Sections A through K. Universal section structure: `CORE__02_phase-2__canonical-section-order-and-html-additions.md`.

---

## Section A — Schema JSON-LD block

Combined array in a single `<script>` tag. Always includes:
- Service
- LocalBusiness
- BreadcrumbList
- FAQPage
- WebPage

Plus VideoObject when video is present.

### Stayful defaults

| Field | Default value |
|---|---|
| Service name | "Airbnb Management" / "Holiday Let Management" — match the page primary keyword |
| Provider | Stayful |
| Provider URL | https://www.stayful.co.uk |
| Telephone | "0113 479 0251" |
| AggregateRating ratingValue | "4.8" |
| AggregateRating bestRating | "5" |
| priceRange | "££" |
| areaServed | City name, county name, primary postcode |

Full HTML template: `HTML__schema__jsonld-combined-and-videoobject.html`

---

## Section A2 — VideoObject schema (when applicable)

Added to the combined JSON-LD array — never as a separate script block.

Required fields:
- `@type`: "VideoObject"
- `name`: descriptive title matching page topic
- `description`: 1–2 sentence summary
- `thumbnailUrl`: full URL to thumbnail
- `uploadDate`: ISO 8601 (YYYY-MM-DD)
- `contentUrl` or `embedUrl`
- `duration`: ISO 8601 (e.g. PT2M30S)

---

## Section B — FHL Tax Changes Section

Add to every holiday let management page where absent. Position: after services bullet list, before FAQ.

### H2

> "What the 2025 holiday let tax changes mean for [City] owners"

### Topics covered (in accordion sections)

#### 1. Mortgage interest relief

Capped at 20% tax credit. Previously fully deductible.

#### 2. Capital allowances

No longer available on new purchases from April 2025.

#### 3. Capital Gains Tax

24% standard residential rate. BADR (Business Asset Disposal Relief) no longer available for FHLs.

#### 4. Council tax vs business rates

- 140-day occupancy rule
- 70-day commercial-let rule
- SBRR (Small Business Rate Relief) if rateable value under £15,000

#### 5. Income reporting

FHL income now standard UK property income — not separate trading income.

### Mandatory closing line

> "Tax treatment depends on individual circumstances — always confirm with a qualified accountant."

This line appears at the end of the section. Use exactly as worded.

---

## Section C — NAP / contact block

```
Phone: 0113 479 0251
```

Phone link style:
```css
color: #5D8156;
font-weight: 700;
text-decoration: none;
font-size: 20px;
```

Format the NAP block to include:
- Phone number (linked, brand-styled)
- Address (if Stayful has a public service address for the city)
- Hours (if applicable)

---

## Section D — Last updated date label

Below the H1 where absent:

```html
<p style="text-align:center; font-size:12px; font-weight:600; color:#5D8156; opacity:0.55; margin:-12px 0 24px; letter-spacing:0.04em; text-transform:uppercase;">
  Last updated: [Month Year]
</p>
```

Quarterly refresh: update month and year. Update `dateModified` in WebPage schema to match.

---

## Section E — Outbound authority links

For every named local demand driver without an outbound link:

- Official website only
- `target="_blank" rel="noopener"`
- Style: `color: #5D8156; font-weight: 700; text-decoration: none; border-bottom: 1.5px solid rgba(93,129,86,0.3);`
- **Maximum 3 outbound authority links per page**

### Typical authority targets

- Local council website (for licensing/tax pages)
- City tourist board (Visit[City])
- Major employer (NHS trust, university)
- Major event website
- Local landmark / venue

Never link to:
- Competitor management companies
- Affiliate sites
- Generic news aggregators

---

## Section F — Owner-intent H2 heading additions

If Phase 1 SERP classification was "Guest-intent dominated":

- Add or replace at least one H2 with owner-intent phrasing
- **Do not change H1** — H1 changes affect too many signals at once

### Owner-intent H2 examples

- "What this property type typically earns in [City] — including the quieter months"
- "Why [City] short-let landlords switch from long-term tenancies"
- "What separates Stayful's [City] management from a listing-only approach"
- "From enquiry to first booking — what the first 14 days look like in [City]"

---

## Section G — Answer capsule block

Position: after the fourth intro paragraph, before the uplift component or top CTA.

### Rules

- Maximum 70 words (counted)
- Begins with exact primary keyword phrase or direct answer
- Contains one specific data point
- Ends with a **pointer to deeper detail** on the page — not a CTA, not a link
- Third person, factual tone
- Self-contained — makes sense if quoted in isolation
- **Must not imply a guaranteed income floor**

### Example pattern

> "Short-term letting in [City] typically nets 51% more per month than a comparable long-let, after Stayful's 15% + VAT management fee and operating costs. Conservative figures are based on actual enquiry data from comparable [City] properties — including the quieter months. The income comparison panel below shows the full breakdown for properties similar to yours."

The closing sentence is the **pointer** — it directs the reader to the deeper detail without being a CTA.

---

## Section H — "How Stayful compares" table

### Rules

- **Never name a specific competitor** — use "Typical local agent" or "National platform model"
- Three columns: Feature / Stayful / Alternative
- Exactly 8 rows

### Rows

1. Management fee
2. Setup fee
3. Platforms listed on
4. Dynamic pricing
5. 24/7 guest communication
6. Direct booking channel
7. Owner reporting
8. Contract length

### Example values

| Feature | Stayful | Typical local agent |
|---|---|---|
| Management fee | 15% + VAT | 18–25% + VAT |
| Setup fee | £0 | £200–£500 |
| Platforms listed on | 5 (Airbnb, Booking.com, VRBO, Google, Stayful direct) | 1–2 (usually Airbnb only) |
| Dynamic pricing | Daily algorithmic | Manual or weekly |
| 24/7 guest communication | Yes | Office hours only |
| Direct booking channel | 40% of bookings | <10% |
| Owner reporting | Monthly statements, real-time dashboard | Quarterly summary |
| Contract length | Rolling monthly | 12-month minimum typical |

HTML: `HTML__components__how-it-works-and-compare-table.html`

---

## Section I — "How it works" onboarding block

Always exactly 4 steps:

1. **Request your free income estimate** — takes 2 minutes
2. **Onboarding call** — we walk through your [City] property
3. **Photography and listing setup** — professionally listed on all platforms in 7–14 days
4. **First booking** — income starts

At 560px breakpoint: `grid-template-columns: 1fr`.

HTML: `HTML__components__how-it-works-and-compare-table.html`

---

## Section J — Owner testimonial block

- One anonymised case study only
- Always include:
  - Property type
  - Area
  - Previous income (LTR or previous STR)
  - Stayful net average
  - Worst month
  - Best month
- Format as pull quote with property descriptor label
- Never use photo or name — always "Owner, [property type], [area]"
- **Worst month figure always included**

### Example

> "Three-bed terraced, LS6 (Headingley, Leeds)
> Previously £1,150/month long-let. Now nets £2,380/month average across the year. Slowest month: £1,720. Best month: £3,840 (festival weekend in August)."
> — Owner, Leeds

HTML: `HTML__components__owner-testimonial-nap-last-updated.html`

---

## Section K — Meta title and description rewrites

When Phase 1 identified failure. Output as plain text:

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

## Output order in a Phase 2 deliverable

Phase 2 output flows in this order:

1. Schema block (Section A + A2)
2. Last updated label (Section D)
3. Answer capsule (Section G)
4. Uplift component (if recommended)
5. Owner-intent H2 additions (Section F)
6. Compare table (Section H)
7. How it works block (Section I)
8. Owner testimonial (Section J)
9. FHL tax section (Section B)
10. NAP block (Section C)
11. Outbound authority links (Section E)
12. Meta rewrites (Section K)
13. Content Quality QA Checklist
14. Post-Publication Indexation Checklist

Each block is self-contained HTML ready to paste into Squarespace.

---

## Related files

- `CORE__02_phase-2__canonical-section-order-and-html-additions.md` — universal Phase 2 structure
- All `HTML__*` files — actual code for each section
- `STAYFUL__brand__visual-identity.md` — colour and typography rules
- `STAYFUL__business__facts-and-positioning.md` — facts referenced in each section
- `STAYFUL__objections__six-mandatory.md` — objections addressed in body copy
