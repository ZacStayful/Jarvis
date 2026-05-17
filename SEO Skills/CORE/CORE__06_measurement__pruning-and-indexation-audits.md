# Pruning Audits and Indexation Health Reports

**Scope: Universal.** Two recurring audits: the quarterly pruning audit (mandatory) and the monthly indexation health report. Both produce structured outputs that inform the next quarter's work allocation.

---

## Quarterly Pruning Audit (mandatory)

Once per quarter, dedicate one full session to pruning. **No new pages. No Phase 2 rewrites. Only consolidation.**

### Why quarterly is mandatory

Without scheduled pruning, weak pages accumulate. The cumulative drag on domain-level quality compounds. Sites that don't prune quarterly typically see:

- Indexation rate drop from 80%+ to 50–60% over 18 months
- Domain quality signals erode, pulling strong pages with them
- Cannibalisation accumulate to AMBER/RED across multiple clusters
- Budget gets spread thin across too many candidates

A quarterly pruning session is a forcing function that prevents this drift.

### Process

#### Step 1 — Export the full sitemap

Pull every URL from `[domain]/sitemap.xml` into a working list.

#### Step 2 — Check indexation status

For each URL, run `site:[domain][/slug]` and record:

- INDEXED
- NOT INDEXED (live 90+ days without indexation)
- EXCLUDED INTENTIONALLY

Focus the audit on the second group.

#### Step 3 — Classify each flagged URL

Into one of four buckets (full criteria in `CORE__07_indexation__pruning-framework.md`):

- **Bucket 1 — Keep and fix** — unique high-impression query, fewer than 3 cluster siblings
- **Bucket 2 — Consolidate via 301** — 3+ cluster siblings OR served by another page
- **Bucket 3 — Repurpose** — genuine topical interest but wrong shape
- **Bucket 4 — Delete or ignore** — tag archives, case studies, system aliases

#### Step 4 — Output the pruning report

Use the format in `TEMPLATE__pruning-report.md`:

```
PRUNING REPORT — Q[X] [YEAR]

Bucket 1 — Keep and fix (count: N)
  [URL] — [primary keyword] — [first failing layer from Decision Tree]
  ...

Bucket 2 — Consolidate via 301 (count: N)
  [URL] — 301 to [target URL] — reason
  ...

Bucket 3 — Repurpose (count: N)
  [URL] — current angle / proposed angle
  ...

Bucket 4 — Delete or ignore (count: N)
  [URL] — reason (alias / tag archive / case study / file download)
  ...

Priority order for execution:
  1. Bucket 2 first (highest volume, lowest effort, highest domain-quality impact)
  2. Bucket 1 (Indexation Decision Tree fixes)
  3. Bucket 3 (selective)
  4. Bucket 4 (ignore unless cluttering reports)
```

#### Step 5 — Execute in priority order

**Bucket 2 first.** Highest volume, lowest effort, highest domain-quality impact. A 301 is a one-line change in the CMS that recovers indexation budget immediately. Many Bucket 2 fixes can be done in a single afternoon.

**Bucket 1 second.** Apply the Indexation Decision Tree to each. Time-consuming but targeted.

**Bucket 3 third.** Selective rewrites only where the topical opportunity is real.

**Bucket 4 last.** Often safe to ignore — these are rarely damaging if Google has correctly excluded them.

### Quarterly cycle for the pruning report

Q1 (Jan–Mar): full audit during Q1 week 2
Q2 (Apr–Jun): full audit during Q2 week 2
Q3 (Jul–Sep): full audit during Q3 week 2
Q4 (Oct–Dec): full audit during Q4 week 2 + annual full Phase 1 re-audit of top priority pages

---

## Monthly Indexation Health Report

Once per month, output a short structured report. Faster than a full pruning audit; serves as an early-warning system.

### Format

```
INDEXATION HEALTH — [Month Year]

Total URLs in sitemap: [N]
URLs indexed (estimated from sample of 20–30): [N] ([percentage]%)
New pages indexed this month: [N]
New pages still pending indexation past 14 days: [N]
Clusters in AMBER or RED status: [list]

Action items this month:
  - [item]
  - [item]
```

Template: `TEMPLATE__indexation-health-report.md`

