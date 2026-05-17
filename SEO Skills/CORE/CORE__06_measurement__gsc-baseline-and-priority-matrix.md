# GSC Baseline Tracking and Page Priority Matrix

**Scope: Universal.** How to establish a Google Search Console baseline, project lead-volume impact by ranking position, and prioritise pages into tiers for the next optimisation cycle.

---

## Why establish a baseline

A baseline gives every subsequent decision a yardstick. Without it, "is this page improving?" has no answer.

A baseline includes:

- Average position across all queries
- Total impressions (28-day rolling)
- Total clicks (28-day rolling)
- CTR
- Estimated leads / conversions / revenue per month

Refresh quarterly. Compare changes against the baseline; report deltas, not absolutes.

---

## Stayful's baseline (April 2026)

28-day snapshot:

| Metric | Value |
|---|---|
| Average position | 12.2 |
| Impressions | 174,000 |
| Clicks | 1,460 |
| CTR | 0.84% |
| Estimated leads / month | ~80 |

Quarterly: update this snapshot in `STAYFUL__current__priorities-baseline-competitors.md`.

---

## Lead projection by average position

The relationship between average position and click-through is nonlinear. Moving from position 12 to position 4 produces roughly 13x lead volume, not 3x.

For Stayful's current impression volume:

| Average position | Est. leads / month | Multiplier vs. current (12) |
|---|---|---|
| 12 (current) | 80 | 1x |
| 10 | 138 | 1.7x |
| 8 | 220 | 2.8x |
| 6 | 430 | 5.4x |
| 4 | 1,052 | 13x |

**Priority implication:** Moving from position 12 to 4 represents 13x lead volume. Focus on pages with high impression volume currently stuck on page 2 (positions 11–20).

