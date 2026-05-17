# Indexation vs Ranking — The Foundational Mental Model

**Scope: Universal.** This is the principle most likely to be forgotten when day-to-day work resumes. Re-read this file at the start of any session that involves diagnosing why a page isn't performing.

---

## The core principle

**Indexation and ranking are separate exams.**

The fix-list for an unindexed page is different from the fix-list for a low-ranking indexed page.

- **For a low-ranking indexed page**, the fix-list is in `CORE__03_*` and `CORE__04_*` and `CORE__05_*`: content quality, schema, internal linking, expert insight markers, anchor text optimisation, on-page SEO.

- **For an unindexed page**, the fix-list is in `CORE__07_*`: sitemap presence, navigation presence, contextual links from indexed pages, cannibalisation pressure, distinctiveness, external signals.

A page can fail one exam and pass the other. A page can pass both but still not appear in search because its competitive set is too strong. A page can pass both and rank top of page 1 if the work has been done correctly across all layers.

---

## The instinct that wastes the most SEO effort

> "This page isn't performing — let me improve the content."

This instinct is correct if the page is indexed and not ranking. It is **wrong** if the page is not indexed at all.

If a page isn't indexed, the page is not in Google's database. No amount of additional content, schema, FAQ entries, or keywords changes that. The page contributes zero to ranking signal because it doesn't exist from Google's perspective.

The fix is structural:
- Sitemap presence
- Navigation presence
- Internal linking from indexed pages
- Cluster cleanup
- Distinctiveness
- External signals

Adding more good content to a page that already has good content but isn't indexed produces no result.

---

## The diagnostic discipline

Before doing any optimisation work on an underperforming page, answer this question:

> Is this page indexed?

Run `site:[domain]/[page-slug]` and confirm.

| Result | Diagnosis category | Files to consult |
|---|---|---|
| Indexed but low rank | Content / competitive | `CORE__03_*`, `CORE__04_*`, `CORE__05_*`, plus Phase 1 audit |
| Indexed but low CTR | Meta title / description | `CORE__03_meta__*` |
| Not indexed | Structural | `CORE__07_indexation__decision-tree.md` |
| Excluded intentionally | Configuration | Check `noindex` directives and 301 chains |

The same page can require different actions depending on which exam it's failing.

---

## Why this principle gets forgotten

Day-to-day SEO work is heavily content-oriented. Writers and SEO practitioners spend most of their time on content — Phase 1 audits, Phase 2 rewrites, FAQ updates, schema enrichment. The content lens becomes the default lens.

When a page underperforms, the default response is the content response: improve the content.

This default works for indexed pages. For non-indexed pages, it produces nothing. And the underlying signal — "the page isn't indexed" — often gets missed because the practitioner doesn't think to check.

The discipline: ALWAYS check indexation first. Five seconds of effort prevents weeks of wasted content work.

---

## The two-exam framework — applied to common scenarios

### Scenario 1 — Page ranks at position 14, has been live 6 months

Indexed → low-ranking. Content / competitive exam.

Actions:
- Phase 1 audit
- Competitor gap matrix
- Phase 2 content fixes
- Meta title / description rewrite if CTR is low

### Scenario 2 — Page has been live 30 days, no impressions, no clicks

Most likely not indexed. Structural exam first.

Actions:
- `site:` query to confirm indexation status
- If not indexed: Layer 1 of Decision Tree
- If indexed but no impressions: query mismatch — check primary keyword vs. actual content

### Scenario 3 — Page ranks at position 3, suddenly drops to page 2

Indexed → competitive shift. Content / competitive exam.

Actions:
- Check for new competitors in top 10
- Run Phase 1 Step 3 on the new competitor
- Schedule Phase 2 work to match competitor advantages

### Scenario 4 — New page in established cluster, 90 days old, never indexed

Possibly cannibalisation. Structural exam.

Actions:
- Check cluster cannibalisation status (Layer 4)
- If at AMBER/RED, consolidate first
- If GREEN, run Decision Tree Layers 1-3

### Scenario 5 — Page is indexed, has impressions, but very low clicks

Indexed → CTR problem. Meta exam.

Actions:
- Phase 2 Section K (meta title and description rewrite)
- Check that title is profile-matched
- Check that first sentence of description is a moral contract

---

## The instinct that prevents wasted work

When approached with "this page isn't doing well", the correct first question is:

> "Tell me what's not happening. Is it that the page isn't indexed, isn't ranking, or isn't converting?"

Each of these has a different fix-list:

- **Not indexed** → Indexation Decision Tree
- **Indexed but not ranking** → Content / competitive / link work
- **Ranking but not converting** → Meta title / description, then on-page CTA structure

A single answer ("the page isn't doing well") is ambiguous. Pinning down which specific failure is happening — before doing any work — is the discipline.

---

## The "everything looks fine but..." pattern

A specific pattern that recurs:

> "The page has correct schema, a 50–70 word answer capsule, every objection handled, an uplift component, real postcode data, three expert insight markers, and a clean Phase 2 audit — and still sits in 'Crawled — currently not indexed' indefinitely."

The reason is rarely the page itself in isolation. It is usually one of:

1. **Templated shape** — content within is unique but the page-level structure (same components, same intro pattern) appears across dozens of sibling pages. Layer 5 of the Decision Tree.
2. **Redundant intent** — another page on the same domain already covers the same primary intent. Layer 4.
3. **Domain-level signal weakness** — indexation budget is allocated based on site authority. Page-level quality cannot expand this budget. Layer 6.
4. **Weak internal link signal** — pages without sitewide nav links and without contextual links from already-indexed pages have to clear a higher quality bar. Layers 2 and 3.

In every one of these cases, more content is the wrong response. The right response is structural.

---

## When to abandon a page

A page that has been through all six layers of the Decision Tree without indexation success — over 60+ days — is signalling that the domain cannot support it at this time.

Continuing to push it adds load without return. Move to pruning (`CORE__07_indexation__pruning-framework.md`).

The strategic implication: not every page deserves to exist. The Pages That Earn Their Place test (`CORE__01_strategic__pages-earn-their-place.md`) catches most of these candidates before they're built. Pruning catches the rest after.

---

## The mental model — restated for memory

Two exams.

The fix for an unindexed page is structural. The fix for an indexed-but-not-ranking page is content / competitive. The fix for a ranking-but-not-converting page is meta / CTA.

Always check indexation first. Five seconds prevents weeks of wasted work.

If the page won't index after Layers 1–6, the domain can't support it. Prune.

---

## Related files

- `CORE__07_indexation__decision-tree.md` — the structural fix-list
- `CORE__07_indexation__pruning-framework.md` — when to abandon
- `CORE__07_indexation__workflow-operating-rhythm.md` — operating rhythm that prevents this problem at scale
- `CORE__00_quickstart__audit-existing-page.md` — workflow that starts with the indexation check
- All `CORE__03_*` and `CORE__04_*` files — the content fix-list (applies only after indexation is confirmed)
