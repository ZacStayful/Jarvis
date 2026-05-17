# Pages That Earn Their Place

**Scope: Universal.** A page deserves to exist as a separate URL only if it passes at least one of three criteria. If it satisfies zero, it should not be built. If it already exists, it is a pruning candidate.

This is the single highest-leverage rule in the engine. It prevents work that will not return value.

---

## The three criteria — pass at least one

### Criterion A — Meaningfully different query intent

The page targets a query that is not adequately served by any other page on the domain.

Two queries are **meaningfully different** if the searcher would expect different content as the answer.

**Examples:**

| Query A | Query B | Meaningfully different? |
|---|---|---|
| "Airbnb management Coventry" | "Airbnb management company Coventry" | **No** — same intent (service inquiry) |
| "Airbnb management Coventry" | "how much can I earn from an Airbnb in Coventry" | **Yes** — service inquiry vs income validation |
| "Holiday let management Cornwall" | "short let management Cornwall" | **No** — same intent, synonyms |
| "Project management software" | "Project management software for agencies" | **Yes** — generic vs vertical-specific |
| "CRM" | "CRM software" | **No** — same intent |

The test: would a searcher type Query A and feel satisfied by content written for Query B? If yes, same intent.

### Criterion B — External signal earning potential

The page covers a topic that could realistically attract backlinks, branded searches, or topical mentions from outside the domain.

This is **rare but real** for hub pages and timely guides.

**Earns external signals:**
- A regional FHL tax compliance guide
- A definitive list of councils requiring STR licences
- An income data report based on first-party portfolio data
- An industry survey or original research
- A free calculator or tool

**Does NOT earn external signals:**
- A city + service combination functionally identical to 20 others on the site
- A "best [thing] in [city]" listicle without unique data
- A standard service page

### Criterion C — Content the main page cannot absorb without losing focus

The page covers content that, if added to the main page, would degrade the main page's clarity, length, or focus.

**Earns its place:**
- A deep FHL tax explainer that would bloat a city page
- An income calculator landing page demanding its own conversion flow
- A buyer's guide that needs 3,000 words and would dilute a 1,200-word service page
- A standalone case study with its own narrative arc

**Does NOT earn its place:**
- Most city × service permutations — their content could and arguably should sit as a section on the main city page
- A "features" page when the homepage already lists features
- A "pricing FAQ" when pricing is already on the pricing page

---

## Application rule

When a new page concept is proposed, state in writing which criterion it passes and why. The Phase 0 gate (`CORE__02_phase-0__should-this-page-exist.md`) requires this documentation.

If the answer is shaky — "well, kind of A, kind of B" — default to **no**.

If the answer is "we just always build one because the framework says so" — that is not a passing answer. Frameworks describe what to build when it earns its place, not what to build automatically.

---

## The Cannibalisation Hard Limit

A city cluster (or equivalent geographic / topical cluster) may have a maximum of **3 indexable pages targeting different primary intents**:

1. **Primary service page** — e.g. `/airbnb-management-[city]` or `/[service]-[city]`
2. **Income / calculator / data page** — e.g. `/how-much-can-i-earn-from-an-airbnb-in-[city]` or equivalent validation page
3. **One specialist supporting page IF AND ONLY IF** the specialist query has 50+ monthly searches AND serves a genuinely different lead profile

**Any cluster with 4+ pages targeting overlapping intent is in violation and is a pruning candidate.**

### Specific banned patterns (consolidate via 301)

- `[city]` AND `[city]-cost` — cost content belongs on the primary page or a national cost hub
- `airbnb-management-[city]` AND `short-let-management-[city]` AND `holiday-let-management-[city]` AND `serviced-accommodation-management-[city]` — pick one; the rest are synonyms
- `cohost-[city]` AND `setup-[city]` AND `yield-[city]` — almost never earn their place
- `[city]` AND `in-[city]` — pure slug variants; one must 301 into the other

For non-Stayful sites: identify the equivalent pattern in your domain. E.g. an e-commerce site running `[product]-buy`, `[product]-buy-online`, `buy-[product]-online`, `[product]-for-sale` — same intent, four URLs, three of them lose.

### Cluster status traffic light

| Status | Definition | Action |
|---|---|---|
| **GREEN** | ≤3 indexable pages per cluster targeting different primary intents | Healthy — new work allowed |
| **AMBER** | 4–5 pages with overlapping intent | No new work in this cluster until pruned |
| **RED** | 6+ pages with overlapping intent | Pruning is mandatory before any other action |

The Phase 1 audit reports cluster status. Never add a new page to an AMBER or RED cluster.

---

## The Two-Page Rule for New Clusters

When building out a new geographic or topical cluster from scratch:

**Build only the primary service page first.**

Wait 4–6 weeks. Monitor GSC. If the primary page generates 100+ monthly impressions AND supporting queries appear in the impression list with 30+ impressions each, build the second page targeting those queries.

**Do not pre-build five supporting pages in a cluster that hasn't yet earned attention.**

The instinct to pre-build is wrong. It produces cannibalisation patterns that have to be cleaned up later, and it spends indexation budget on pages with no demonstrated demand.

### The data-driven sequence

```
Week 0 — Publish primary service page only
Week 4–6 — Check GSC. Impressions on supporting queries?
   No → Strengthen primary page (Phase 2 on existing URL)
   Yes → Build second page targeting the queries that showed impressions
Week 10–12 — Check GSC again. Specialist queries showing?
   No → Stop. Two pages is enough.
   Yes → Build third page (only if Criterion A/B/C passes)
```

This data-driven sequence is the antidote to the framework instinct. Frameworks tell you what kinds of pages are possible. Data tells you which ones earn their place.

---

## How this applies to non-Stayful websites

The three criteria are domain-neutral. The cannibalisation hard limit applies wherever a single domain has multiple URLs targeting overlapping intent. The two-page rule applies wherever a content vertical is being built.

For an e-commerce site: a product cluster shouldn't have separate URLs for the product, the product's specs, the product's reviews, the product's price, the product's shipping options — unless each meaningfully different intent earns its place. Most don't.

For a SaaS site: feature pages, use-case pages, and integration pages routinely violate this. A "Salesforce integration" page and a "CRM integration" page and a "third-party integrations" hub — if the content overlap is high, consolidate.

For a local services business: city pages, neighbourhood pages, and "near me" pages for the same service routinely violate this. One city page per service is usually right; multiple per city is usually wrong.

---

## Why this rule produces leverage

Every page that fails the test and gets built drags down domain quality. Every page that fails the test and gets pruned recovers indexation budget. The compounding effect across an 80-page site over a year is the difference between a site at 40% indexation and a site at 85% indexation.

A site at 85% indexation with 50 pages outperforms a site at 40% indexation with 200 pages. Almost always.