These pages have demonstrated demand (impressions are high) but are losing the click decision (CTR is low because they're below the fold). Phase 2 work that moves them to page 1 has outsized return.

---

## Building the priority matrix for any website

The same math applies to any commercial site. The multipliers will be slightly different — exact CTR curves depend on the SERP layout for each query — but the principle is the same: page 2 to page 1 is the highest-leverage move.

### The four-tier structure

**Tier 1 — Fix immediately**
Pages with high impressions stuck on page 2+ (positions 11+). These pages have proven demand but are losing clicks. Phase 2 here produces the biggest immediate impact.

**Tier 2 — Strengthen**
Pages already on page 1 but at positions 5–10. Smaller absolute jumps, but moving from position 7 to position 3 still produces meaningful uplift. Focus on competitor gap matrix items.

**Tier 3 — Defend**
Pages at positions 1–4. The page is performing well. The work here is ensuring no regression — quarterly refresh, freshness signals, monitoring for new competitors entering the SERP.

**Tier 4 — Expand**
New cluster pages or supporting content. Only after Phase 0 passes (`CORE__02_phase-0__should-this-page-exist.md`).

### Current Stayful tier examples

**Tier 1 — Fix immediately:**
- `/airbnb-management-company-uk` — not ranking
- `/holiday-let-cleaning-prices` — 1,217 impressions, no clicks
- Setup airbnb cluster — ~2k impressions, fragmented

**Tier 2 — Strengthen:**
- `/costs-of-running-a-holiday-let` — position 6–7
- `/airbnb-income-calculator` — position 7–8
- Calculator hub pages generally

**Tier 3 — Defend:**
- `/serviced-accommodation-management-fees` — #1, maintain
- `/airbnb-management-sheffield` — #1, maintain

**Tier 4 — Expand:**
- New city pages following Nottingham cluster model (only after Phase 0 passes)
- Supporting guide pages for established clusters

---

## How to build the matrix

### Step 1 — Export GSC data

Pull 90 days of query-level data. For each URL:

- Average position
- Total impressions
- Total clicks
- CTR

### Step 2 — Classify each URL into a tier

| URL position | URL impression volume | Tier |
|---|---|---|
| 11+ | 1,000+ monthly impressions | Tier 1 |
| 11+ | 500–1,000 monthly impressions | Tier 1 (lower priority) |
| 11+ | <500 monthly impressions | Tier 4 candidate for pruning |
| 5–10 | 1,000+ impressions | Tier 2 |
| 5–10 | 500–1,000 impressions | Tier 2 (lower priority) |
| 1–4 | Any volume | Tier 3 |

Pages with zero impressions are pruning candidates. Pages with impressions but no clicks are Tier 1 with a CTR investigation flag.

### Step 3 — Identify the highest-priority Tier 1 page

Within Tier 1, the highest priority is the URL with:

- Highest impression volume
- Lowest current CTR
- Highest commercial value (closer to bottom-of-funnel)
- Cleanest competitive position (no cluster pruning required first)

This is the URL Phase 2 work starts with. Maximum leverage, minimum precondition cost.

### Step 4 — Schedule work across the quarter

Quarterly cycle:

- Week 1–2: Phase 1 audit of top 3 Tier 1 pages
- Week 3–6: Phase 2 fixes for those pages
- Week 7–8: Phase 2 monitoring + Tier 2 audits
- Week 9–10: Phase 2 fixes for Tier 2 pages
- Week 11–12: Pruning audit + Tier 3 freshness refresh

Adapt to actual capacity. The structure is: a few pages with deep work beats many pages with shallow work.

---

## Competitive baseline tracking

In addition to internal performance, track competitive position quarterly.

### Stayful's April 2026 competitive baseline

| Query | Stayful position | Gap to top 4 |
|---|---|---|
| serviced accommodation management fees UK | #1 | — |
| airbnb management Sheffield | #1 | — |
| holiday let management costs | #3 | — |
| airbnb host fees calculator | #3-4 | — |
| holiday let income calculator UK | #4 | — |
| costs of running a holiday let | #6-7 | 2-3 positions |
| airbnb income estimator UK | #7-8 | 3-4 positions |
| airbnb management UK | Page 2+ | Significant |
| airbnb management company UK | Not visible | Critical |
| setup airbnb | Page 2+ | Significant |
| holiday let cleaning prices | Page 2+ | Significant (1,217 impressions, 0 clicks) |

Update this table quarterly per `STAYFUL__current__priorities-baseline-competitors.md`.

### Why competitive baseline matters

Improving from "not visible" to position 8 is meaningful even if Stayful is still page 1. Tracking position changes for each priority query:

- Surfaces regression early
- Identifies which Phase 2 fixes are working
- Shows where competitor moves are eating Stayful's ground
- Informs Phase 0 decisions on new pages

---

## Reporting cadence

| Metric | Cadence |
|---|---|
| Full GSC baseline refresh | Quarterly |
| Tier priority matrix update | Quarterly |
| Competitive position check | Quarterly |
| Indexation health report | Monthly (`CORE__06_measurement__pruning-and-indexation-audits.md`) |
| Cluster health audit | Quarterly |
| Per-page performance check after Phase 2 | 30, 60, 90 days post-publish |

---

## How this applies to non-Stayful websites

The baseline and tier matrix apply directly to any commercial website.

For B2B SaaS: GSC + product analytics combined; Tier 1 = MQL volume from page-2 high-impression URLs.

For e-commerce: GSC + revenue per landing page combined; Tier 1 = high-impression product pages on page 2.

For publishers: GSC + engagement (scroll depth, time on page); Tier 1 = high-impression articles on page 2 with strong dwell.

The position-to-leads multiplier curve is nonlinear in every industry. The Tier 1 "page 2 high-impression" focus is the highest-leverage allocation everywhere.

---

## Related files

- `STAYFUL__current__priorities-baseline-competitors.md` — Stayful's current state (refresh quarterly)
- `CORE__06_measurement__pruning-and-indexation-audits.md` — quarterly pruning audit and monthly indexation health report
- `CORE__06_measurement__update-cadence-and-triggers.md` — full quarterly and annual cadence
- `CORE__02_phase-1__audit-methodology.md` — how to do Phase 1 once a page is prioritised
