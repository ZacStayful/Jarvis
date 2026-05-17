# Quickstart — Prune and consolidate

**Scope: Universal.** Removing weak pages can lift strong pages. For sites at scale, pruning is often higher-leverage than building.

---

## Why this matters

Domain-level quality is a real ranking factor. Helpful Content systems evaluate sites holistically — what proportion of the site's content is high-utility for searchers. If the proportion is poor, every page receives a small negative adjustment.

**Strategic implication: forty strong indexed pages typically outperform two hundred pages of which only forty are indexed.**

The indexation budget is shared across the whole site. Spending it on weak permutations means less budget for strong commercial pages. Pruning recovers that budget for what matters.

Background reading before you start: `CORE__07_indexation__vs-ranking-mental-model.md`.

---

## When to prune

| Trigger | Action |
|---|---|
| Quarterly cadence | Full pruning audit — dedicate one session |
| Before launching a new content vertical | Audit duplicate-intent pages in old vertical for 301 |
| Indexation health report shows >25% URLs non-indexed past 90 days | Run pruning audit out of cycle |
| Building any new page in a cluster classified as AMBER or RED | Prune first; do not add |

---

## The pruning process

### Step 1 — Export the sitemap

Pull the full URL list from `[domain]/sitemap.xml` into a working list.

### Step 2 — Check indexation status of every URL

For each URL, run `site:[domain][/slug]` and record:

- INDEXED
- NOT INDEXED (live 90+ days without indexation)
- EXCLUDED INTENTIONALLY

Focus the audit on the second group.

### Step 3 — Classify into four buckets

Open: `CORE__07_indexation__pruning-framework.md` for full criteria.

**Bucket 1 — Keep and fix.** Targets a unique high-impression query AND has fewer than 3 cluster siblings. Action: escalate to Phase 1 audit + Indexation Decision Tree.

**Bucket 2 — Consolidate via 301.** Has 3+ cluster siblings OR targets a query already served by another page. Action: 301 redirect into the canonical page. No content rebuild.

**Bucket 3 — Repurpose.** Has genuine topical interest but wrong shape. Action: rewrite to target a different query.

**Bucket 4 — Delete or ignore.** Tag archives, individual property pages, file downloads, system aliases. Action: noindex or leave.

### Step 4 — Output the pruning report

Open: `TEMPLATE__pruning-report.md` for the format.

```
PRUNING REPORT — Q[X] [YEAR]

Bucket 1 — Keep and fix (count: N)
  [URL] — [primary keyword] — [first failing layer from Indexation Decision Tree]

Bucket 2 — Consolidate via 301 (count: N)
  [URL] — 301 to [target URL] — reason

Bucket 3 — Repurpose (count: N)
  [URL] — current angle / proposed angle

Bucket 4 — Delete or ignore (count: N)
  [URL] — reason
```

### Step 5 — Execute in priority order

1. **Bucket 2 first.** Highest volume, lowest effort, highest domain-quality impact. A 301 is a one-line change in the CMS that recovers indexation budget immediately.
2. **Bucket 1 second.** Apply the Indexation Decision Tree.
3. **Bucket 3 third.** Selective rewrites only where the topical opportunity is real.
4. **Bucket 4 last.** Often safe to ignore — these are rarely damaging if Google has correctly excluded them.

---

## The specific banned patterns

These patterns are pruning targets by default. Consolidate via 301:

- `[city]` AND `[city]-cost` — cost content belongs on the primary page or a national cost hub
- `airbnb-management-[city]` AND `short-let-management-[city]` AND `holiday-let-management-[city]` AND `serviced-accommodation-management-[city]` — pick one; the rest are synonyms for the same intent
- `cohost-[city]` AND `setup-[city]` AND `yield-[city]` — almost never earn their place unless each has 50+ monthly searches AND serves a distinct lead profile
- `[city]` AND `in-[city]` — pure slug variants; one must 301 into the other

For other businesses applying the universal layer, identify equivalent same-intent slug variants in your domain. The pattern is "are these meaningfully different query intents, or are they synonyms?" If synonyms, pick one and consolidate.

---

## Mandatory before launching a new content vertical

If you're adding a new content vertical alongside an existing one (e.g. holiday-let-management city pages alongside Airbnb-management city pages), duplicate-intent pages in the older vertical MUST be reviewed for consolidation or 301 — either before, or no later than, the new vertical going live.

Skipping this guarantees cannibalisation at scale.

---

## What gets reported back to the user

- Total URLs reviewed
- Number indexed vs not indexed
- Counts per bucket
- Estimated indexation budget recovered (count of redirected/noindexed URLs)
- Highest-priority Bucket 2 consolidations (top 10)
- Recommendations for which clusters need full attention

---

## When not to prune

- Pages live <90 days — too early to call indexation failure. Apply the post-publication indexation checklist (`CORE__02_phase-2__post-publication-indexation-checklist.md`) first.
- Pages that are non-indexed but generating brand search or referral traffic — investigate before removing.
- Pages serving a legitimate distinct lead profile even if they share keyword overlap — Phase 0 Criterion C may apply.

---

## Related reading

- `CORE__07_indexation__pruning-framework.md` — four-bucket framework full detail
- `CORE__07_indexation__decision-tree.md` — what to fix for Bucket 1 pages
- `CORE__06_measurement__pruning-and-indexation-audits.md` — quarterly cadence and reporting formats
- `CORE__01_strategic__pages-earn-their-place.md` — the test that a page must pass to exist at all
- `CORE__07_indexation__workflow-operating-rhythm.md` — the operating rhythm that prevents pruning from being needed at scale
