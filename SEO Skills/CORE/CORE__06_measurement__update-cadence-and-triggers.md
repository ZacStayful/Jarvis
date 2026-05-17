# Update Cadence and Event Triggers

**Scope: Universal.** Two categories of updates: scheduled (quarterly and annual cadence) and event-triggered (specific events that require an out-of-cycle action). Both apply on top of the recurring audits in `CORE__06_measurement__pruning-and-indexation-audits.md`.

---

## Scheduled updates — Phase 2 only

These updates run on a fixed cadence regardless of audit findings. They are lightweight refresh work, not full re-audits.

### Quarterly

- **Update income / outcome figures** with fresh local data — pull the latest postcode-level data and adjust the figures shown in body copy and the uplift component
- **Update "Last updated" label** to the current month and year
- **Update `dateModified` field** in WebPage schema to today's date (must match the visible label)
- **Review PAA boxes** for the primary keyword — add any new questions to the FAQ section using verbatim phrasing
- **Refresh competitor baseline table** in `STAYFUL__current__priorities-baseline-competitors.md`
- **Refresh GSC baseline snapshot** in the same file
- **Run cluster health audit** for each city/topic cluster

The quarterly refresh is typically 30 minutes per priority page. The compound effect of running it on 20 priority pages over a year is significant — every page in the priority set looks fresh, current, and actively maintained.

### Annually

- **Re-run full Phase 1 audit** on every priority Tier 1 and Tier 2 page (`CORE__06_measurement__gsc-baseline-and-priority-matrix.md`)
- **Re-run competitor gap matrix** for every Phase 1 audit
- **Confirm all outbound authority links still live** — broken outbound links signal stale content to Google
- **Update FHL tax section** (or business equivalent regulatory content) if government policy changed in the last 12 months
- **Re-assess each profile definition** in the lead profile file — has the lead mix shifted? Have new profiles emerged?
- **Re-assess each priority keyword cluster** — are the same clusters still priority, or have new clusters emerged?

The annual cycle is the strategic reset. The quarterly cycle is operational maintenance.

---

## Event-triggered updates

Specific events that require an out-of-cycle action. Most are smaller than a Phase 1 audit; some require immediate Phase 2 work.

### 6 weeks before a named local event

For city pages where a major event drives short-let demand:

- Add or update a callout box with event dates
- State the typical rate premium for the event period
- Add a single-line note to the seasonality commentary

Example: 6 weeks before the Leeds Festival, the Leeds page gets a callout box stating "Leeds Festival 23–25 August — rates typically 60–80% above August baseline."

This timing matters. Updates closer than 6 weeks risk missing the booking window; updates earlier than 8 weeks may not survive intervening content changes.

### New direct competitor enters the top 10

For any priority keyword where the top 10 changes:

- Re-run Phase 1 Step 3 (competitor analysis) for the new competitor
- Update the competitor gap matrix for the affected page
- If the new competitor has structural advantages (named local team, schema completeness, etc.) — schedule Phase 2 work to match within the next 30 days

A new competitor in the SERP is the most common cause of position regression on previously stable Tier 3 pages.

### Business facts change

For Stayful, this means: management fee, occupancy figures, Google rating, direct booking percentage, properties managed, total revenue earned, onboarding time, phone number, or platform list.

When any of these change:

- **Immediately:** re-run Phase 2 Section A (schema) and Section G (answer capsule) **across the entire site**
- **Within 7 days:** update every page where the affected fact appears in body copy
- **Within 14 days:** re-verify entity consistency across all pages (`CORE__02_phase-2__geo-ai-overview-checklist.md` — Entity Consistency check)

Business facts must be entity-consistent across the domain. A discrepancy between pages (one says "15% + VAT", another says "we charge a fee in the typical range") is an AI extraction trust signal failure.

For non-Stayful sites: identify the equivalent set of business facts that appear across multiple pages. When any change, run the same three-step refresh.

### New cluster page published

When a new cluster page goes live:

- Re-run Phase 1 Step 8 (cannibalisation check) for the cluster
- Update the cluster health record for the affected cluster
- Add the new page to all relevant related-links blocks across the cluster siblings
- Run the post-publication indexation checklist (`CORE__02_phase-2__post-publication-indexation-checklist.md`)

