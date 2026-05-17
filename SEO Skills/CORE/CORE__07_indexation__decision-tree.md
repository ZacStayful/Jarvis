# Indexation Decision Tree

**Scope: Universal.** When a page is not indexed, diagnose in this order. Each layer is much cheaper to fix than the one below. **Stop at the first layer that fails — fix it, wait two weeks, recheck.**

This is the single most important diagnostic in the engine. The fix-list for an unindexed page is entirely different from the fix-list for a low-ranking indexed page.

---

## Why the layered approach

Indexation failures have multiple possible causes. The wrong instinct is to "improve the content" — adding more sections, more FAQ, more keywords. This rarely fixes indexation because the cause is usually structural, not content-level.

The Decision Tree forces a sequenced diagnosis: cheapest fix first, hardest fix last. Most pages stuck at "Crawled — currently not indexed" resolve at Layer 1, 2, or 3 — without any content work at all.

Each layer takes ~2 weeks to verify the fix. So the full sequence, if every layer fails, takes 12 weeks. But most pages resolve at Layer 1 (cheap, fast) and never need to proceed.

---

## Layer 1 — Is it in sitemap.xml?

Visit `[domain]/sitemap.xml` and search for the URL.

### If absent:

1. Open the page in the CMS → Page Settings → SEO
2. Confirm "Hide page from search engines" is **OFF**
3. Confirm "Hide from sitemap" is **OFF**
4. Re-publish the page
5. Verify `sitemap.xml` updates within 24 hours

### Squarespace 7.1 specific note

New code-block pages sometimes default to "hidden from sitemap." This is the most common Layer 1 failure mode and the easiest to fix.

### Other platforms

| CMS | How to verify |
|---|---|
| WordPress | Yoast / Rank Math: per-page index toggle in the SEO meta box |
| Webflow | Page Settings → SEO Settings → "Show in search results" |
| Shopify | Search engine listing preview must populate; check theme settings |
| Custom Next.js / static | Verify the build includes the URL in `/sitemap.xml` |

### After fix

Submit URL to GSC → URL Inspection → Request Indexing. Wait 14 days. Re-check.

If still not indexed after 14 days: proceed to Layer 2 (do not request indexing again).

---

## Layer 2 — Is it in the main navigation?

Check the live site's nav menu.

### If absent:

1. Add the URL to the relevant nav folder
2. If no relevant folder exists AND the new vertical has 3+ pages, create a parallel nav folder per the Navigation Parallel Structure rule (`CORE__01_strategic__navigation-and-internal-linking.md`)

### Why navigation matters

Sitewide nav links are Tier 1 in the link value model. A page without nav placement is structurally orphaned — body-copy links from other pages can compensate partially but rarely fully.

For new verticals at scale (e.g. 10+ holiday let city pages), missing nav representation is often the difference between 80% cluster indexation and 30% cluster indexation.

### After fix

Wait 14 days. Re-check.

---

## Layer 3 — Does it have 3+ contextual links from already-indexed pages?

Contextual = inside body copy, not just related-links blocks. Indexed = confirmed via `site:` search.

### How to verify

1. Find all pages on the domain that link to the target page
2. Filter to those with body-copy links (not just related-links blocks)
3. For each, run `site:[domain][/source-slug]` to confirm it's indexed

Count the indexed source pages.

### If under 3:

Add 3–5 contextual links from indexed pages on the same topic. Apply the anchor text variation rule (`CORE__01_strategic__navigation-and-internal-linking.md` — Rule 3): mix exact match, partial match, branded, and natural language anchors.

### Tier matters

If only candidate source pages are non-indexed (Tier 4), this layer cannot be fixed without first indexing the source pages. Move backward — Layer 1 or 2 work on the source pages.

### After fix

Wait 14 days. Re-check.

---

## Layer 4 — Is there cannibalisation pressure in this cluster?

Search `site:[domain] [primary keyword]`. Count pages competing for the same intent.

### If 3+:

This page may not be indexable until cluster pruning is done. Do not request indexing again until the cluster is below the hard limit.

See `CORE__07_indexation__pruning-framework.md` for the four-bucket consolidation framework.

### Why cannibalisation blocks indexation

Google's indexation systems allocate budget per cluster. When a cluster has more pages than warranted by the underlying query intent diversity, Google indexes some and not others — the choice is opaque but the rule of thumb is "the strongest single page per intent."

Forcing a fourth or fifth page into a cluster that already has 3 strong pages doesn't expand the indexation; it just causes one of the existing pages to drop out.

The fix is consolidation, not adding more content.

### After fix

Wait 14 days post-consolidation. Re-check.

---

## Layer 5 — Is the page distinctive enough at template level?

Compare the page to 2–3 siblings in the same content vertical.

### The distinctiveness question

Are components, intro structure, and visuals so similar that the only meaningful differences are city name and a handful of figures?

