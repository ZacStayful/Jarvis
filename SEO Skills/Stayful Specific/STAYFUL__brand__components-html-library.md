# Stayful — Components HTML Library

**Scope: Stayful Airbnb-management overlay.** Description and rules for every reusable component. Actual HTML/CSS code lives in the `HTML__*` files.

---

## Component list

Each component has a specific job, a specific position in the canonical section order, and specific rules. Use them from the HTML files; never re-build from scratch.

---

### Callout box

White background, `border-left: 3px solid #5D8156`, two-column grid inside.

- Label column: 110px wide, uppercase, 11px, 700 weight
- Text column: 14.5px, 600 weight

**Position:** anywhere a single specific fact needs to be highlighted in body copy.

**File:** `HTML__components__basic-callout-stat-bullet.html`

---

### Stat row

CSS grid of 3 or 4 white cells on a `border` background.

Each cell:
- Large number: `font-size: 28px; font-weight: 800;`
- Small label below: `font-size: 12.5px; font-weight: 600;`

**Position:** Zone 1 or 2; serves as an attention reset.

**File:** `HTML__components__basic-callout-stat-bullet.html`

---

### Pull stat

White box with border.

- Large number left: `font-size: 48px; font-weight: 800;`
- Descriptive text right: `font-size: 14px; font-weight: 600;`
- Stacks on mobile at 560px breakpoint

**Position:** mid-page, breaks long prose runs.

**File:** `HTML__components__basic-callout-stat-bullet.html`

---

### Bullet list

White box with border.

Each `li`:
- `padding: 11px 18px 11px 42px`
- Checkmark pseudo-element at `left: 16px`
- `font-size: 14.5px; font-weight: 600`
- Border between items

**Position:** services list, what's-included block.

**File:** `HTML__components__basic-callout-stat-bullet.html`

---

### FAQ dropdowns

White background items, border-top on first, border-bottom between each.

- Button triggers with chevron SVG that rotates 180° on open
- `max-height: 0` to `max-height: 400px` transition
- Include `itemscope itemtype="https://schema.org/Question"` markup on each item

**Position:** Zone 3 (commitment) — late in page.

**File:** `HTML__components__faq-accordion.html`

---

### Income comparison panel

Two-column grid.

- Left panel: white
- Right panel: `#a8c9b8`
- Large income number: `font-size: 52px; font-weight: 800;`
- Full-width green difference bar underneath with white text

**Position:** Zone 2 (credibility) — typically Section 6 of canonical order.

**File:** `HTML__components__income-comparison-panel.html`

---

### Seasonality bar chart

White container.

- Score + description at top
- Month bars: label (32px wide), track (`flex: 1; height: 18px; background: #BAD6C7;`), fill (`background: #5D8156`)
- Width set by JS data-width attribute, animated on load
- Legend at bottom

**Followed by labelled commentary paragraphs** (see `CORE__03_content__long-body-text-and-paragraph-formatting.md` — post-chart labelled-paragraph pattern).

**Position:** Zone 2, after income comparison panel.

**File:** `HTML__components__seasonality-bar-chart.html`

---

### Related links

- Uppercase label
- `<a>` tags each `display: flex; gap: 10px; padding: 10px 0; border-bottom`
- Arrow `::before` at `opacity: 0.35`
- Green, not blue

**Position:** late in page, after FAQ.

**File:** `HTML__components__basic-callout-stat-bullet.html` (included in mixed-component file)

---

### Accordion sections

- `border-top: 2px solid #5D8156` on the trigger button
- Chevron SVG rotates on open
- `max-height: 0` to `max-height: 2000px`
- Store bar widths as `data-width` and animate via JS on load and on open

**Position:** anywhere body copy exceeds ~75 words (per the long-body-text rule).

**File:** `HTML__components__faq-accordion.html` (same accordion pattern)

---

### Embedded CTA

**Always use this exact embed — never a button link:**

```html
<div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
```

Place once naturally after the opening intro paragraph. Repeat at the bottom of the page inside a full-width green section.

**File:** `HTML__components__cta-blocks-top-bottom-answer.html`

---

### Top CTA (inside green block after intro)

```html
<div class="cta-embed">
  <span class="cta-embed-label">Free income estimate</span>
  <span class="cta-embed-title">See what your [CITY] property could earn</span>
  <span class="cta-embed-sub">Tailored to your postcode — no obligation, takes 2 minutes</span>
  <div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
</div>
```

**File:** `HTML__components__cta-blocks-top-bottom-answer.html`

---

### Bottom CTA (full-width green section)

```html
<div class="cta-bottom">
  <h2>[Compelling headline]</h2>
  <p>[One sentence]</p>
  <div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
</div>
```

