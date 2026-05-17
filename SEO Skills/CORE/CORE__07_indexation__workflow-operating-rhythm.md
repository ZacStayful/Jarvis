# Workflow Operating Rhythm

**Scope: Universal.** To make day-to-day work efficient — and to prevent indexation and cannibalisation problems from accumulating — adopt this operating rhythm.

This rhythm is what the engine looks like when applied consistently. Each item compounds over months.

---

## The "should this exist?" prompt

Before any new page concept is discussed, the standard first prompt is:

> "Run Phase 0 on [concept]."

The output is a one-paragraph go/no-go decision per `CORE__02_phase-0__should-this-page-exist.md`.

This prompt prevents wasted effort earlier in the funnel. It changes the conversation from "let's build a page about X" to "should a page about X exist?"

Apply it:

- For every proposed new page (no exceptions)
- For every "let's expand the cluster" suggestion
- For every "we should have a page about [topic]" idea

The Phase 0 documentation also serves as the audit trail. Six months later, you can answer "why did we build this page?" with the specific Criterion A/B/C it passed.

---

## The two-page rule for new clusters

When building a new city or topic cluster:

**Build only the primary service page.**

Wait for impression data. Build the second page on data — not on the framework.

The instinct to pre-build five pages per city is wrong and produces the cannibalisation patterns that have to be cleaned up later.

The data-driven sequence:

```
Week 0 — Publish primary service page only
Week 4–6 — Check GSC
   If 100+ impressions AND specific supporting query showing → build second page
   If not → strengthen primary page (Phase 2 on existing URL)
Week 10–12 — Check GSC again
   If specialist query showing impressions AND Criterion A/B/C passes → build third page (max)
   If not → stop. Two pages is enough.
```

This sequence is the antidote to the framework instinct. Frameworks tell you what kinds of pages are possible. Data tells you which ones earn their place.

---

## The quarterly pruning sprint

Once per quarter, dedicate a session entirely to the Pruning Audit (`CORE__06_measurement__pruning-and-indexation-audits.md`).

**No new pages. No Phase 2 rewrites. Just consolidation, 301s, cluster cleanup.**

Often the highest-leverage week of the quarter.

Process:

1. Export sitemap
2. Indexation check on every URL
3. Four-bucket classification on non-indexed pages 90+ days old
4. Execute Bucket 2 (301 consolidations) first — often half a day of work
5. Schedule Bucket 1 (Decision Tree fixes) for the next 2 weeks
6. Document Bucket 3 candidates for next quarter
7. Mostly ignore Bucket 4

The quarterly cadence prevents the slow drift that accumulates over years.

---

## The monthly Indexation Health Report

Once per month, output the report format from `CORE__06_measurement__pruning-and-indexation-audits.md`:

```
INDEXATION HEALTH — [Month Year]

Total URLs in sitemap: [N]
URLs indexed (estimated from sample of 20–30): [N] ([percentage]%)
New pages indexed this month: [N]
New pages still pending indexation past 14 days: [N]
Clusters in AMBER or RED status: [list]

Action items this month:
  - ...
```

Action on the report:

- New pages pending indexation past 14 days → Decision Tree on each (this week)
- Clusters drifting to AMBER → schedule consolidation (this month)
- Indexation percentage falling → schedule out-of-cycle pruning (this month)

The monthly cadence catches issues at the 2-week mark, before they become 90-day pruning candidates.

---

## The 24h checklist after every publish

Within 24 hours of publishing any new page, run `CORE__02_phase-2__post-publication-indexation-checklist.md`:

- Verify URL in sitemap
- Confirm navigation placement
- Confirm 3+ contextual links from indexed pages
- Submit to GSC for indexing

24 hours is enough time to catch every Layer 1 and Layer 2 failure before they cost weeks.

---

## The annual full-site re-audit

Once per year, re-run Phase 1 on every Tier 1 and Tier 2 priority page (`CORE__06_measurement__gsc-baseline-and-priority-matrix.md`).

Schedule for Q4. Combine with:

- Annual competitor gap matrix refresh
- Annual outbound authority link verification
- Annual lead profile review (have profiles shifted?)
- Annual priority keyword cluster review (have priorities shifted?)

The annual cycle is the strategic reset.

---

## The full operating calendar