### What to do with the report

Review the trend month-over-month:

- Indexation percentage falling → schedule out-of-cycle pruning
- New pages pending indexation past 14 days → run Indexation Decision Tree on each
- Clusters drifting to AMBER → schedule cluster consolidation
- Sudden indexation drop → investigate (often a site-wide technical issue, sometimes a Google update)

### Why monthly cadence

Indexation issues compound. A page stuck at "Discovered — currently not indexed" for 2 weeks is mostly a structural fix away from indexing. The same page at 6 months is a pruning candidate.

Monthly checkpoints catch issues at the 2-week mark, when they're still cheap to fix.

---

## Cluster Health Audit (Quarterly)

For each city cluster (or topical cluster) with 3+ pages, output:

```
CLUSTER: [City name]
Total URLs in sitemap: [N]
Currently indexed: [N] ([percentage]%)

URLs by primary intent:
  - Management service: [count]
  - Income/calculator: [count]
  - Specialist (cohost/setup/etc.): [count]
  - Other: [count]

Cannibalisation status: GREEN (≤3 intents) / AMBER (4–5) / RED (6+)

Pruning candidates: [list URLs]

Action priority: [Defend / Strengthen / Consolidate / Rebuild]
```

If status is AMBER or RED, **no new page work on that cluster until consolidation reduces it to GREEN.**

---

## How these audits connect to the broader workflow

| Audit | Cadence | Triggers |
|---|---|---|
| Monthly Indexation Health | Monthly | Out-of-cycle pruning if indexation falls; Indexation Decision Tree runs on pending pages |
| Quarterly Pruning Audit | Quarterly | Bucket 1 → Indexation Decision Tree; Bucket 2 → 301s; Bucket 3 → Repurpose; Bucket 4 → Ignore/noindex |
| Quarterly Cluster Health | Quarterly | AMBER/RED clusters → consolidation; GREEN clusters → eligible for Phase 0 on new pages |

The three audits together provide:

- Monthly: leading indicators (something about to fail)
- Quarterly: lagging indicators (what failed and what should now be done about it)
- Quarterly: cluster-level structural assessment

---

## Common failures

### Failure 1 — Skipping the quarterly audit "just this once"

Domain quality degrades silently. Two missed quarters of pruning is often the gap between a healthy 80% indexation rate and a struggling 55% rate.

### Failure 2 — Doing the audit but not executing

Producing the report, identifying 30 Bucket 2 consolidations, then not implementing the 301s. The audit is wasted; the drag continues.

### Failure 3 — Re-prioritising new builds over Bucket 2 work

Bucket 2 work feels less exciting than building new pages, but it's higher-leverage. A quarter of 30 redirected URLs typically lifts the entire domain. A quarter of 3 new pages may not produce equivalent impact.

### Failure 4 — Treating the monthly report as informational

The report exists to trigger action. If "new pages pending indexation past 14 days" sits at 8 month after month, the report is a metric, not a workflow. Each pending page should be diagnosed via Decision Tree the same week.

### Failure 5 — Re-auditing the same cluster without remediating in between

Quarterly review notes Bradford cluster at AMBER. Next quarter, same note. The audit caught the issue but the org didn't act. The cluster has now been at AMBER for 90+ days, accruing damage.

---

## How this applies to non-Stayful websites

Pruning audit, indexation health report, and cluster health audit are universal.

For an e-commerce site: clusters are product categories or product attribute combinations. AMBER/RED indicates SKU pages targeting the same intent.

For SaaS: clusters are use-case landings, integration pages, or feature pages. AMBER/RED indicates overlapping conversion pages.

For publishers: clusters are topic hubs. AMBER/RED indicates redundant articles on the same sub-topic.

The four-bucket framework, three-audit cadence, and execution priority apply equally.

---

## Related files

- `CORE__07_indexation__pruning-framework.md` — four-bucket framework full detail
- `CORE__07_indexation__decision-tree.md` — what to fix for Bucket 1 pages
- `CORE__07_indexation__workflow-operating-rhythm.md` — day-to-day rhythm including these audits
- `TEMPLATE__pruning-report.md` — pruning report template
- `TEMPLATE__indexation-health-report.md` — monthly health report template
