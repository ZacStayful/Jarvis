# Indexation Health Report — Template

**Scope: Universal.** The monthly indexation health report format.

Full process: `CORE__06_measurement__pruning-and-indexation-audits.md`

---

```
INDEXATION HEALTH — [Month Year]

Date generated:                          [YYYY-MM-DD]

=== Site-wide indexation ===

Total URLs in sitemap:                   [N]
URLs indexed (estimated, sample of 20–30): [N] ([percentage]%)
Sample method:                           [Random / Stratified / High-priority sample]

=== Movement this month ===

New pages published this month:          [N]
New pages indexed within 14 days:        [N]
New pages still pending indexation past 14 days: [N]

=== Cluster status ===

Clusters in GREEN status: [N]
Clusters in AMBER status: [list]
Clusters in RED status:   [list]

=== Recent indexation losses ===

(Pages indexed last month that are no longer indexed this month — sample check)
  - [URL] — possible cause: [diagnosis]

=== Action items this month ===

  - Run Decision Tree on [N] new pages pending past 14 days
  - Schedule consolidation work for [cluster] (AMBER → GREEN)
  - Schedule full pruning audit if next month's report shows continued AMBER → RED drift
  - [other action items]

=== Trend vs previous months ===

Indexation rate trend (last 3 months):   [%] → [%] → [%]
  ([Improving / Stable / Declining])

New-page indexation rate (last 3 months): [%] → [%] → [%]
  ([Improving / Stable / Declining])

=== Notes ===

[Any qualitative observations: e.g. "Indexation drop coincided with Core Update on [date]; monitoring for return to baseline."]
```

---

## How to use this template

1. First of every month, generate the report
2. Sample 20–30 URLs from the sitemap (mix of high-priority and random)
3. Run `site:[domain][/slug]` on each — record indexation
4. Calculate the indexation percentage
5. Cross-reference with last month's report for trend
6. Identify action items
7. Save the report
8. **Act on the action items in the same week**

The monthly cadence catches issues at the 2-week mark, when they're still cheap to fix.

---

## What to do with each section

### Indexation rate trend declining

- Out-of-cycle pruning sprint (don't wait for quarterly)
- Investigation for site-wide technical issue (sitemap errors, server issues, sudden noindex tag)
- Check GSC for any manual actions or notifications

### Indexation rate trend stable but low (<60%)

- Quarterly pruning continues to be the primary lever
- Consider whether the sitemap contains too many low-value URLs
- Consider whether external signals are weak (Layer 6 — outreach planning)

### New pages pending past 14 days

For each pending page:
- Run the Decision Tree (`CORE__07_indexation__decision-tree.md`)
- Fix the first failing layer
- Add to next month's tracker for re-check

### Clusters drifting to AMBER

- Schedule consolidation work this month if possible
- If not possible this month, mark for next quarter's pruning sprint
- Block new page work in those clusters until status is GREEN

### Clusters at RED

- Mandatory consolidation in the current month
- No new page work in those clusters under any circumstance
- Run a deeper cluster audit per `CORE__06_measurement__pruning-and-indexation-audits.md` — cluster health audit

---

## What "indexed" means in the sample

For each sampled URL, run `site:[domain][/slug]`:

| Result | Interpretation |
|---|---|
| Result returned matching the URL | INDEXED |
| No result returned | NOT INDEXED |
| Different URL returned (e.g. parent path) | NOT INDEXED |
| Multiple results returned for variants | Investigate — possible cannibalisation |

GSC URL Inspection is more authoritative for individual URLs but slower for a sample of 20–30. The `site:` query is fast enough for the monthly cadence.

---

## Sample selection — recommended approach

Pick 20–30 URLs from a mix:

- 5 top-priority commercial pages (test that high-value pages are indexed)
- 5 recently published pages (test recent indexation)
- 5 cluster-fringe pages (test the weakest expected URLs)
- 5–10 random URLs (control sample)

If specific concerns drive the sample (e.g. a recent technical change), focus the sample on the relevant URL subset.

---

## Why monthly is the right cadence

- **Weekly:** too frequent — Google's indexation system has variability that produces noisy weekly data
- **Monthly:** right balance — variance smooths out, action items are actionable in the same month
- **Quarterly:** too infrequent — issues compound from 30 days to 90 days, getting harder to fix

For large sites (5,000+ URLs), monthly sample-based reporting is the standard. For small sites (<200 URLs), monthly full-sitemap check is feasible.

---

## Common failures

### Failure 1 — Generating the report but not acting

The most common failure. The report exists to trigger action. If the same "8 pages pending past 14 days" appears month after month, the report is metric-only, not workflow.

### Failure 2 — Sample selection bias toward high-priority pages

If the sample is only high-priority pages, the indexation rate will look better than reality. Mix in cluster-fringe pages and random samples.

### Failure 3 — Inferring trend from a single month

A month-over-month change of ±5% can be noise. Look at 3-month trend, not single-month.

### Failure 4 — Treating "Discovered — currently not indexed" as resolved

GSC URL Inspection sometimes shows "Discovered" pages as if they're queued for indexation. They often aren't. Treat any pending-past-14-day page as a Decision Tree candidate.

### Failure 5 — Ignoring indexation losses

A page that was indexed last month and isn't this month is a meaningful signal. It may have been deprioritised by Google. Investigate.

---

## Related files

- `CORE__06_measurement__pruning-and-indexation-audits.md` — process
- `CORE__07_indexation__decision-tree.md` — what to fix for pending pages
- `CORE__07_indexation__workflow-operating-rhythm.md` — monthly cadence in the broader workflow
- `TEMPLATE__pruning-report.md` — quarterly companion report
