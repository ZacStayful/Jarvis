# Phase 0 — Should This Page Exist?

**Scope: Universal.** Phase 0 is a hard gate. It runs before any Phase 1 audit on a new page concept and before any Phase 2 work on an existing page that fails to rank or to be indexed.

If the page does not pass Phase 0, no further phase runs. The single highest-leverage rule in this engine.

---

## When Phase 0 runs

| Trigger | Phase 0 runs? |
|---|---|
| New page concept proposed | **Yes — mandatory before Phase 1** |
| Existing page audit (page already indexed) | No — Phase 0 is skipped; the page exists already, the question is what to do with it |
| Existing page audit (page not indexed past 90 days) | **Yes — apply Phase 0 retroactively to decide if the page should exist at all** |
| Routine quarterly Phase 2 refresh on indexed strong page | No |

For retroactive application: if an existing non-indexed page fails Phase 0, the action is 301 consolidation into a canonical page, not a Phase 2 rewrite.

---

## The three questions

All three must pass to proceed. Answer in writing.

### Question 1 — Does this page pass the Pages That Earn Their Place test?

Open: `CORE__01_strategic__pages-earn-their-place.md`

State in writing which of the three criteria the page passes and why:

- **Criterion A** — Meaningfully different query intent (the searcher would expect different content than any existing page on the domain)
- **Criterion B** — External signal earning potential (the topic can realistically attract backlinks, branded searches, topical mentions)
- **Criterion C** — Content the main page cannot absorb without losing focus (adding it to the main page would degrade clarity, length, or focus)

If none pass, do not proceed.

If the answer is shaky — "kind of A" — default to **no**. Frameworks describe what to build when it earns its place; they do not authorise automatic builds.

### Question 2 — Is this cluster at or over the cannibalisation hard limit?

Run:

```
site:[domain] [city/topic]
```

Count pages with overlapping intent in the result list.

| Count | Status | Action |
|---|---|---|
| 0–3 | GREEN | Cluster is healthy; proceed |
| 4–5 | AMBER | Do not add new pages until consolidation reduces it to GREEN |
| 6+ | RED | Pruning is mandatory before any other action in this cluster |

If the cluster is at or over the limit, do not proceed. The cluster needs pruning before it can absorb a new page. Open: `CORE__07_indexation__pruning-framework.md`.

### Question 3 — Is there indexed inbound link capacity to support this page?

Identify at least three already-indexed pages that will provide contextual links to the new page. State which pages and what the anchor text will be.

For each candidate source page:

1. Confirm indexed via `site:[domain][/source-slug]`
2. Confirm it's Tier 1 (sitewide nav) or Tier 2 (indexed body link source) — see `CORE__01_strategic__navigation-and-internal-linking.md`

If you cannot identify three Tier 1/Tier 2 source pages, the new page will struggle to clear indexation regardless of quality. Either build the supporting indexed pages first, or do not proceed.

---

## Outcome

| Result | Action |
|---|---|
| All three questions pass | Proceed to Phase 1 audit (for an existing page) or to Phase 2 build (for a new page concept) |
| Any question fails | Do not build the page. Document the reason. Move on. |

This is the single highest-leverage rule in this entire engine. It prevents work that will not return value.

---

## Output format

Document Phase 0 decisions in this format:

```
PHASE 0 DECISION — [proposed page title or URL]

Question 1 — Pages That Earn Their Place:
  Criterion passed: [A / B / C / NONE]
  Reasoning: [...]

Question 2 — Cluster cannibalisation status:
  Query run: site:[domain] [cluster term]
  Overlapping-intent page count: [N]
  Status: [GREEN / AMBER / RED]

Question 3 — Indexed inbound link capacity:
  Source 1: [URL] — Tier [1/2] — anchor: "..."
  Source 2: [URL] — Tier [1/2] — anchor: "..."
  Source 3: [URL] — Tier [1/2] — anchor: "..."

DECISION: [PROCEED / DO NOT BUILD]
Reason: [...]
```

Save as part of the Phase 1 audit deliverable for full traceability.

Template available at: `TEMPLATE__phase-0-decision.md`

---

## Common failures

### Failure 1 — "The framework says we usually have one"

Pre-building a `cohost-[city]`, `setup-[city]`, or `[service]-cost-[city]` page because "the framework usually includes one." This is not a Criterion A/B/C pass. The framework describes what kinds of pages can exist; data and intent determine which ones should exist.

### Failure 2 — "Same intent, different keyword"

Building `airbnb-management-[city]` and `holiday-let-management-[city]` and `short-let-management-[city]` as separate pages. These are synonyms for the same intent. One page should exist; the others 301 in.

### Failure 3 — "We'll fix indexation later"

Building a new page in an AMBER or RED cluster on the assumption that the new page will somehow break through. It won't. Prune first, build second.

### Failure 4 — "The cluster will support itself"

Identifying three "source" pages for contextual links that are themselves not indexed. Tier 4 links carry near-zero weight. Closed loops between non-indexed pages do not produce indexation.

### Failure 5 — Phase 0 was skipped entirely

The most common failure. Phase 0 must run before Phase 1 on any new page concept. Skipping it is the single biggest source of wasted SEO work over time.

---

## What Phase 0 is NOT

- It is not a recommendation engine. It does not suggest what to build next.
- It does not assess content quality. That's Phase 1.
- It does not assess technical SEO. That's Phase 1.
- It does not assess competitive position. That's Phase 1.
- It is solely a go/no-go gate.

---

## How this applies to non-Stayful websites

The three questions are domain-neutral.

For an e-commerce site: "Do we need a separate URL for the 'red' colour variant of this product?" Apply Phase 0. Usually: no, that's a sort/filter, not a URL.

For a SaaS site: "Should we build a dedicated landing page for the new pricing tier?" Apply Phase 0. Only if it meaningfully differs from the main pricing page, has external signal potential, or has content the main page can't absorb.

For a publisher: "Should we publish a separate article for each of the 50 sub-topics in this guide?" Apply Phase 0. Almost always: no, until data shows specific sub-topic queries earning impressions.

The question "should this page exist?" is the most under-used question in SEO. Phase 0 makes it mandatory.
