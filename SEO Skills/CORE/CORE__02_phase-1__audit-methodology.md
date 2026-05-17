# Phase 1 — Audit Methodology

**Scope: Universal.** Phase 1 is the audit and research phase. It produces a structured report; it does not write any HTML. Phase 2 writes HTML, and only on explicit instruction.

Phase 1 runs after Phase 0 has passed (for existing pages, Phase 0 is skipped — the page already exists).

---

## Triggers

The audit activates when a message matches:

- A URL is provided alone or with the word "audit", "analyse", "optimise" or "SEO"
- "Run the SEO engine on [URL]"
- "SEO engine: [URL]"
- A URL accompanied by a request to improve, fix, or rank a page

When triggered, execute Phase 1 immediately. Do not ask clarifying questions before starting.

---

## The ten steps

### Step 1 — Fetch and parse the target page

Use a web fetch on the provided URL. Extract:

- Page title tag
- H1 text
- All H2 headings in order
- First 100 words of visible body copy
- All FAQ questions present
- All internal links (hrefs only)
- All external links
- All JSON-LD script blocks
- Any structured data attributes
- Presence/absence of: phone number, address, named person/team member, review stars, video embed, date/last updated label, breadcrumb navigation
- Meta description
- Whether the primary conversion embed is present (for Stayful: income calculator embed)

### Step 2 — Competitive SERP research

Search Google for the primary keyword. Identify top 5 ranking pages.

SERP intent classification:

- **4+ guest-intent / end-user dominance** → flag as critical; identify owner-intent / buyer-intent keyword variants
- **1–3 management companies / competitor service pages** → fetch and analyse those competitor pages in Step 3
- **0 management companies** → first-mover opportunity

See `CORE__02_phase-1__competitor-and-keyword-research.md` for full methodology.

### Step 3 — Competitor page analysis

For every direct competitor in top 10, and any regional competitors, fetch their location/topic page.

Record presence/absence of: named local person with photo / local-specific data / monthly seasonality data / regulatory/tax section / service tier comparison / portal callout / review embed (Trustpilot etc.) / FAQPage schema / LocalBusiness or Service schema / AggregateRating schema / county/region hub page linking / listed on regional authority site / outbound links to authoritative sources / video embed / "how it works" steps / regulatory section / planning permission section / worst-case figure / control statement / FAQ in lead language / meta title with curiosity gap / meta description with specific figure

This forms the **Competitor Gaps** section of the audit report.

### Step 4 — Keyword gap research

Search and note ranking status for these clusters (adapt to industry):

| Cluster | Example queries |
|---|---|
| Primary owner-intent | "[service] [city]", "manage my [thing] [city]" |
| Tax / regulatory | "[tax topic] [region]", "[regulation] [city]" |
| Comparison / evaluation | "best [service] [region]", "[service] fees [region]" |
| Switching / control | "switch [service] [city]", "do I lose control if I use [service]" |
| Long-tail AEO / AI Overview | "how much can I earn from [thing] in [city]", "is [thing] worth it in [city]" |

For each query: note whether target URL ranks, whether a competitor ranks, and whether the query returns any result. **Gaps where no page ranks are highest priority.**

### Step 5 — Schema audit

Mark each Present / Missing / Incomplete:

| Schema type | Required fields |
|---|---|
| FAQPage | mainEntity array, each with @type Question + acceptedAnswer |
| WebPage | name, url, description, dateModified |
| LocalBusiness | name, url, telephone, areaServed, priceRange |
| Service | name, serviceType, provider, areaServed, offers |
| AggregateRating | ratingValue, reviewCount, bestRating |
| BreadcrumbList | itemListElement with position, name, item |
| VideoObject (if video) | name, description, thumbnailUrl, uploadDate, contentUrl/embedUrl, duration |

### Step 6 — On-page technical checks