| Activity | Cadence | Time required |
|---|---|---|
| Phase 0 on every new concept | As needed | 5 minutes per concept |
| Phase 1 audit on existing page | As needed | 1–2 hours per page |
| Phase 2 work on Tier 1 priority pages | Continuous | Variable |
| 24h post-publish indexation check | Per publish | 15 minutes |
| Monthly indexation health report | Monthly | 30 minutes |
| Quarterly pruning sprint | Quarterly | 1 full day |
| Quarterly competitor baseline refresh | Quarterly | 1 hour |
| Quarterly cluster health audit | Quarterly | 2 hours |
| Quarterly content refresh (priority pages) | Quarterly | 30 min per page × ~20 pages |
| Annual full Phase 1 re-audit | Annually | 1 full week |

Total recurring overhead: ~2 days per quarter for measurement + maintenance, plus ongoing Phase 1/Phase 2 work driven by audit findings.

This is sustainable. It produces the engine running in steady state.

---

## What this rhythm prevents

- **Indexation backlogs.** Monthly health report catches new pages stuck at 14 days. Quarterly pruning catches accumulated old pages.
- **Cannibalisation drift.** Quarterly cluster audit catches AMBER/RED status. Phase 0 prevents new pages adding to existing pressure.
- **Stale content.** Quarterly content refresh keeps dateModified, figures, and PAA current.
- **Competitive blindness.** Quarterly competitor baseline catches new entrants. Annual full re-audit catches structural competitive shifts.
- **Domain quality decay.** Pruning sprints prevent the slow accumulation of weak pages that drag down sitewide signals.

---

## What this rhythm does NOT prevent

- Algorithmic disruption from Core Updates (those produce noise that resolves on its own)
- Major external events (a new entrant with structurally better proof, a regulatory change that shifts the market)
- Brand-level reputation events (negative reviews, PR incidents)

The rhythm is operational hygiene. It produces a healthy steady state. It does not solve strategic problems — those still require deliberate top-down decisions.

---

## Common failures in adopting the rhythm

### Failure 1 — Skipping Phase 0 because the concept is "obviously good"

The cost of running Phase 0 on a concept that passes is 5 minutes. The cost of skipping Phase 0 on a concept that should have failed is a quarter of wasted work.

### Failure 2 — Treating the monthly report as informational

The report exists to trigger action. If the same "8 pages pending indexation past 14 days" appears month after month, the report is being read but not acted on.

### Failure 3 — Skipping the quarterly pruning sprint for "more important work"

Pruning IS the more important work. New pages and Phase 2 rewrites on indexed pages produce smaller marginal lift than pruning on a site with backlog.

### Failure 4 — Doing the annual re-audit but not implementing findings

The annual audit produces a long list of changes. Without scheduled time to implement them, the list becomes shelfware. Block calendar time in Q1 for the audit's recommendations.

### Failure 5 — Running the rhythm but not measuring its impact

Track the same metrics quarter over quarter:

- Indexation rate (sample-based)
- Average position
- CTR by tier
- Conversion / lead volume

If the rhythm is working, these numbers improve quarter over quarter. If they don't, the rhythm needs adjustment — but you can't tell unless you're measuring.

---

## How this applies to non-Stayful websites

The rhythm is universal. Specific frequencies adapt to site scale:

| Site size | Pruning sprint | Indexation report | Phase 1 re-audit |
|---|---|---|---|
| <50 URLs | Quarterly | Monthly | Annually |
| 50–500 URLs | Quarterly | Monthly | Annually (top 20% of URLs) |
| 500–5,000 URLs | Quarterly per major section | Monthly | Annually (top 10% by traffic) |
| 5,000+ URLs | Monthly per section | Weekly | Continuous (rolling) |

The principle (audits trigger action, action is executed against scheduled time) applies in every case.

---

## Related files

- `CORE__02_phase-0__should-this-page-exist.md` — the should-this-exist prompt
- `CORE__01_strategic__pages-earn-their-place.md` — the two-page rule and cannibalisation hard limit
- `CORE__06_measurement__pruning-and-indexation-audits.md` — quarterly and monthly audit formats
- `CORE__06_measurement__update-cadence-and-triggers.md` — full update cadence including event triggers
- `CORE__07_indexation__decision-tree.md` — what to run when health report flags pending pages
- `CORE__07_indexation__pruning-framework.md` — what to run during the quarterly pruning sprint
