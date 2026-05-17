# Schema and Internal Linking — Technical Rules

**Scope: Universal.** Technical rules that affect SEO directly: schema (already covered in depth at `CORE__02_phase-2__schema-rules.md`; this file covers the wider AEO/GEO context), internal link styling, and the brand-link rule.

---

## SEO / AEO / GEO rules — the basics

These are the universal technical rules that every page must satisfy. They appear across multiple checklists but live here as the single source.

### Keyword placement

- **Primary keyword in H1**
- **Primary keyword in the first sentence of body copy**
- **Primary keyword in the first 100 words**
- **H2s target secondary keyword variants naturally** (not stuffed)

### Answer placement

- **Two answer boxes per page** — one in the top half for featured snippet eligibility, one in the FAQ section
- **FAQ questions match exact search query phrasing**
- **All FAQ content wrapped in `itemscope itemtype="https://schema.org/Question"` and `acceptedAnswer` markup**

### Schema requirements

- **FAQPage and WebPage JSON-LD schema** at the bottom of every page
- **Single combined JSON-LD array** — never split (full rules in `CORE__02_phase-2__schema-rules.md`)
- **`dateModified` matches today's date** on publish or refresh

### GEO / AI Engine visibility

- **Named local demand drivers** appear in body copy (not just FAQ)
- **Specific data points** (income, occupancy, rates) referenced to a comparable property type in the postcode
- **First-party data** preferred over general averages

### Internal link styling

- **Brand-coloured links** with subtle border-bottom — never blue
- **`font-weight: 700`** on internal links
- **`text-decoration: none`** with the border-bottom doing the underline work

For Stayful:
```css
a {
  color: #5D8156;
  font-weight: 700;
  text-decoration: none;
  border-bottom: 1.5px solid rgba(93,129,86,0.3);
  padding-bottom: 1px;
}
```

For non-Stayful sites: substitute brand colour. The principle (not blue, has visual indicator that's not underline) applies universally.

---

## The brand-link rule

**Why no blue links:**

Blue links are the default. They signal "generic web page." Brand-coloured links signal "this site has made deliberate design decisions." That signal compounds across the page — readers perceive higher quality, dwell longer, and pogo-stick less.

The rule applies to ALL internal links on the page — body copy, related-links blocks, navigation, FAQ answer text.

External links can be styled the same way (and should be, for consistency).

---

## Internal linking technical implementation

### Anchor text rules

- Every link uses descriptive anchor text — never "click here", "learn more", "read more"
- Anchor text varies across the page when linking to the same target (see `CORE__01_strategic__navigation-and-internal-linking.md` — anchor variation rule)
- Mix exact match, partial match, branded, and natural language anchors

### Link placement within paragraphs

- End-of-paragraph placement preferred over mid-paragraph
- Mid-paragraph links pull the reader off the page mid-thought; end-of-paragraph links offer the next step after the current thought is complete

### Related-links blocks

- Group by category (region, topic, format)
- Use accordion treatment if the block exceeds 8 items
- Apply brand styling consistently
- Include a label above the block ("More from Stayful in Yorkshire" / "Related guides")

### Tier-by-tier link strategy

Full detail: `CORE__01_strategic__navigation-and-internal-linking.md`

Quick reference:
- Tier 1 (sitewide nav) — highest value
- Tier 2 (body links from indexed high-traffic pages) — moderate value
- Tier 3 (related-links blocks on indexed pages) — low value
- Tier 4 (links from non-indexed pages) — near-zero value

The Phase 2 linking map labels each link by tier.

---

## Schema — the AEO/GEO angle

Schema is the bridge between the page and AI extraction systems. Done correctly, it makes the page easy to extract; done incorrectly, it makes the page invisible to systems that increasingly route traffic.

### What AEO / GEO systems extract

- **FAQ Q&A pairs** — direct citation in AI Overviews
- **WebPage description** — used as the AI summary of the page
- **Service area** — used to geo-filter results
- **AggregateRating** — used as a trust signal in AI recommendations
- **VideoObject** — used in video-rich snippets and AI Overviews

### The combined-array advantage

A single combined JSON-LD array (the rule in `CORE__02_phase-2__schema-rules.md`) extracts more reliably than multiple separate script blocks. AI extractors look for the array, find all six schema types together, and produce a coherent page summary.

Multiple separate script blocks confuse the extraction: the system may grab the first block (typically WebPage) and miss the FAQPage entirely.

### dateModified — the freshness signal

Quarterly: update the `dateModified` field in WebPage schema to today's date, and update the visible "Last updated" label.

A page with a 6-month-old dateModified gets de-prioritised in some AI extraction systems. A page with a current-month dateModified gets re-evaluated as fresh content.

This is a 30-second update with significant compounding value.

---

## Common failures

### Failure 1 — Blue links on a brand-styled page

Mixed signal: the page looks designed but the links look default. Readers perceive incoherence; some pogo-stick on the link styling alone.

### Failure 2 — "Click here" anchor text

Anchor text that gives no information about the destination. Wastes the SEO value of every internal link and confuses screen readers.

### Failure 3 — Mid-paragraph links inside the main argument

A link in the middle of the income-comparison paragraph that takes the reader to a calculator. They click; they leave; they don't return to finish the comparison.

### Failure 4 — Schema in multiple script tags

Splitting FAQPage and WebPage across two `<script>` blocks. Some extractors miss the second block; the page loses citation eligibility for the missing schema type.

### Failure 5 — Stale dateModified

Page published 18 months ago, content refreshed quarterly, but schema dateModified never updated. Page appears stale to AI systems even though content is current.

---

## How this applies to non-Stayful websites

Schema rules are universal. The specific schema types adapt:

- E-commerce: Product, Offer, AggregateRating, Review, BreadcrumbList, WebPage
- SaaS: SoftwareApplication, Organization, FAQPage, WebPage, AggregateRating
- Publisher: Article, NewsArticle, BreadcrumbList, WebPage, Organization
- Service business: Service, LocalBusiness, FAQPage, WebPage, AggregateRating

The combined-array rule, dateModified rule, and FAQ verbatim-matching rule apply to every type.

Internal linking technical rules are domain-neutral. The brand-link rule applies in every industry — the specific colour adapts to the brand palette.

---

## Related files

- `CORE__02_phase-2__schema-rules.md` — full schema-by-type detail
- `CORE__01_strategic__navigation-and-internal-linking.md` — strategic navigation + graded tier model + anchor variation
- `CORE__03_meta__title-and-description-rules.md` — meta-level keyword placement
- `HTML__schema__jsonld-combined-and-videoobject.html` — schema template
