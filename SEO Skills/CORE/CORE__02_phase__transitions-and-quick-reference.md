# Phase Transitions and Quick Reference

**Scope: Universal.** Rules for moving between phases, plus a one-table quick reference of what each phase produces.

---

## Phase transition rules

| From | To | Trigger |
|---|---|---|
| (new concept) | Phase 0 | Any new page concept is proposed |
| Phase 0 | Phase 1 | All three Phase 0 questions pass; existing page audit triggered |
| Phase 1 | Phase 2 | Explicit user instruction: "write Phase 2", "continue", "write the fixes" |
| Phase 2 | Phase 3 | Explicit instruction: "write the cluster pages", "build Phase 3" — AND four pre-conditions met |
| (any time) | Pruning | Indexation failure, cannibalisation, or quarterly cadence |

Key rules:

- **Phase 0 must pass before Phase 1.** If Phase 0 fails, no Phase 1 audit runs.
- **Phase 2 only runs on explicit instruction.** Never start writing HTML automatically after delivering a Phase 1 audit.
- **Phase 3 only runs on explicit instruction AND four pre-conditions.** See `CORE__02_phase-3__cluster-supporting-pages.md`.
- Each phase can be requested independently.
- "Run the full SEO engine" executes Phases 0 → 1 → 2 → 3 (where applicable) sequentially.

---

## What each phase produces — quick reference

| Phase | Trigger | Output |
|---|---|---|
| **Phase 0** | New page concept proposed | Go/no-go decision with documented criterion passed (A/B/C), cluster status, and indexed source page count |
| **Phase 1** | URL provided for existing page | Audit report including indexation status diagnostic, competitor gap matrix, keyword gaps, schema gaps, citation gaps, PAA gaps, meta assessment, uplift recommendation |
| **Phase 2** | "Write Phase 2" | Self-contained HTML blocks: schema, answer capsule, uplift (if recommended), Sections A–K, FAQ in lead language, worst-case framing, NAP block, meta rewrites + Content Quality QA Checklist + Post-Publication Indexation Checklist |
| **Phase 3** | "Build cluster pages" — only if four pre-conditions met | Full page HTML for each new cluster page with primary lead profile, meta data, internal linking map by tier, Post-Publication Indexation Checklist |

---

## File map — which file documents each phase

| Phase | Primary file(s) |
|---|---|
| Phase 0 | `CORE__02_phase-0__should-this-page-exist.md` |
| Phase 1 | `CORE__02_phase-1__audit-methodology.md`, `CORE__02_phase-1__competitor-and-keyword-research.md`, `CORE__02_phase-1__audit-report-format.md` |
| Phase 2 | `CORE__02_phase-2__canonical-section-order-and-html-additions.md`, `CORE__02_phase-2__schema-rules.md`, `CORE__02_phase-2__content-quality-qa-checklist.md`, `CORE__02_phase-2__geo-ai-overview-checklist.md`, `CORE__02_phase-2__post-publication-indexation-checklist.md` |
| Phase 3 | `CORE__02_phase-3__cluster-supporting-pages.md` |

---

## Common transition failures

### Failure 1 — Phase 1 to Phase 2 without explicit instruction

After delivering a Phase 1 audit, the engine should pause and wait. Producing Phase 2 HTML automatically can flood the conversation, override user priorities, or apply fixes the user hasn't yet approved.

The closing line of every Phase 1 audit is:

> "Phase 1 complete. Ready to begin Phase 2 — HTML fixes and additions. Type 'write Phase 2' to continue, or ask questions about the audit first."

### Failure 2 — Phase 2 to Phase 3 without pre-condition check

Skipping the four pre-conditions and producing a county hub or specialist page is the most common Phase 3 misuse. The output may look complete but the page will struggle to index because the cluster wasn't ready.

### Failure 3 — Skipping Phase 0 on new page concepts

Treating every new page request as if Phase 0 has implicitly passed. Phase 0 documentation must be produced and recorded even when the engine is confident the page should exist. The documentation is the audit trail; it prevents "we built it because the framework said so" decisions.

### Failure 4 — Running the wrong phase

When a page is failing to rank, the natural request is "Phase 2 it." But if the page is not indexed, Phase 2 content fixes don't help. The right response is to first run the Indexation Decision Tree (`CORE__07_indexation__decision-tree.md`) and only run Phase 2 after structural issues are resolved.

### Failure 5 — Treating "rewrite this page" as Phase 2

Sometimes the right action is a 301 consolidation, not a rewrite. The Phase 1 audit identifies this — if cluster cannibalisation is RED or the page fails the Pages That Earn Their Place test, the action is 301, not Phase 2.

---

## Operating rhythm

Day-to-day phase usage:

| Activity | Phase | Cadence |
|---|---|---|
| New page concept | Phase 0 | As needed |
| Existing page audit | Phase 1 → Phase 2 | As needed |
| Cluster expansion | Phase 0 → Phase 3 | Quarterly, data-driven |
| Quarterly site cleanup | Pruning framework | Quarterly |
| Monthly indexation check | Indexation health report | Monthly |
| Annual full re-audit | Phase 1 on priority pages | Annually |

Full operating rhythm: `CORE__07_indexation__workflow-operating-rhythm.md`
