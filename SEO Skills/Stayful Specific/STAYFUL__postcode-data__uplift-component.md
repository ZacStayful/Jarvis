# Stayful — Uplift Component

**Scope: Stayful Airbnb-management overlay.** HTML standard, placement rules, and QA checklist for the uplift component.

The component is a standalone visual callout placed immediately above the top CTA block. It shows the LTR-to-STR uplift for the city/region with a conservative figure.

---

## When to use

**Only when Phase 1 audit recommends it.** See `STAYFUL__postcode-data__overview-and-matching.md` for the five conditions that trigger the recommendation.

Never add the uplift component without Phase 1 recommendation. Overuse weakens the impact.

---

## Placement rules

- Once per page only
- **Immediately above the top CTA block**
- Never repeated at the bottom CTA
- Mobile breakpoint 560px: `.sf-uplift-grid` collapses to single column

---

## What the component shows

For city pages:

- Conservative uplift % (range), e.g. "152–186%"
- LTR monthly figure
- STR monthly figure
- Source line: "Based on enquiry data from comparable properties in [area/region]"
- "Conservative estimate" label

For county / regional pages:

- County-level conservative range
- LTR range for the county
- STR range for the county
- Source line

For UK-wide pages:

- The UK-wide conservative range (48%–66%)
- "Based on 185 property enquiries, bottom quartile"

---

## HTML standard

Full template: `HTML__components__uplift-component.html`

Structural elements:

```html
<div class="sf-uplift-component">
  <div class="sf-uplift-header">
    <span class="sf-uplift-label">Conservative estimate</span>
    <h3 class="sf-uplift-title">What a [property type] in [City] typically earns</h3>
  </div>
  <div class="sf-uplift-grid">
    <div class="sf-uplift-cell sf-uplift-ltr">
      <span class="sf-uplift-cell-label">Long-term tenancy</span>
      <span class="sf-uplift-cell-figure">£[X]</span>
      <span class="sf-uplift-cell-period">per month</span>
    </div>
    <div class="sf-uplift-cell sf-uplift-str">
      <span class="sf-uplift-cell-label">Short-term letting</span>
      <span class="sf-uplift-cell-figure">£[Y]</span>
      <span class="sf-uplift-cell-period">per month</span>
    </div>
  </div>
  <div class="sf-uplift-difference">
    <span class="sf-uplift-difference-label">Conservative uplift</span>
    <span class="sf-uplift-difference-figure">[Z]%</span>
  </div>
  <p class="sf-uplift-source">
    Based on enquiry data from comparable properties in [area/region].
  </p>
</div>
```

Mobile (560px): `.sf-uplift-grid { grid-template-columns: 1fr; }`

---

## QA Checklist — Uplift Component

Complete only if component is present on page.

- [ ] Recommended in Phase 1 audit (not added without assessment)
- [ ] Uplift % shown as range, labelled "conservative estimate"
- [ ] Source line: "Based on enquiry data from comparable properties in [area/region]"
- [ ] LTR figure shown alongside every STR figure
- [ ] No figure exceeds regional conservative range (see `STAYFUL__postcode-data__regional-reference-table.md`)
- [ ] Placed **immediately above top CTA only** — not repeated at bottom CTA
- [ ] Mobile: grid stacks to single column at 560px
- [ ] **No income floor implied**

---

## Common failures

### Failure 1 — Uplift component on every page

Even where Phase 1 didn't recommend it. Dilutes the impact across the cluster and creates entity-consistency complications.

### Failure 2 — Single uplift figure instead of range

"Uplift: 152%" — this implies a fixed expectation. Always show a range: "152–186%".

### Failure 3 — STR figure without LTR alongside

The reader can't interpret an STR figure without the LTR comparison. Always both, side by side.

### Failure 4 — Missing source line

The figure looks like a marketing claim. Always include the source attribution.

### Failure 5 — Repeated at bottom CTA

The bottom CTA is for the form embed with a compelling headline, not a repeat of the uplift component. One placement only.

### Failure 6 — Implied income floor

Phrasing like "guaranteed to earn at least 152% more" or "you'll see at least this uplift" — never. The component shows what comparable properties typically earned, not a forward guarantee.

---

## How the component fits in the canonical section order

```
[1]  H1 + Last updated label
[2]  Intro paragraphs (4-paragraph structure)
[3]  Answer capsule
[4]  Uplift component  ← HERE (if recommended)
[5]  Top CTA block
[6]  Income comparison panel
...
```

The uplift component sits between the answer capsule and the top CTA. It serves as the visual anchor for the page's primary claim, immediately before asking the reader to convert.

---

## How the component supports the worst-case framing

The conservative uplift figure functions as the implicit worst case. The reader sees:

- "152–186% uplift, conservative estimate"
- Knows the actual data range goes higher (the "...–188%" suggests so)
- Trusts the figure because it's labelled conservative, not best-case

This is a different proof mechanism from the explicit "in a slow year, this property nets £X" framing — but they complement each other. Use both on the same page where appropriate.

---

## Related files

- `STAYFUL__postcode-data__overview-and-matching.md` — when to use and how to match
- `STAYFUL__postcode-data__regional-reference-table.md` — the conservative figures by region
- `HTML__components__uplift-component.html` — the actual HTML
- `CORE__04_frameworks__worst-case-framing-and-proof-points.md` — how the component functions as proof
- `CORE__02_phase-2__content-quality-qa-checklist.md` — the QA checklist references this component
