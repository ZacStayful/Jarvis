# Indexation Principles

**Scope: Universal.** These principles govern how to think about Google indexation on any website. They are the foundation for every other SEO decision in this knowledgebase.

---

## Principle 1 — Indexation is a separate quality gate from ranking

A page that meets every quality threshold for ranking can still fail to be indexed by Google. Indexation has its own thresholds, independent of ranking.

A page can have:
- Correct schema
- A 50–70 word answer capsule
- Every objection handled
- Real local data
- Three expert-insight markers
- A clean technical audit

— and still sit in "Crawled — currently not indexed" indefinitely.

The reason is rarely the page itself in isolation. It is usually one of four things:

1. **Templated shape.** Content within the page is unique, but the page-level structure (same components, same intro pattern, same FAQ pattern) appears across dozens of sibling pages. Google's index applies a "is this distinct enough" check that templated pages frequently fail.
2. **Redundant intent.** Another page on the same domain already covers the same primary intent. From the searcher's point of view, the first page satisfies the query.
3. **Domain-level signal weakness.** Indexation budget is allocated based on site authority, backlinks, brand mentions. Page-level quality cannot expand this budget.
4. **Weak internal link signal.** Pages without sitewide nav links and without contextual links from already-indexed pages have to clear a higher quality bar.

### The mental model

**Indexation is a separate exam.** You can be top of the class in the ranking exam and still fail the indexation exam if you don't sit it specifically.

The fix-list for an unindexed page is different from the fix-list for a low-ranking indexed page. See `CORE__07_indexation__vs-ranking-mental-model.md` for the full elaboration.

---

## Principle 2 — The Indexation Budget

Sites have a roughly fixed indexation budget allocated by Google based on:

- Domain authority
- External signals (backlinks, brand mentions)
- Site quality history

### Implications

1. **Quality of indexed pages matters more than quantity attempted.** Forty strong indexed pages typically outperform two hundred pages of which only forty are indexed. The 160 non-indexed pages are not neutral — they pull down domain-quality signals while contributing zero ranking value.
2. **The budget is shared across all clusters.** Spending it on weak permutations means less budget for strong commercial pages.
3. **Pruning increases available budget.** When 30 unindexed pages are removed via 301 consolidation, the domain's overall signal improves and the remaining strong pages benefit.
4. **External signals expand the budget. On-page work alone cannot expand it.** This is the single most counter-intuitive fact about indexation. You can write the perfect page; if your domain has no external validation, Google may not index it.

### The gate before every new page

Before any new page is built — or any Phase 2 pass is started on an existing low-priority page — ask:

> "Is this the highest-value way to spend a slot of our indexation budget right now?"

If the answer is no, the work should not happen.

This is the budget framing. Every page is a slot. Slots have opportunity cost. Building a fourth `[city]-cohost` page uses a slot that could have indexed the actual city service page.

---

## Why on-page improvements alone often fail to fix indexation

Common pattern: a page is not indexed. The instinct is to "improve the content" — add more sections, more FAQ, more schema, more keywords. None of it works.

The reason: the bottleneck is one of the four causes above (templated shape, redundant intent, domain signal, internal link signal), not page quality. Adding more good content to a page that already has good content doesn't fix any of those four causes.

The right action sequence when a page is not indexed:

1. Layer 1–4 of the Indexation Decision Tree (`CORE__07_indexation__decision-tree.md`)
2. If Layers 1–4 are clean: check distinctiveness (Layer 5) — is the page templated to look like its siblings?
3. If still failing: external signals (Layer 6) — does the domain or page have any external validation?

Only AFTER all six layers are checked should content-level rewrites be considered. And even then, the rewrite target is distinctiveness (different structure, different supporting content, different angle) — not "more of the same."

---

## What this means in practice

- Never assume Phase 2 content work alone will fix an indexation problem.
- Never report a Phase 2 build as complete without running the Post-Publication Indexation Checklist.
- Never rely on the "internal cluster will boost the main page" theory when the cluster siblings are themselves not indexed — Tier 4 links carry near-zero weight (`CORE__01_strategic__navigation-and-internal-linking.md`).
- Always treat indexation status as the first question in any page audit (`CORE__00_quickstart__audit-existing-page.md`).

---

## How this applies to a non-Stayful website

These principles are domain-neutral. They apply equally to:

- An e-commerce site with 2,000 product URLs of which 600 are indexed
- A SaaS site with 50 landing pages of which 35 are indexed
- A local services site with 80 location pages of which 30 are indexed
- A publisher with 10,000 articles of which 4,000 are indexed

In every case, the playbook is the same: confirm indexation as a separate exam, treat indexation budget as a finite resource, prune what isn't earning its slot, build external signals to expand the budget.