A new cluster page silently shifts cluster status. The cannibalisation re-check is mandatory.

### Government / regulatory change affecting body copy

Examples (Stayful):
- HMRC announces a new FHL tax rule
- Local council introduces an STR licensing scheme
- Government changes the 140-day rule

When any external change makes an existing body-copy statement inaccurate:

- **Immediately:** identify all pages where the affected statement appears
- **Within 48 hours:** update the body copy on all affected pages
- **Within 7 days:** update the FHL tax section across every page that has one
- **Within 14 days:** publish a dedicated guide page on the change if Phase 0 passes

Inaccurate regulatory statements are the highest-trust-cost error a page can have. They produce reader scepticism that lingers even after correction.

### Algorithm update (Google Core Update, etc.)

When Google announces a Core Update:

- Wait 7–14 days for the update to fully roll out (don't react to early-day fluctuations)
- Pull GSC data for the 14-day post-rollout vs. 14-day pre-rollout
- Identify pages with position regression > 3 places
- Run Phase 1 audit on each regressed page with the update's announced focus in mind (e.g. helpful content, spam, product reviews — Google publishes guidance per update)
- Schedule Phase 2 work on the regressed pages

Most algorithm updates don't require structural change to a strong page. They produce noise that resolves over 30 days. Premature reaction often causes more harm than the update.

---

## Cadence summary table

| Update | Trigger | Timing |
|---|---|---|
| dateModified refresh | Quarterly | Day 1 of quarter |
| Income / outcome figure refresh | Quarterly | Day 1 of quarter |
| PAA harvest | Quarterly | Day 7 of quarter |
| Competitor baseline refresh | Quarterly | Day 14 of quarter |
| Cluster health audit | Quarterly | Day 21 of quarter |
| Pruning audit | Quarterly | Day 28 of quarter |
| Monthly indexation health report | Monthly | Day 1 of month |
| Full Phase 1 re-audit (priority pages) | Annually | Q4 |
| Business facts change | Event | Immediate |
| Local event approaching | Event | 6 weeks ahead |
| New SERP competitor | Event | Within 30 days |
| Regulatory change | Event | Within 7 days |
| Algorithm update | Event | After 7–14 day stabilisation |

---

## Common failures

### Failure 1 — Skipping quarterly refresh "this once"

Pages drift from current state. dateModified is stale, figures are stale, PAA is stale. Cumulative effect over 2 quarters: significant. The reader notices.

### Failure 2 — Updating one page when a business fact changes, not all of them

Entity consistency check fails. AI extractors find contradictory facts across the domain. Trust signal degrades.

### Failure 3 — Reacting to algorithm noise

Day 3 of a Core Update rollout, a Tier 3 page drops to position 8. Knee-jerk Phase 2 rewrite. Day 10, the page is back at position 2 — the rewrite was wasted and may even have caused a different regression.

### Failure 4 — Not running the cannibalisation re-check after publishing

New cluster page launches; nobody re-checks the cluster status; six months later the cluster is at AMBER and pages are competing.

### Failure 5 — Treating regulatory accuracy as optional

A page that quotes outdated tax rules erodes reader trust permanently. Even after correction, the page underperforms vs. competitor pages that maintained accuracy.

---

## How this applies to non-Stayful websites

Scheduled cadence is universal. The specific facts and content that get refreshed adapt to the business.

Event triggers adapt:

- E-commerce: new product launch, seasonal sale, supply chain change, return policy update
- SaaS: pricing change, new feature, security update, terms of service change
- Publisher: news event, contributor change, content licensing update

The structural principle — events trigger immediate update across all affected pages, with entity consistency verified — applies in every industry.

---

## Related files

- `CORE__06_measurement__pruning-and-indexation-audits.md` — monthly indexation health and quarterly pruning
- `CORE__06_measurement__gsc-baseline-and-priority-matrix.md` — quarterly baseline tracking
- `CORE__02_phase-2__geo-ai-overview-checklist.md` — entity consistency check
- `STAYFUL__business__facts-and-positioning.md` — Stayful's specific facts that drive entity-consistency checks
