# Navigation and Internal Linking

**Scope: Universal.** Three rules that determine whether a page's internal links actually pass weight: the parallel navigation structure rule, the graded internal link value model, and the anchor text variation rule.

---

## Rule 1 — Navigation Parallel Structure

> If a content vertical has 3+ pages on the site, it must have its own nav folder.

When you create a new content vertical, you must build a parallel navigation folder. **If the navigation does not reflect the vertical, the vertical will not get the link signal it needs to support indexation across its pages.**

### Why this matters

Sitewide navigation links are the highest-value internal links (Tier 1 in the model below). A page that exists in the database but is not reachable from the nav is structurally orphaned. It can be linked to from body copy on other pages, but those links carry less weight than nav links from every page on the site.

For new verticals at scale, missing nav representation is the difference between "indexed cluster" and "page-by-page indexation failures."

### Practical application

| Site state | Required action |
|---|---|
| 1 new page in a new vertical | No nav change needed yet |
| 2 pages in a new vertical | Plan the nav addition; build the third page in parallel with nav update |
| **3+ pages in a new vertical** | **Mandatory: add a parallel nav folder immediately** |
| 10+ pages in an existing vertical with no nav folder | Critical — backfill the nav folder before any new pages are added |

### Example (current Stayful state)

Stayful's nav menu has "Airbnb Management" (with ~25 city links) and "Guaranteed Rent." It has no folder for Holiday Let Management, Serviced Accommodation Management, or any other vertical. Every holiday let city page is structurally orphaned at the nav level.

The remediation: add parallel nav folders for each vertical with 3+ pages. Until that's done, no amount of body-copy linking will compensate for the missing Tier 1 signal.

---

## Rule 2 — The Graded Internal Link Value Model

Not all internal links carry equal weight.

### Tier 1 — Highest value

- Sitewide navigation links
- Body links from the homepage
- Body links from other high-traffic, indexed pages

### Tier 2 — Moderate value

- Body links from indexed cluster siblings
- Body links from indexed hub pages
- Body links from indexed supporting guides

### Tier 3 — Low value

- Related-links blocks (footer-style at end of page)
- Links from low-traffic indexed pages
- Links from old pages with few external signals

### Tier 4 — Near-zero value

- Links from **non-indexed pages**
- Links from tag archives, sitemaps, or system pages
- Links from pages excluded by `noindex`

### Strategic implications

1. **Building cluster links between non-indexed pages provides almost no value.** The chain has to start from at least one indexed page.
2. **New content verticals require Tier 1 (navigation) and Tier 2 (indexed hub) lifts before they can self-support.** A new vertical of 8 pages all linking to each other, none indexed, is a closed loop with zero external signal entering.
3. **Pre-building cluster links pre-launch is fine** — the links activate as pages get indexed. But do not treat them as the indexation lift; they're insurance, not infrastructure.
4. **Phase 2 work that "adds internal links to support the page" only matters if the source pages are Tier 1 or Tier 2.** Document the tier of each link added.

### How to identify the tier of a candidate source page

For each candidate source page that will link to the target:

1. Is it in the main navigation? → Tier 1
2. Does `site:[domain][/slug]` confirm it's indexed? If no → Tier 4. Stop.
3. If yes — does it generate 100+ monthly impressions in GSC? → Tier 2
4. If yes — does it generate 10–100 monthly impressions? → Tier 3
5. Less than 10 impressions over 90 days? → Borderline Tier 3 / Tier 4

### Output format for Phase 2 linking maps

```
Internal linking map for [target page]:

Tier 1 (sitewide):
  - Nav placement: [folder name]

Tier 2 (indexed body links):
  - [source URL] — anchor text: "..."
  - [source URL] — anchor text: "..."
  - [source URL] — anchor text: "..."

Tier 3 (related-links blocks):
  - [source URL] — anchor text: "..."
  - [source URL] — anchor text: "..."

Tier 4 (pre-built, currently low value):
  - [source URL] — will activate once source indexes
```

The map is labelled by tier so it is clear which links carry which weight. A page with only Tier 4 links is at risk of failing indexation regardless of content quality.

---

## Rule 3 — Anchor Text Variation

Internal links pointing to the same target from multiple sources must use varied anchor text. Exact-match repetition signals pattern manipulation.

### The approximate mix

| Anchor type | Share | Example for target "/airbnb-management-leeds" |
|---|---|---|
| Exact match | ~20% | "Airbnb management Leeds" |
| Partial match | ~30% | "Leeds short-let management" / "manage your Leeds Airbnb" |
| Branded / topical | ~30% | "Stayful's Leeds operation" / "see our Leeds service" |
| Natural language | ~20% | "the team in Leeds" / "what we do in Leeds" |

### Practical rule

Each new page must use a different anchor phrase when linking to a sibling, even if linking to the same target from a different source page. This is enforced per-page, not just per-target.

When writing internal links across a session, track which anchor phrases have been used to each target. Vary deliberately.

### Why this rule exists

Internal links with identical anchor text across dozens of source pages look algorithmically generated. Google's pattern detection treats this as a manipulation signal. Varied anchor text mimics natural editorial linking — which is what passes weight.

The same applies to external linking patterns, but anchor variation is something you fully control on internal links.

---

## How this applies to non-Stayful websites

These three rules are domain-neutral.

**An e-commerce site** with 50 product categories should have category nav representation for every category with 3+ products. Category pages linking only from product detail pages (often non-indexed) is a Tier 4 trap.

**A SaaS site** launching a new pricing tier or use-case vertical must add it to nav as soon as the third page lands. Linking to it only from the homepage paragraph leaves it under-supported.

**A publisher** with topic clusters needs nav representation for every cluster with 3+ articles, otherwise old articles end up the only links to new ones — and the old articles may themselves be low-traffic Tier 3.

**A local services site** with multiple service lines needs nav representation per service line, not just per location.

---

## Common failures

- Building 20 city pages and adding none to the nav. Symptom: 60% indexation rate.
- Adding internal links to a new page only from other new pages in the same cluster. Symptom: closed loop, none of them index.
- Using identical anchor text on 25 sibling pages pointing to a hub. Symptom: hub flagged for manipulative linking signals.
- Treating a related-links footer block as equivalent to body links. Symptom: assumed link value that isn't there.
- Counting Tier 4 links toward the "3+ contextual links from indexed pages" indexation requirement. Symptom: the page never indexes despite the cluster being "well linked."

---

## Related reading

- `CORE__07_indexation__decision-tree.md` — Layer 2 (navigation) and Layer 3 (contextual links) of the indexation diagnostic
- `CORE__02_phase-2__post-publication-indexation-checklist.md` — what to verify within 24h of publishing
- `CORE__06_measurement__pruning-and-indexation-audits.md` — how to spot navigation-orphaned verticals during quarterly audits
