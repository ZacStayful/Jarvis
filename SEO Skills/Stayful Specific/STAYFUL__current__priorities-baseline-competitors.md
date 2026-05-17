# Stayful — Current Priorities, GSC Baseline, and Competitors

**Scope: Stayful Airbnb-management overlay.** Refresh quarterly. This file captures the current state — what's working, what's not, where the next quarter's work should go.

**Last refresh: April 2026**

---

## GSC baseline (28-day rolling)

| Metric | Value |
|---|---|
| Average position | 12.2 |
| Impressions | 174,000 |
| Clicks | 1,460 |
| CTR | 0.84% |
| Estimated leads / month | ~80 |

---

## Lead projection by average position (Stayful-specific)

| Avg position | Est. leads/month | Multiplier vs current |
|---|---|---|
| 12 (current) | 80 | 1x |
| 10 | 138 | 1.7x |
| 8 | 220 | 2.8x |
| 6 | 430 | 5.4x |
| 4 | 1,052 | 13x |

**Implication:** Moving from position 12 to 4 represents 13x lead volume. Focus on Tier 1 (high-impression page 2+) pages.

---

## Competitive position table

| Query | Stayful position | Gap to top 4 |
|---|---|---|
| serviced accommodation management fees UK | #1 | — |
| airbnb management Sheffield | #1 | — |
| holiday let management costs | #3 | — |
| airbnb host fees calculator | #3-4 | — |
| holiday let income calculator UK | #4 | — |
| costs of running a holiday let | #6-7 | 2–3 positions |
| airbnb income estimator UK | #7-8 | 3–4 positions |
| airbnb management UK | Page 2+ | Significant |
| airbnb management company UK | Not visible | Critical |
| setup airbnb | Page 2+ | Significant |
| holiday let cleaning prices | Page 2+ | Significant (1,217 impressions, 0 clicks) |

Update this table quarterly.

---

## Page Priority Matrix — current

### Tier 1 — Fix immediately (high impressions, page 2+)

- `/airbnb-management-company-uk` — not ranking
- `/holiday-let-cleaning-prices` — 1,217 impressions, no clicks
- Setup airbnb cluster — ~2k impressions, fragmented

### Tier 2 — Strengthen (positions 5–10)

- `/costs-of-running-a-holiday-let` — position 6–7
- `/airbnb-income-calculator` — position 7–8
- Calculator hub pages generally

### Tier 3 — Defend (positions 1–4)

- `/serviced-accommodation-management-fees` — #1, maintain
- `/airbnb-management-sheffield` — #1, maintain

### Tier 4 — Expand (only after Phase 0 passes)

- New city pages following Nottingham cluster model
- Supporting guide pages for established clusters

---

## Direct competitors — current set

For Phase 1 Step 3 competitor analysis:

### National

- Pass the Keys
- Hostmaker (re-branded as Houst)
- Veeve
- GuestReady
- Air Sorted (now Houst)

### Regional

- StayShropshire (Midlands)
- HelloGuest (national but strong London/SE presence)
- Hudson Property Group (Yorkshire / NE)

### Per-city competitors

Update as each city's SERP is reviewed. Most cities have a local 2–3 person operator that ranks alongside the national players.

---

## Notable cluster status

| Cluster | Status | Notes |
|---|---|---|
| Sheffield | GREEN — strong | #1 on primary keyword; defend |
| Nottingham | GREEN — model cluster | Used as template for other city builds |
| Leeds | GREEN | High-uplift region; uplift component prominent |
| London | AMBER | Multiple overlapping pages; consolidation pending |
| Manchester | AMBER | Holiday let / Airbnb pages targeting same intent |
| Liverpool | Thin sample for uplift | Flag when using |
| Chester | Thin sample for uplift | Flag when using |
| Devon / Torbay | Use 67% floor in copy | Outlier-driven full range |

Full cluster health audit runs quarterly — see `CORE__06_measurement__pruning-and-indexation-audits.md`.

---

## Q2 2026 (current quarter) priorities

In order:

1. **Bucket 2 consolidation across London and Manchester clusters** — quarterly pruning sprint
2. **Phase 2 fixes for `/airbnb-management-company-uk`** — Tier 1 highest impact
3. **Phase 2 fixes for `/holiday-let-cleaning-prices`** — Tier 1 with 0% CTR mystery
4. **Setup airbnb cluster consolidation** — 4+ overlapping pages
5. **Strengthen `/costs-of-running-a-holiday-let`** from position 6–7 to top 4

Quarterly time budget: ~60% on Bucket 2 / Tier 1 work, ~30% on Tier 2 strengthening, ~10% on defending Tier 3.

---

## Q3 2026 (next quarter) — anticipated priorities

Subject to revision based on Q2 outcomes:

- Cluster expansion only after Phase 0 passes for each new page concept
- New city pages following Nottingham model — likely targets: York (#113–141% uplift, strong demand), Bath (154–188% uplift)
- Income calculator page improvements (Tier 2 → Tier 3)
- Re-audit Tier 3 pages for any regression

---

## What's NOT a current priority

For clarity on what gets deferred:

- Building county hub pages (no demonstrated PAA gap)
- Cohost-[city] / setup-[city] pages (cannibalisation risk; Phase 0 fails)
- Generic guide pages without specific PAA evidence
- New regions outside current operational footprint

---

## Refresh protocol

This file is updated:

- **Quarterly** — full refresh of GSC metrics, competitive position, priority matrix
- **Event-triggered** — major position changes, new competitor entry, new business facts

Old quarterly snapshots are archived (renamed `STAYFUL__current__priorities-baseline-competitors_Q1-2026.md`) for trend analysis.

---

## Related files

- `CORE__06_measurement__gsc-baseline-and-priority-matrix.md` — universal baseline framework
- `CORE__06_measurement__pruning-and-indexation-audits.md` — quarterly audit process
- `CORE__06_measurement__update-cadence-and-triggers.md` — refresh cadence
- `STAYFUL__current__calculator-component.md` — calculator deployment status
- `STAYFUL__business__facts-and-positioning.md` — Stayful business facts (separate, but referenced for entity consistency)
