# Pruning Report — Template

**Scope: Universal.** The quarterly pruning report format.

Full process: `CORE__06_measurement__pruning-and-indexation-audits.md`
Framework: `CORE__07_indexation__pruning-framework.md`

---

```
PRUNING REPORT — Q[X] [YEAR]

Date generated:                [YYYY-MM-DD]
Total URLs reviewed:           [N]
URLs indexed:                  [N] ([percentage]%)
URLs not indexed (live 90+ days): [N]
URLs excluded intentionally:    [N]

=== Bucket 1 — Keep and fix (count: N) ===

[URL] — primary keyword: [keyword] — first failing layer: [Layer N from Decision Tree]
  Recommended action: [specific Phase 1 / Decision Tree action]

[URL] — primary keyword: [keyword] — first failing layer: [Layer N]
  Recommended action: ...

...

=== Bucket 2 — Consolidate via 301 (count: N) ===

[URL] — 301 to [target URL]
  Reason: [duplicate intent / cluster sibling / same primary keyword]

[URL] — 301 to [target URL]
  Reason: ...

...

=== Bucket 3 — Repurpose (count: N) ===

[URL]
  Current angle: [primary keyword and intent]
  Proposed angle: [different keyword / different intent the page should target]
  Reason for repurpose: [demand pattern evidence]

...

=== Bucket 4 — Delete or ignore (count: N) ===

[URL] — reason: [alias / tag archive / case study / file download / abandoned draft]

...

=== Execution priority ===

1. Bucket 2 first — count: [N] — estimated time: [hours]
2. Bucket 1 — count: [N] — estimated time: [hours]
3. Bucket 3 — count: [N] — estimated time: [hours]
4. Bucket 4 — skip unless cluttering reports

=== Estimated indexation budget recovered ===

URLs to 301: [N from Bucket 2]
URLs to noindex (Bucket 4 if cleaning up): [N]
Total budget recovery: ~[N] URL slots

=== Cluster-level summary ===

Clusters newly at GREEN (after Bucket 2 work): [list]
Clusters still at AMBER post-Bucket 2: [list — action: more consolidation next quarter]
Clusters still at RED post-Bucket 2: [list — action: full cluster rebuild]

=== Trend vs. previous quarter ===

URLs indexed: [N this quarter] vs. [N last quarter] — [+/- delta]
URLs reviewed: [N this quarter] vs. [N last quarter]
Buckets shrinking: [list — sign of improvement]
Buckets growing: [list — sign of issues]
```

---

## How to use this template

1. Run the quarterly pruning audit per `CORE__06_measurement__pruning-and-indexation-audits.md`
2. Classify each non-indexed URL into one of the four buckets
3. Fill in the template
4. Execute in priority order (Bucket 2 first, always)
5. Save the report — it's both the action plan and the audit trail

After execution, archive the report (rename to `pruning-report_Q[X]-[YEAR]_completed.md`) and track which actions were taken vs. proposed.

---

## What "completed" means

A pruning report is complete when:

- Every Bucket 2 URL has been 301'd
- Every Bucket 1 URL has had its Decision Tree run and the first failing layer fixed
- Every Bucket 3 URL has either been repurposed OR explicitly decided to leave for next quarter
- Every Bucket 4 URL has either been noindexed OR explicitly decided to leave

A report that produces 30 recommendations but only 3 actions taken is a failed report. The audit is meant to drive action.

---

## Execution checklist (Bucket 2 specifically)

For each Bucket 2 consolidation:

- [ ] Identify the strongest page in the cluster as the canonical target (best content, most links, highest impressions)
- [ ] Verify the source URL has no critical inbound external links the target page would lose context for
- [ ] Implement the 301 in the CMS
- [ ] Verify the 301 returns correct 301 status (not 302, not 200)
- [ ] Verify the target page receives the redirected traffic in GSC
- [ ] Update internal links across the site that pointed to the redirected URL (where feasible)
- [ ] Remove the redirected URL from the sitemap (if the CMS doesn't auto-handle)

Each Bucket 2 redirect typically takes 5–10 minutes including verification. A batch of 30 can be done in a single half-day session.

---

## Execution checklist (Bucket 1)

For each Bucket 1 page:

- [ ] Run the Indexation Decision Tree (`CORE__07_indexation__decision-tree.md`)
- [ ] Fix the first failing layer
- [ ] Wait 14 days
- [ ] Re-check indexation
- [ ] If still not indexed, escalate to next failing layer
- [ ] If still not indexed after Layers 1–4 are clean, full Phase 1 audit with distinctiveness check
- [ ] If still not indexed after 60 days post-remediation, demote to pruning candidate next quarter

---

## What this report does NOT capture

- Phase 2 content work on indexed-but-low-ranking pages (separate workflow)
- New page builds (separate workflow, Phase 0 gate first)
- Backlink outreach (separate workflow)
- CMS / hosting / infrastructure issues (separate diagnosis)

The report is specifically about indexation budget reclamation — pruning weak pages and fixing structurally-fixable indexation failures.

---

## Related files

- `CORE__06_measurement__pruning-and-indexation-audits.md` — quarterly process
- `CORE__07_indexation__pruning-framework.md` — four-bucket framework detail
- `CORE__07_indexation__decision-tree.md` — what to fix for Bucket 1 pages
- `CORE__07_indexation__workflow-operating-rhythm.md` — quarterly pruning sprint cadence
- `TEMPLATE__indexation-health-report.md` — monthly leading-indicator report