### If yes:

The page may need a structural variant to clear the templated-shape filter:

- Different layout (component order or composition)
- Different supporting content (a unique callout, a market-specific data block)
- Different visual element (a different SVG, a different chart format)

This is rare but real. A symptom: 25 city pages where 20 are indexed and 5 are not — the 5 are usually the most templated ones, the ones built last without unique content.

### How to make a page more distinctive

- Add a unique data point not present on sibling pages
- Add a unique local insight (named demand driver, named event, named local risk)
- Reorder the canonical section order slightly (e.g., move case study earlier, move services bullet list later)
- Add a unique callout box with city-specific content

### After fix

Wait 30 days post-restructure. Re-check.

---

## Layer 6 — Are external signals weak for this URL?

Check Ahrefs / Semrush for referring domains. Check GSC for any impressions over the last 90 days.

### If zero referring domains AND zero impressions ever:

The page has no external validation. Indexation may require seeding via:

- Internal links from high-traffic pages
- Branded mentions on external sites
- Targeted outreach to authoritative domains

Page-level work alone cannot expand the domain's indexation budget. External signals are required.

### Indicators that this is the right diagnosis

- Layers 1–5 all clean
- Page has been live 30+ days
- Page is well-structured per all content principles
- Other pages on the domain with similar structure are indexing fine — but this one has notably weaker external signal

If all five indicators apply, Layer 6 is likely the bottleneck.

### After fix

External signal building is the longest cycle — 3–6 months for meaningful change. Re-check at 90 days.

---

## Escalation rule

If Layers 1–4 are all clean AND the page has been live 30+ days without indexation:

- This is now a page-quality or distinctiveness problem (Layer 5+)
- Run a full Phase 1 audit with the distinctiveness check enabled
- Compare to indexed siblings explicitly

If Layer 5 is clean but indexation still fails:

- Layer 6 (external signals) is the likely cause
- Schedule outreach / earned-media work
- In parallel, consider whether the page is worth keeping (Layer 6 problems often correlate with the page failing the Pages That Earn Their Place test)

---

## What this diagnostic NEVER recommends

- "Add more FAQ items"
- "Add more body copy"
- "Re-write the intro"
- "Add more keywords"
- "Rewrite the H1"

None of these fix indexation. They are content-quality fixes that apply to indexed pages that aren't ranking. If the page isn't indexed, content fixes are wasted effort.

---

## When to skip the Decision Tree and go straight to pruning

A page is a candidate for direct 301 consolidation (skipping the Decision Tree) when:

- It fails the Pages That Earn Their Place test (`CORE__01_strategic__pages-earn-their-place.md`)
- The cluster is at RED cannibalisation status
- The page targets a query identical to an indexed sibling
- The page has been non-indexed for 6+ months despite remediation attempts

In these cases, the Decision Tree is a waste of effort. Go directly to `CORE__07_indexation__pruning-framework.md` for the 4-bucket classification.

---

## Output format

When running the Decision Tree on a non-indexed page:

```
INDEXATION DIAGNOSTIC — [URL]
Live since: [date]
Current status: [Crawled — currently not indexed / Discovered — currently not indexed / Excluded]

Layer 1 — Sitemap: [Pass / Fail — [details]]
Layer 2 — Navigation: [Pass / Fail — [details]]
Layer 3 — Contextual links: [Pass / Fail — [details]]
Layer 4 — Cannibalisation: [Pass / Fail — [details]]
Layer 5 — Distinctiveness: [Pass / Fail / Not yet checked]
Layer 6 — External signals: [Pass / Fail / Not yet checked]

First failing layer: [Layer N]
Recommended action: [specific fix]
Next check date: [today + 14 days]
```

This format is the standard output of Phase 1 when indexation status is NOT INDEXED.

---

## How this applies to non-Stayful websites

The Decision Tree is platform-neutral and industry-neutral.

CMS-specific notes adapt for Layer 1 (sitemap discovery and per-page index toggles). The remaining layers are identical across every commercial site.

For e-commerce: cluster = product category or product attribute combination. Layer 4 cannibalisation manifests as too many SKU pages per intent.

For SaaS: cluster = use-case landing or feature page. Layer 4 manifests as overlapping conversion pages.

For publishers: cluster = topic hub. Layer 4 manifests as multiple articles on the same sub-topic.

The diagnosis sequence is the same.

---

## Related files

- `CORE__07_indexation__pruning-framework.md` — the four-bucket framework for pages that fail the tree
- `CORE__07_indexation__vs-ranking-mental-model.md` — the foundational mental model
- `CORE__01_strategic__navigation-and-internal-linking.md` — Layers 2 and 3 underlying rules
- `CORE__01_strategic__pages-earn-their-place.md` — Layer 4 underlying rule
- `CORE__02_phase-2__post-publication-indexation-checklist.md` — when the Decision Tree gets triggered