**File:** `HTML__components__cta-blocks-top-bottom-answer.html`

---

### Uplift component

Standalone visual callout placed **immediately above the top CTA block**.

- Once per page only — never repeated at bottom CTA
- Mobile breakpoint 560px: `.sf-uplift-grid grid-template-columns: 1fr`
- Includes conservative uplift range, LTR and STR figures, source line

**Recommended in Phase 1 only** — not added by default.

**File:** `HTML__components__uplift-component.html`

**Rules:** `STAYFUL__postcode-data__uplift-component.md`

---

### "How it works" 4-step block

Always exactly 4 steps:

1. Request your free income estimate — takes 2 minutes
2. Onboarding call — we walk through your [City] property
3. Photography and listing setup — professionally listed on all platforms in 7–14 days
4. First booking — income starts

At 560px: `grid-template-columns: 1fr`.

**File:** `HTML__components__how-it-works-and-compare-table.html`

---

### "How Stayful compares" table

Three columns: Feature / Stayful / Alternative.

**Never name a specific competitor** — use "Typical local agent" or "National platform model".

Exactly 8 rows:

1. Management fee
2. Setup fee
3. Platforms listed on
4. Dynamic pricing
5. 24/7 guest communication
6. Direct booking channel
7. Owner reporting
8. Contract length

**File:** `HTML__components__how-it-works-and-compare-table.html`

---

### Owner testimonial block

- One anonymised case study only
- Always include: property type, area, previous income, Stayful net average, worst month, best month
- Format as pull quote with property descriptor label
- Never use photo or name — always "Owner, [property type], [area]"
- Worst month figure always included

**File:** `HTML__components__owner-testimonial-nap-last-updated.html`

---

### NAP / contact block

Phone: `0113 479 0251`

Phone style: `color: #5D8156; font-weight: 700; text-decoration: none; font-size: 20px;`

**File:** `HTML__components__owner-testimonial-nap-last-updated.html`

---

### Last updated label

Below the H1 where absent:

```html
<p style="text-align:center; font-size:12px; font-weight:600; color:#5D8156; opacity:0.55; margin:-12px 0 24px; letter-spacing:0.04em; text-transform:uppercase;">
  Last updated: [Month Year]
</p>
```

Refresh quarterly with the dateModified update.

**File:** `HTML__components__owner-testimonial-nap-last-updated.html`

---

### SVG visuals — demand catchment map

Place before the demand drivers H2. Shows the city at centre with key demand drivers plotted around it.

**Rules:**
- viewBox minimum 500px height for a map with 5+ markers
- Every marker label uses a white pill background rectangle positioned beside the marker
- Centre location label goes in a pill below the marker, not inside it
- Legend at the very bottom with at least 40px clear space above it
- All colours use brand palette
- Mark as `role="img"` with descriptive `aria-label`
- Include "Illustrative — not to scale" in small text at bottom right

**File:** `HTML__svg__demand-map-and-property-comparison.html`

---

### SVG visuals — property comparison card

Place between the services bullet list and the FAQ section.

**Rules:**
- Full-width header banner at top (`y=0` to `y=46`) containing the comparison title
- Left card `x=0` to approximately `x=355`
- Right card starts at `x=361`
- No element crosses the midpoint into the other card
- Footnote strip at the very bottom

**File:** `HTML__svg__demand-map-and-property-comparison.html`

---

## General SVG rules

- Use `<defs>` for gradients and drop shadow filters
- Give every gradient and filter a unique id with suffixes per page (e.g. `mapbg2`, `ds2`)
- **Never use emoji in SVG text elements**
- All SVG containers: `style="width:100%;height:auto;display:block;"`
- Wrap each SVG in a div with `border: 1px solid rgba(93,129,86,0.18); overflow: hidden; margin: 0 0 28px;`

---

## Schema JSON-LD

Combined array containing all required schema types. See `CORE__02_phase-2__schema-rules.md` for the rules and `HTML__schema__jsonld-combined-and-videoobject.html` for the template.

---

## Related files

- `HTML__components__basic-callout-stat-bullet.html`
- `HTML__components__faq-accordion.html`
- `HTML__components__cta-blocks-top-bottom-answer.html`
- `HTML__components__income-comparison-panel.html`
- `HTML__components__seasonality-bar-chart.html`
- `HTML__components__uplift-component.html`
- `HTML__components__how-it-works-and-compare-table.html`
- `HTML__components__owner-testimonial-nap-last-updated.html`
- `HTML__svg__demand-map-and-property-comparison.html`
- `HTML__schema__jsonld-combined-and-videoobject.html`
- `HTML__css__brand-styles.css`
