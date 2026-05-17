# Phase 2 — Post-Publication Indexation Checklist

**Scope: Universal.** Part 2.6 (`CORE__02_phase-2__geo-ai-overview-checklist.md`) governs page quality. This checklist governs whether the page will **actually be indexed and ranked**. Run this in addition to — not instead of — the Content Quality checklist.

The checklist runs across multiple time horizons: 24 hours, 7 days, 14 days, 30 days, 60 days. Each horizon has a specific action.

---

## Within 24 hours of publication

- [ ] **Sitemap presence.** Verify URL appears in `[domain]/sitemap.xml`.
  - If not: open the page in the CMS → Page Settings → SEO. Confirm "Hide page from search engines" is OFF. Confirm "Hide from sitemap" is OFF. Re-publish. Verify sitemap.xml updates within 24 hours.
  - **Squarespace 7.1 specific note**: New code-block pages sometimes default to "hidden from sitemap." This is the most common failure mode and the easiest to fix.
- [ ] **Navigation placement.** Confirm page is in relevant navigation folder.
  - If a parallel nav folder is required and doesn't exist, create it (`CORE__01_strategic__navigation-and-internal-linking.md` — Rule 1: parallel nav structure).
- [ ] **Contextual links.** Confirm at least 3 contextual links from already-indexed pages (Tier 2 or higher per the link value model).
  - Verify each source indexed via `site:` query.
- [ ] **GSC submission.** Submit URL to Google Search Console → URL Inspection → Request Indexing.

---

## At 7 days

Check GSC URL Inspection status:

- [ ] **If "Indexed":** complete. Move to monitoring cadence.
- [ ] **If "Crawled — currently not indexed" or "Discovered — currently not indexed":**
  - Do NOT request indexing again
  - Continue waiting; check at 14-day mark
  - Do not start additional content rewrites — too early to call failure

---

## At 14 days

If still not indexed:

- [ ] Run the **Indexation Decision Tree** from Layer 1 (`CORE__07_indexation__decision-tree.md`)
- [ ] Fix the first failing layer
- [ ] Document the diagnosis and the fix
- [ ] Wait 2 weeks before next check (do not request indexing again)

The first failing layer is the highest-leverage fix. Skipping to lower layers when an earlier one fails wastes effort.

---

## At 30 days

If still not indexed AND Layers 1–4 of the Decision Tree are all clean:

- [ ] **Page-level distinctiveness review.** Compare the page to 2–3 siblings in the same content vertical.
  - Are components, intro structure, and visuals so similar that the only meaningful differences are city/topic name and a handful of figures?
  - If yes, this is a content-shape problem (Layer 5 of the Decision Tree). Variant treatment required: different layout, different supporting content, different visual element.
- [ ] **External signal check.** Any referring domains? Any impressions over last 90 days?
  - If zero referring domains AND zero impressions ever, the page has no external validation (Layer 6).

---

## At 60 days

If still not indexed after all remediation:

- [ ] Page may not be indexable on this domain at this time
- [ ] Promote to **pruning candidate**
- [ ] Run `CORE__07_indexation__pruning-framework.md` to classify into one of the four buckets
- [ ] Most likely outcome: 301 consolidation into a canonical page (Bucket 2)

A page that has resisted indexation through every layer of remediation is signalling that the domain cannot support it — either because of cluster pressure, distinctiveness, or external signal weakness. Continuing to push it adds load without return.

---

## Why this checklist exists

The natural instinct when a page doesn't rank is to "improve the content." This instinct is wrong if the page isn't indexed.

A non-indexed page contributes nothing to ranking — Google has not added it to the searchable index. No amount of additional content, schema, or keywords changes that. The fix is structural: sitemap, navigation, contextual links from indexed pages, cluster cleanup, distinctiveness, or external signals.

This checklist forces the structural diagnostic at each time horizon, preventing the rewrite-the-content reflex from consuming time that should go elsewhere.

---

## How this applies to non-Stayful websites

The 24h / 7d / 14d / 30d / 60d schedule is universal.

Specific CMS notes adapt:

- **WordPress**: "Hide from sitemap" equivalent is the `index/noindex` toggle in Yoast/Rank Math; sitemap regeneration is usually automatic but verify.
- **Webflow**: sitemap.xml is auto-generated; per-page "Hide from sitemap" toggle in Page Settings.
- **Shopify**: products and collections auto-included; standalone pages need to be verified in Search Engine Listing Preview.
- **Custom Next.js / static sites**: sitemap is generated at build; verify the build includes the new URL.

The decision tree (Layer 1–6) applies in every case, just with CMS-specific verification steps at Layer 1.

---

## Common failures

- Skipping the 24h check entirely and discovering at 30 days that the URL was never in the sitemap
- Requesting indexing in GSC multiple times in the first week — does not help; can flag the URL for closer scrutiny
- Treating "Discovered — currently not indexed" as a content-quality problem when it is almost always a structural/budget problem at first
- Continuing Phase 2 rewrites on a page that has failed indexation for 60+ days instead of pruning
- Adding more internal links from non-indexed sibling pages (Tier 4 links) and treating that as remediation
