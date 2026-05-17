# Stayful — Interactive Calculator Component

**Scope: Stayful Airbnb-management overlay.** The interactive income calculator that drives the primary conversion across the site.

---

## File location

`/mnt/user-data/outputs/stayful-income-calculator.html`

This is the source-of-truth file for the calculator component. Each deployment embeds or references this file.

---

## How it works

1. User enters their **postcode + bedroom count**
2. Calculator extracts the postcode prefix (the first part of the postcode, e.g. "LS6" from "LS6 3JD")
3. Matches the prefix to local income data from Stayful's lead enquiries
4. Shows the user:
   - STR monthly income
   - LTR monthly income
   - Uplift percentage
   - Visual comparison
5. Falls back to UK-wide average when no local data is available

---

## Where it's deployed

The calculator is the primary conversion engine. It appears on:

| Page | Position |
|---|---|
| `/airbnb-income-calculator` (primary deployment) | Centre of page, above the fold |
| `/holiday-let-income-calculator` | Centre of page, above the fold |
| Homepage | Above the fold |
| City pages | Embedded twice (top CTA and bottom CTA) |
| County hub pages | Embedded twice |
| Guide pages | Embedded once at top |

The embed pattern across all deployments:

```html
<div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
```

---

## Data coverage

The calculator currently has data for **45+ postcode prefixes**. Coverage expands as new lead enquiries grow the dataset.

When a user enters a postcode prefix not in the dataset:

- The calculator falls back to the UK-wide conservative range (48%–66%)
- The result is labelled: "Based on UK-wide conservative range — local data not yet available for this postcode"
- The user is invited to request a manual estimate

This fallback maintains trust by being honest about the data limitation rather than fabricating a local figure.

---

## Why the calculator is the primary conversion

For Stayful's audience (cautious property owners), the conversion friction is:

1. **They don't trust generic projections** — they want specifics for their property
2. **They don't want to talk to a salesperson** — low-friction self-service is preferred
3. **They're 2–6 months from being ready** — they want information, not commitment

The calculator addresses all three:

1. **Postcode-specific** — feels personalised, not generic
2. **Self-service** — no email gate, no phone-call requirement initially
3. **Information-first** — delivers value before asking for anything

This is why every city page embeds the calculator twice (top and bottom CTA) — not a static "request a quote" button.

---

## Refreshing the data

Quarterly:

1. Pull the latest lead enquiry data
2. Recalculate STR and LTR averages per postcode prefix
3. Update the data file feeding the calculator
4. Verify the calculator returns expected figures for 10+ sample postcodes
5. Push the updated file to live

New postcode prefixes are added when:
- 5+ data points exist for the prefix (minimum threshold for non-thin-sample classification)
- The prefix corresponds to an area where Stayful manages at least 1 property (operational knowledge backs the data)

---

## What the calculator is NOT

- A guarantee of income (the result is a typical-comparable figure, not a forward guarantee)
- A binding quote (the figure informs the conversation, doesn't commit Stayful to it)
- A substitute for the formal income estimate (the calculator is the gateway; the formal estimate is the deeper offering for serious prospects)

The calculator result should always be followed by a low-friction "Want a property-specific estimate?" offer that triggers the formal email-gated process.

---

## QA — pre-deployment checks for a new instance

When deploying the calculator on a new page:

- [ ] Embed pattern uses `data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"`
- [ ] Page has at least one demand anchor sentence near the embed
- [ ] Income guarantee statement (Objection 2 exact wording) is near the embed
- [ ] Control statement (Objection 3 exact wording) is near the embed
- [ ] Trust cluster (4.8 stars + case study) is visible near the embed
- [ ] Disqualifier is visible near the embed (top CTA at minimum)
- [ ] Mobile rendering verified at 560px breakpoint
- [ ] Fallback message tested with a known-missing postcode

Full context for what surrounds the calculator: `STAYFUL__cta__form-context-and-trust-cluster.md`

---

## Performance

The calculator is JavaScript-rendered. To minimise CWV impact:

- The embed wrapper has explicit dimensions to prevent CLS
- The calculator initialises after the page's critical content is rendered
- The lookup logic runs locally (no API calls) for the data subset bundled with the page

---

## Future evolution

Anticipated improvements (not yet deployed):

- Bedroom count input refinement (currently 1–6; may extend to studio + 7+ for portfolio buyers)
- Property type input (currently uniform; may add flat / terraced / detached weighting)
- Seasonal range output (currently averaged; may show min / max bands per month)

Any change to the calculator output affects entity consistency across the domain. Schedule deployment alongside a full Phase 2 refresh of the calculator landing page.

---

## Related files

- `STAYFUL__postcode-data__overview-and-matching.md` — the data source feeding the calculator
- `STAYFUL__postcode-data__regional-reference-table.md` — the fallback figures
- `STAYFUL__cta__form-context-and-trust-cluster.md` — what surrounds every calculator embed
- `STAYFUL__current__priorities-baseline-competitors.md` — calculator landing pages in the Tier 2 priority list
