# Stayful — Postcode Data Overview and Matching Rules

**Scope: Stayful Airbnb-management overlay.** When to use the postcode income data, how to match it to pages, and the rules for presenting it.

---

## Overview

This dataset is Stayful's proprietary postcode-level lead enquiry income data. It is the single biggest asymmetric proof source on the site — no competitor has equivalent first-party data.

The data is deployed where it materially improves a page's ability to:

- Compete for commercial intent queries
- Satisfy AI Overview extraction
- Strengthen topical authority

The data is NOT deployed on every page. Overuse weakens its impact and creates entity-consistency complications.

---

## Data source and format

Drawn from Stayful's lead enquiry system. Each entry contains:

- Postcode
- Bedroom count
- Net STR monthly income
- Net LTR monthly income
- Monthly high and monthly low figures

**All figures are net** — after Stayful's management fee. Never presented as gross.

The dataset is manually uploaded at the start of any session where income figures are required.

---

## When the engine adds the uplift component — Phase 1 assessment

The uplift component (`STAYFUL__postcode-data__uplift-component.md`) is added only when one or more conditions are met:

### Condition 1 — Commercial intent keyword cluster

The page targets a query with clear buying intent (income estimate queries, comparison queries, "is it worth it" queries).

### Condition 2 — Competitor has local income data

A direct competitor in the top 10 shows local income figures. Stayful's asymmetric advantage requires the same level of specificity.

### Condition 3 — PAA box exists for income comparison query

Google's PAA shows questions like "how much can I earn from short letting" — answered visually with the uplift component.

### Condition 4 — AI Overview opportunity

The query produces an AI Overview that cites income figures. The uplift component is structured to be cited.

### Condition 5 — Cluster authority gap

The cluster needs strengthened topical authority. The uplift component contributes asymmetric proof.

---

## Phase 1 audit output — uplift component flag

Every Phase 1 audit report must include in the Score Summary:

> Uplift component: Recommended / Not recommended — [one sentence reason]

This flag determines whether Phase 2 builds the uplift component for the page.

---

## Postcode matching rules

### City pages

- Match to **closest postcodes geographically**
- Up to **4 data points** per page
- **Prioritise spread** — don't cluster all 4 from one postcode area

### County pages

- Multiple postcodes across **named towns within the county**
- Up to 4 data points
- Each from a different town

### Pages without local data

- Use **nearest cluster** instead
- Reference as "based on comparable properties in the region"
- Never present as if local data exists

### Homepage and generic nationwide pages

- **UK-wide conservative range only**
- Specifically: 48%–66% based on 185 property enquiries, bottom quartile

### Maximum 4 data points per page

This is a hard limit. More than 4 dilutes impact and increases data-management complexity.

---

## How to present the data in copy

### Show rough location — never individual postcodes

"In LS6 — between Headingley and Hyde Park" — not "LS6 3JD." Specific postcodes are private data.

### Always show LTR-to-STR uplift alongside the income figure

A standalone income figure is harder to interpret than an uplift percentage. The uplift gives context.

### Label all figures as conservative estimates

Use the exact phrasing: "conservative estimate"

### Source attribution

> "Based on enquiry data from comparable properties in [area/region]."

Use exactly as worded.

---

## What the data is NOT used for

- **Guaranteed income claims** — never. The data informs estimates; it doesn't guarantee outcomes.
- **Average across the city** — the data is by postcode and bedroom count. Aggregating to a city average loses precision.
- **Marketing copy without source attribution** — every figure needs the source line.
- **Pages without commercial intent** — guides, news, content pages don't use postcode data unless they specifically support a commercial decision.

---

## Lead data insights (189 verified enquiries — UK-wide)

| Metric | Value |
|---|---|
| Median uplift | 91% |
| Conservative uplift (25th percentile) | 64–65% |
| Average STR monthly | £2,527 |
| Average LTR monthly | £1,225 |

Use these UK-wide figures on:
- The homepage
- Generic nationwide pages
- Pages without local data
- The calculator landing page (where the data drives the tool)

---

## Proof points — National pages

Every national service page must include a 4-stat proof row:

| Stat | Display format |
|---|---|
| Properties managed | "70+" |
| Revenue earned for owners | "£3M+" |
| Google rating | "4.8 stars" |
| Direct bookings | "40%" |

Position: **immediately after top CTA**. Use `.sf-stats` with 4 cells.

Applies to:
- `/airbnb-management-company-uk`
- `/holiday-let-management-uk`
- `/short-term-rental-management`
- `/serviced-accommodation-management-company`
- `/airbnb-agency`
- `/airbnb-management-fees-uk`

---

## Common failures

### Failure 1 — Specific postcodes visible

A page showing "LS6 3JD nets £2,400/month" — that's private data. Use rough location only.

### Failure 2 — Uplift component on every page

Overuse weakens. The Phase 1 recommendation gates whether the component appears.

### Failure 3 — Gross income shown without "net" framing

A figure that looks like net but is actually gross. Inflates the apparent uplift. Always confirm net.

### Failure 4 — Source attribution missing

A figure with no source line. The reader can't tell if it's marketing or data.

### Failure 5 — Using city-average figures

Aggregating postcodes to a city average. Loses precision and breaks entity consistency (the same city may have wildly different income figures across postcodes).

---

## Related files

- `STAYFUL__postcode-data__uplift-component.md` — full HTML and QA for the uplift component
- `STAYFUL__postcode-data__regional-reference-table.md` — all regional conservative uplift figures
- `STAYFUL__current__calculator-component.md` — the interactive calculator using this data
- `CORE__04_frameworks__worst-case-framing-and-proof-points.md` — how postcode data functions as proof