| Check | Pass/Fail |
|---|---|
| Title tag: no duplicate brand name | |
| Title tag: primary keyword in first 40 characters | |
| Title tag: curiosity gap present | |
| Title tag: 55 characters or under | |
| Meta description: present, custom, under 150 characters | |
| Meta description: contains primary keyword + specific value prop | |
| Meta description: first sentence stands alone as reason to click | |
| Meta description: no generic CTA | |
| H1: contains exact primary keyword | |
| Primary keyword in first sentence of body copy | |
| Primary keyword in first 100 words | |
| Primary conversion embed present near top | |
| Primary conversion embed present near bottom | |
| Phone number present | |
| "Last updated" or date signal present | |
| Outbound links to authoritative sources | |
| Internal links use brand-styled color (not blue) | |
| All FAQ items have itemscope Question markup | |
| No duplicate H1 | |
| Breadcrumb nav present | |
| Worst-case / honest-caveat figure present in body copy | |
| Control / friction-reducer statement present near CTA | |
| Honest framing of guarantees | |
| FAQ questions use lead language (not business jargon) | |
| Every H2 is a hook, not a label | |
| Concept test passed | |
| Attention reset every three prose sections or fewer | |

### Step 7 — People Also Ask (PAA) harvesting

Search the primary keyword and 2–3 secondary keywords. Also search switching/control cluster queries. Record every PAA question that appears.

For each PAA question:

- Note exact phrasing (use verbatim)
- Note which page currently answers it
- Flag whether covered in target page's FAQ
- Flag whether FAQ uses same phrasing (if not, update to match)
- Flag content gaps

PAA questions not covered are **priority FAQ additions** in Phase 2, using exact PAA phrasing as question text.

### Step 8 — Indexability, canonical, cannibalisation, technical integrity

**Indexability — three outcomes:**

Search `site:[domain]/[page-slug]`. Record one:

- **INDEXED** — proceed with audit as normal
- **NOT INDEXED** — the audit must produce an Indexation Diagnostic alongside the standard audit. Run the Indexation Decision Tree (`CORE__07_indexation__decision-tree.md`) and report the first failing layer. The fix path for an unindexed page is different from a low-ranking indexed page.
- **EXCLUDED INTENTIONALLY** — page should be `noindex`'d or 301'd. No further audit needed; produce 301 recommendation only.

**Canonical tag:**

Check page source for `<link rel="canonical">`.

- Self-pointing → correct
- Pointing to a different URL → CRITICAL — potential self-cannibalisation
- Absent → MEDIUM

**Cannibalisation check:**

Search `site:[domain] [primary keyword]`.

- 2+ pages targeting same keyword → HIGH
- Cluster at or over hard limit → CRITICAL — pruning required before any Phase 2 work

**Image alt text check:**

Flag any image with empty alt or generic filename alt. Phase 2 recommendation formula: `alt="[what the image shows] — [location] [service]"`.

**Featured snippet ownership:**

Search the primary keyword. Note:

- Whether a featured snippet exists
- Which URL owns it
- What format (paragraph, table, list, numbered steps)
- Whether target page has content in that format

### Step 9 — Off-page and citation audit

Check for citation gaps:

- Regional/local tourism authority — listed?
- Local council business directory — listed?
- Local landmark/event business partner directory — listed?
- AONB / National Park website (if applicable) — listed?
- Trustpilot, Yell, Yelp — consistent NAP?
- Google Business Profile — service area set correctly?
- GBP primary category accurate?

### Step 10 — Competitor backlink gap

For each direct competitor, note domains linking to their pages that do not link to your site. Focus on regional authority sites, local news, event websites, professional associations.

If no Ahrefs/Semrush access: flag "Full backlink gap analysis requires Ahrefs or Semrush — run separately."

---

## When Phase 1 is complete

Output the audit report in the format defined at `CORE__02_phase-1__audit-report-format.md`.

End the report with:

> "Phase 1 complete. Ready to begin Phase 2 — HTML fixes and additions. Type 'write Phase 2' to continue, or ask questions about the audit first."

**Do not begin Phase 2 until explicitly told to continue.**

---

## How this applies to non-Stayful websites

Each step is industry-neutral. The terminology adjusts:

- "Income calculator embed" → primary conversion embed for any industry (lead form, calculator, signup, demo request)
- "Tax / regulatory" cluster → equivalent compliance topics for the industry
- "Local landmark / tourism authority" → industry equivalent (trade body, certifying organisation, regional authority)

The 10-step structure is the same; the specific keyword clusters and citation targets adapt to the business.
