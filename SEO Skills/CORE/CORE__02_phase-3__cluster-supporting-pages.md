# Phase 3 — Cluster Supporting Pages

**Scope: Universal.** Phase 3 is the most-revised section in v2.0. Older versions implied you could pre-build cluster pages once the main page existed. **That assumption is now wrong on a site with cannibalisation pressure.**

---

## Site-level quality — cluster health rules

These four rules govern every Phase 3 decision:

1. **No page in the cluster should be thinner than the weakest competitor page for that keyword.**
2. **Stub pages and placeholder pages must not go live.**
3. **Supporting pages must be genuinely supporting** — adding coverage the main city page does not already provide.
4. **The cluster is only as strong as its weakest page.**

If a proposed Phase 3 page would violate any of these four rules — including by introducing a page weaker than existing cluster siblings — the work should not happen.

---

## Pre-conditions — all four must be true before Phase 3 runs

1. **The cluster's main page is indexed.** Verified via `site:` query.
2. **The cluster's cannibalisation status is GREEN** (≤3 intents). See `CORE__01_strategic__pages-earn-their-place.md`.
3. **The main page has earned at least one cluster-level signal:**
   - 100+ monthly impressions in GSC, OR
   - A confirmed PAA gap that no existing page serves
4. **The supporting page candidate has passed Phase 0** (`CORE__02_phase-0__should-this-page-exist.md`).

If any condition fails, do not run Phase 3. The right action is either main-page strengthening (Phase 2 on the existing main page) or cluster pruning (`CORE__07_indexation__pruning-framework.md`).

---

## When Phase 3 is appropriate

- A specific high-impression query exists that the main page cannot absorb without losing focus
- A specific lead profile is under-served by the main page (e.g. buyer-intent / purchase validation queries on a service page)
- A regional or county-level hub is genuinely missing AND the geographic scope would dilute the main page

## When Phase 3 is NOT appropriate (common misuse)

- Building a `cohost-[city]` or `setup-[city]` page because the framework "usually" has one
- Building a `holiday-let-management-[city]` page when `airbnb-management-[city]` already exists (same intent — synonyms)
- Building a county hub before any city in the county has earned impression data
- Building "framework completeness" without query data backing each page

---

## Phase 3 build priority (when justified)

In order:

1. **County hub page** — only if you manage properties in 3+ towns in the county AND the county-level query has 50+ monthly searches
2. **Income / calculator / data landing for the city** — only if `how much can I earn from [thing] in [city]` shows 30+ monthly impressions in GSC for the main page
3. **Supporting guide page** — only if a specific PAA question is uncontested by any existing page on the domain

---

## County hub pages — requirements

A county hub page must:

- Target "[County] [primary service]" in H1 and first sentence
- Contain a county-level income/outcome range (not city-specific figures)
- List all city/town pages within the county as internal links
- Include county-level seasonality commentary (callout, not bar chart)
- Reference the county's key demand drivers
- Include all five required schema types in a single combined JSON-LD block
- Include the regulatory/tax section
- Follow all rules in `CORE__03_*` content principles files
- Address all mandatory objections for the business
- Use FAQ language that mirrors how leads speak (`CORE__04_frameworks__objections-and-faq-language-framework.md`)

---

## Supporting guide pages — requirements

A supporting guide page must:

- Target the guide topic as primary keyword, not a location
- State which lead profile the page primarily serves
- Include internal links back to every city page where relevant
- Include the primary conversion embed near top and bottom
- Include "Relevant for these areas" related links block
- Include all five required schema types
- Follow all `CORE__03_*` content principles

---

## Phase 3 output order

For each cluster page Phase 3 produces:

1. **Phase 0 documentation** — which criterion (A/B/C) the page passes, why
2. **Cluster status at time of build** — must be GREEN
3. **Recommended URL slug, meta title, meta description** (plain text, character counts confirmed)
4. **Primary lead profile served**
5. **Full page HTML** — self-contained, ready for the CMS
6. **Internal linking update notes** — which existing indexed pages need a link added (Tier 1 or Tier 2 source pages per `CORE__01_strategic__navigation-and-internal-linking.md`)
7. **Post-Publication Indexation Checklist** (`CORE__02_phase-2__post-publication-indexation-checklist.md`)

---

## How Phase 3 differs from Phase 2

| Phase 2 | Phase 3 |
|---|---|
| Modifies an existing page | Creates a new page |
| Triggered by Phase 1 audit findings | Triggered by impression-data signals or PAA gaps |
| Adds HTML blocks to existing structure | Builds the full structure from scratch |
| Always produces output if Phase 1 had issues | Often produces no output (pre-conditions don't pass) |

---

## The most important rule

If you cannot articulate **with data** (impression count, PAA query, search volume) why this new page should exist, the new page should not exist. Phase 0 enforces this; Phase 3 enforces it again with the four pre-conditions.

The instinct to pre-build is wrong. It produces the cannibalisation patterns that have to be cleaned up later. Wait for the data.

---

## How this applies to non-Stayful websites

The four pre-conditions are domain-neutral.

For an e-commerce site: a "use cases" page or a "for [vertical]" landing earns its place only if the main product page has earned impressions for vertical-specific queries.

For a SaaS site: dedicated landing pages for verticals, sizes, integrations earn their place only if main pages show impressions for those segment queries.

For a publisher: topic hubs and series landing pages earn their place only if the constituent articles have earned topic-specific impressions.

In every case, the question is the same: **what data tells us this new page is needed, and have the pre-conditions passed?**
