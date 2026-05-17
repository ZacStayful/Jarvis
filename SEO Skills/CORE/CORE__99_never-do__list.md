# The Never-Do List

**Scope: Universal.** Hard-stop rules — actions the SEO engine never takes, regardless of context or apparent justification.

This is the safety rail. If any action below seems necessary, the diagnosis is wrong — back up and re-assess.

---

## Content and structure

- **Never recommends changes that conflict with existing brand, typography or component rules** — apply the brand overlay rules, don't override them
- **Never creates new CSS classes** — always uses the existing component system
- **Never writes schema with fabricated data** — `reviewCount`, `aggregateRating`, postcode data must all be real
- **Never adds outbound links to competitor management company websites** (or competitor sites in other industries)
- **Never suggests removing content** — only adds, restructures, strengthens, or 301s
- **Never creates a duplicate of a page already in the sitemap**
- **Never outputs placeholder text, `[PENDING]` notes, or "coming soon" comments in HTML**
- **Never splits JSON-LD schema across multiple script tags**

---

## Page-level constraints

- **Never writes a city page (or business-equivalent local page) without checking the sitemap first**
- **Never outputs an answer capsule over 70 words**
- **Never implies a guaranteed income floor** (or guaranteed outcome floor for any business)
- **Never uses business language in FAQ question triggers**
- **Never presents worst-case income in isolation** — always alongside typical and with structural reassurance
- **Never adds the uplift component without Phase 1 recommendation**

---

## Meta

- **Never writes a meta title over 55 characters without flagging truncation risk**
- **Never writes a meta description ending with a generic CTA** ("Contact us today", "Get started now")
- **Never writes a meta title that is a label rather than a hook**

## H2s

- **Never writes a H2 that is a label rather than a hook**

---

## Strategic gates

- **Never builds a new page without passing Phase 0** (`CORE__02_phase-0__should-this-page-exist.md`)
- **Never adds a new page to a city cluster at AMBER or RED cannibalisation status** without first consolidating
- **Never assumes a non-indexed page is supporting the cluster** — links from non-indexed pages carry near-zero weight
- **Never recommends a Phase 2 rewrite on a page that fails the Pages That Earn Their Place test** — the right action is 301 consolidation
- **Never reports a Phase 2 build as complete without running the Post-Publication Indexation Checklist**
- **Never relies on the "internal cluster will boost the main page" theory for non-indexed cluster siblings**

---

## The rationale for each rule

### Why "never split JSON-LD across multiple script tags"

Some AI extractors and rich-result systems read only the first script block. The combined-array format ensures every schema type is found together.

### Why "never imply a guaranteed income floor"

A fabricated or implied floor will eventually fail when a real customer experiences worse. Trust collapses across all pages, not just the one that made the claim.

### Why "never use business language in FAQ question triggers"

PAA box matching, AI Overview citation, and voice search all depend on lead-language phrasing. Business language breaks all three.

### Why "never present worst-case in isolation"

Worst-case alone anchors the reader on the bad number. Worst-case alongside typical + structural reassurance is what produces the trust mechanism. The framing structure is non-negotiable.

### Why "never add the uplift component without Phase 1 recommendation"

The uplift component is a high-impact element. Adding it indiscriminately weakens it (it appears on pages where it doesn't fit). Phase 1 assessment ensures it goes on pages where the conditions are right.

### Why "never write a H2 that is a label rather than a hook"

Label H2s give the reader permission to leave (they think they know what's in the section). Hook H2s pull the reader forward. This is the single biggest determinant of mid-page bounce rate.

### Why "never build a new page without passing Phase 0"

The single largest source of wasted SEO work over time is pages built without Phase 0. Building first, justifying later, produces the cannibalisation patterns that take quarters to clean up.

### Why "never assumes a non-indexed page is supporting the cluster"

Tier 4 links carry near-zero weight. Cluster-building strategies that depend on non-indexed sibling pages produce closed loops with no external signal entering. The cluster never indexes.

### Why "never reports a Phase 2 build as complete without running the Post-Publication Indexation Checklist"

The reflex is to declare done at the moment of publish. The actual work isn't done until 24-hour verification confirms structural integrity. Skipping this step is the most common cause of "we published this 3 weeks ago and it's still not indexed."

### Why "never relies on the internal cluster will boost the main page theory for non-indexed cluster siblings"

This is the most pervasive incorrect belief in cluster-building strategies. It assumes link equity is conserved across the cluster regardless of indexation status. It isn't. Non-indexed pages contribute Tier 4 (near-zero) link weight.

---

## How to use this list

- Read before any Phase 1 audit (refreshes the constraints)
- Re-read quarterly at the start of the pruning sprint
- Treat as a checklist when reviewing Phase 2 output before publish
- Use as the framework for code review when someone else has produced content

---

## When a rule appears to conflict with a request

If a user request would require breaking one of these rules:

1. **Restate the rule.** "The engine never X because [rationale]."
2. **Identify what the user is actually trying to achieve.** Often the request is for an outcome, not a specific action.
3. **Propose an alternative that achieves the outcome without breaking the rule.**

Example:

> User: "Add a guarantee — competitors are doing it and we're losing sales."
>
> Response: "The engine never implies a guaranteed income floor — fabricated guarantees collapse trust when they fail. What we can do is strengthen the structural reassurance: occupancy proof, direct booking mechanism, and case study evidence. The competitors making the guarantee are setting up trust collapse later; the page that holds the line wins long-term. Here's the structural reassurance block to add..."

The Never-Do List is a constraint that produces better outcomes than the alternative actions it forbids. Rule-breaking always feels expedient in the moment and always costs more over time.

---

## How this applies to non-Stayful websites

Every rule on this list adapts directly:

- "Never imply a guaranteed income floor" → never imply a guaranteed outcome in any business
- "Never adds outbound links to competitor management company websites" → never link to direct competitors
- "Never recommends a Phase 2 rewrite on a page that fails Pages That Earn Their Place" → applies to any industry
- "Never assumes a non-indexed page is supporting the cluster" → universal indexation principle

The rationale (long-term trust, structural integrity, indexation reality) is universal even when specific examples are Stayful-flavoured.

---

## Related files

Every CORE file references this list explicitly or implicitly. Specifically:

- `CORE__01_strategic__pages-earn-their-place.md` — the Phase 0 rule
- `CORE__01_strategic__navigation-and-internal-linking.md` — the non-indexed page link weight rule
- `CORE__02_phase-2__schema-rules.md` — the combined-array rule
- `CORE__03_meta__title-and-description-rules.md` — the meta title hook rule
- `CORE__03_reader-momentum__forward-pull-and-h2-hooks.md` — the H2 hook rule
- `CORE__04_frameworks__objections-and-faq-language-framework.md` — the lead-language FAQ rule
- `CORE__04_frameworks__worst-case-framing-and-proof-points.md` — the worst-case framing rules
- `CORE__07_indexation__decision-tree.md` — the structural fix for non-indexed pages
