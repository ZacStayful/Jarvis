# Phase 0 Decision — Template

**Scope: Universal.** The format for documenting a Phase 0 go/no-go decision on a new page concept.

Full Phase 0 detail: `CORE__02_phase-0__should-this-page-exist.md`.

---

```
PHASE 0 DECISION — [proposed page title or URL]

Date:                  [YYYY-MM-DD]
Proposed by:           [Person or context]
Page concept:          [One-sentence description of what the page would cover]
Target primary keyword: [keyword]

---

Question 1 — Pages That Earn Their Place test
  Criterion passed: [A / B / C / NONE]
  Reasoning:        [Paragraph explaining why this criterion is satisfied]

  Criterion A — Meaningfully different query intent
    Is this query meaningfully different from any existing page on the domain?
    [Y/N — and which existing page would otherwise serve this intent]

  Criterion B — External signal earning potential
    Could this page realistically attract backlinks, branded searches, or topical mentions?
    [Y/N — and what kind of external interest is anticipated]

  Criterion C — Content the main page cannot absorb without losing focus
    Would adding this content to the main page degrade clarity, length, or focus?
    [Y/N — and which main page would be affected]

---

Question 2 — Cluster cannibalisation status
  Query run:                  site:[domain] [cluster term]
  Overlapping-intent pages:   [N — with URLs listed]
  Status:                     [GREEN (≤3 intents) / AMBER (4–5) / RED (6+)]

  If AMBER or RED:
    Pruning required first.  See: CORE__07_indexation__pruning-framework.md
    Pages to consolidate before new build:
      - [URL] → 301 to [target URL]
      - [URL] → 301 to [target URL]

---

Question 3 — Indexed inbound link capacity
  Required:        3+ Tier 1 or Tier 2 source pages that are already indexed

  Source 1: [URL] — Tier [1/2] — anchor text: "[anchor]"
  Source 2: [URL] — Tier [1/2] — anchor text: "[anchor]"
  Source 3: [URL] — Tier [1/2] — anchor text: "[anchor]"

  (Anchor text varies per the variation rule — CORE__01_strategic__navigation-and-internal-linking.md)

---

DECISION: [PROCEED / DO NOT BUILD]

Reason: [If PROCEED — confirm all three questions passed. If DO NOT BUILD — state which question failed and the action.]

Next action: [If PROCEED — schedule Phase 1 / Phase 2 work. If DO NOT BUILD — what should happen instead (pruning, strengthening existing page, etc.)]
```

---

## How to use this template

1. Open before any conversation about a new page concept
2. Fill in the proposal section (top 4 lines)
3. Answer each question in writing — do not skip
4. Issue the DECISION line based on Q1 + Q2 + Q3 outcomes
5. Save the decision document — it's the audit trail

The discipline of writing forces clarity. Phase 0 decisions made verbally without this template tend to drift toward "yes" — which is how unjustified pages get built.

---

## Decision rules

| Q1 result | Q2 result | Q3 result | Decision |
|---|---|---|---|
| Passes A, B, or C | GREEN | 3+ indexed sources | **PROCEED** |
| Passes A, B, or C | GREEN | <3 indexed sources | Do not build — build supporting indexed pages first |
| Passes A, B, or C | AMBER or RED | Any | Do not build — prune cluster first |
| Fails (none of A/B/C) | Any | Any | **DO NOT BUILD** |

A single failure on any question is enough to block. Building anyway means accepting a high probability the page will fail to deliver.

---

## When to revisit a "DO NOT BUILD" decision

A Phase 0 decision can be revisited when the failing condition changes:

| Failure | Revisit when |
|---|---|
| Q1 fails (no criterion) | The page concept evolves to genuinely pass A, B, or C |
| Q2 fails (cluster status) | Cluster has been pruned to GREEN |
| Q3 fails (no indexed sources) | 3+ indexed source pages now exist that can link contextually |

Track "DO NOT BUILD" decisions over time — patterns emerge (e.g. consistently failing Q3 may indicate a broader sitewide indexation problem to address before any new builds).

---

## Common failures in Phase 0 documentation

### Failure 1 — Skipping Phase 0 because "obviously it should exist"

Cost of running Phase 0 when the answer is obvious: 5 minutes. Cost of skipping when the answer was actually no: a quarter of wasted work.

### Failure 2 — Claiming Criterion A or B without evidence

"It's a meaningfully different query" with no actual SERP check or PAA evidence. Write the specific evidence in the Reasoning field.

### Failure 3 — Claiming GREEN status without running the query

The Q2 query (`site:[domain] [cluster term]`) takes 30 seconds. Run it; record the result.

### Failure 4 — Listing source pages without confirming indexation

A "Tier 2 source page" that is itself not indexed is actually Tier 4. The Q3 check requires confirming indexation of each source page.

### Failure 5 — Recording the decision but not acting on it

A PROCEED decision that doesn't result in scheduled Phase 1/2 work, or a DO NOT BUILD decision that gets ignored later. The decision document IS the action trigger.

---

## Related files

- `CORE__02_phase-0__should-this-page-exist.md` — full Phase 0 rules
- `CORE__01_strategic__pages-earn-their-place.md` — Criterion A/B/C detail
- `CORE__01_strategic__navigation-and-internal-linking.md` — Tier definitions for Q3
- `CORE__07_indexation__pruning-framework.md` — what to do when Q2 fails
