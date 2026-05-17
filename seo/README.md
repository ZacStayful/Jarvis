# Stayful SEO workspace

This folder is a Claude Code-navigable mirror of the stayful.co.uk sitemap, broken into SEO categories. The goal is to use this structure as the base for **revising existing pages** and **drafting new pages** to close SEO gaps.

## Sitemap snapshot

- Total URLs: **669**
- Source: `.sitemap-raw.xml` (3.2 MB, downloaded from Google Drive)
- Generated indexes live in [`index/`](index/)

## How to navigate

- [`categories/`](categories/) — every URL bucketed by category. Each category folder has a `README.md` listing its pages and a `pages/` subfolder with one `.md` stub per URL.
- [`index/`](index/) — machine-readable JSON: `all-urls.json`, `classified.json`, `by-category.json`, `city-service-matrix.json`.
- [`gap-analysis/`](../seo/gap-analysis/) — Stage 4 outputs: duplicates, thin/stale, missing combos.
- [`working/`](../seo/working/) — Stage 7 drafts (`revisions/` and `new-pages/`).

## Per-page stub format

Each `categories/**/pages/<slug>.md` has YAML frontmatter (slug, loc, service, city, lastmod, priority, image_count, status) and sections for:

1. **On-page snapshot** — title/meta/H1/word count (filled in Stage 5 crawl).
2. **SEO targeting** — primary/secondary keywords, intent.
3. **Opportunity assessment** — action (revise/consolidate/leave/new), score, rationale.
4. **Revision plan** — proposed title/meta/outline, internal links, schema, HTML blocks.

## Categories

| # | category | pages | folder |
|---|---|---|---|
| 01 | core | 11 | [`categories/01-core/`](categories/01-core/) |
| 02 | service-hub | 23 | [`categories/02-service-hubs/`](categories/02-service-hubs/) |
| 03 | location-page | 361 | [`categories/03-location-pages/`](categories/03-location-pages/) |
| 04 | faq-questions | 91 | [`categories/04-faq-questions/`](categories/04-faq-questions/) |
| 05 | calculators-tools | 12 | [`categories/05-calculators-tools/`](categories/05-calculators-tools/) |
| 06 | comparisons | 6 | [`categories/06-comparisons/`](categories/06-comparisons/) |
| 07 | regulations-rules | 8 | [`categories/07-regulations-rules/`](categories/07-regulations-rules/) |
| 08 | blog | 98 | [`categories/08-blog-posts/`](categories/08-blog-posts/) |
| 09 | case-studies | 4 | [`categories/09-case-studies/`](categories/09-case-studies/) |
| 10 | courses-academy | 8 | [`categories/10-courses-academy/`](categories/10-courses-academy/) |
| 11 | investor-services | 7 | [`categories/11-investor-services/`](categories/11-investor-services/) |
| 12 | topical-guides | 40 | [`categories/12-topical-guides/`](categories/12-topical-guides/) |

## Pipeline (7 stages)

| Stage | Output | Status |
|---|---|---|
| 1. Parse sitemap | `index/all-urls.json`, `index/summary.json` | ✅ |
| 2. Classify | `index/classified.json`, `index/by-category.json`, `index/city-service-matrix.json` | ✅ |
| 3. Folder tree + stubs | `categories/**/README.md`, `categories/**/pages/*.md` | ✅ |
| 4. Gap analysis | `gap-analysis/*.md` | ✅ |
| 5. Live-page audit | populated stub on-page snapshots | ⬜ |
| 6. Opportunity scoring | `gap-analysis/backlog.md` | ⬜ |
| 7. Revisions + new pages | `working/revisions/`, `working/new-pages/` | ⬜ |
