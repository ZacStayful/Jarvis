# Phase 1 — Audit Report Format

**Scope: Universal.** The exact structure of the Phase 1 deliverable. Every audit produces this format.

A reusable blank version is available at `TEMPLATE__audit-report.md`.

---

## Header block

```
PHASE 1 SEO AUDIT
Page audited: [full URL]
Primary keyword: [derived from H1]
Primary lead profile served: [A / B / C / D / E / F  — or business-equivalent profile]
SERP intent classification: [Guest-intent dominated / Owner-intent competitive / First-mover opportunity]
Direct competitors found: [list of competitor URLs analysed]
Audit date: [YYYY-MM-DD]
```

---

## Indexation status (mandatory)

```
INDEXATION STATUS: [INDEXED / NOT INDEXED / EXCLUDED INTENTIONALLY]

If NOT INDEXED:
  First failing layer from Indexation Decision Tree: [Layer 1–6]
  Recommended indexation action: [sitemap fix / nav add / contextual links / cluster pruning / distinctiveness review / external signals]
```

---

## Score summary

```
SCORE SUMMARY
  Critical issues: [N]
  High priority: [N]
  Medium priority: [N]
  Strengths found: [N]

Uplift component: [Recommended / Not recommended] — [one sentence reason]
Cluster cannibalisation status: GREEN (≤3 intents) / AMBER (4–5) / RED (6+)
```

---

## Section 1 — Critical issues

Badge: **CRITICAL**.

Format per issue:

```
CRITICAL — [issue title]
What it is: [one paragraph]
Impact: [why this is critical, not just high]
Recommended fix: [specific Phase 2 action]
```

Examples of issues that classify as critical:
- Page is not indexed
- Canonical tag points to a different URL
- Cluster cannibalisation at RED (6+ overlapping intent pages)
- Wrong primary keyword (SERP intent mismatch)
- Schema is broken or missing entirely
- Worst-case / honest framing entirely absent from a Profile B page
- Income guarantee implied anywhere

---

## Section 2 — High priority

Badge: **HIGH**.

Format same as Section 1.

Examples:
- Cluster cannibalisation at AMBER
- 5+ PAA questions not covered
- 3+ schema types missing
- Meta title or description fails multiple rules
- Top CTA placed before answer capsule
- No local-specific data on a city page
- No outbound authority links
- Internal links use blue / wrong colour
- Featured snippet owned by competitor with format the target page lacks

---

## Section 3 — Medium priority

Badge: **MEDIUM**.

Format same.

Examples:
- Canonical tag absent (but page indexed)
- Date label missing
- 1–2 schema fields incomplete
- 1–2 PAA questions not covered
- Image alt text generic
- Some H2s are labels, not hooks
- One section thinner than weakest competitor

---

## Section 4 — Competitor gap matrix

Table format:

```
Feature                                Stayful   [Comp 1]   [Comp 2]   [Comp 3]
Named local person with photo            N           Y          Y          N
Local-specific income data               Y           Y          Y          Y
Monthly seasonality data                 N           Y          N          Y
... (full row set from Step 3 of methodology) ...

Stayful is missing N features that all 3 competitors have:
  - [feature 1]
  - [feature 2]
  - ...

Stayful has N features no competitor has (strengths):
  - [feature 1]
  - ...
```

---

## Section 5 — Keyword opportunities

Organised by the five clusters plus AEO targets.

```
Cluster 1 — Primary owner intent
  "[query]" — Stayful rank: [#N] — Competitor rank: [#N] — Action: [...]
  "[query]" — ...

Cluster 2 — Tax / regulatory
  ...

Cluster 3 — Comparison
  ...

Cluster 4 — Switching / control
  ...

Cluster 5 — Long-tail AEO
  ...

GAPS WHERE NO PAGE RANKS (highest priority):
  - "[query]" — [recommendation]
```

---

## Section 6 — Missing content sections

The sections from the canonical 20-section order that are missing from the target page.

```
Missing or insufficient:
  - [Section name from canonical order]
  - [Section name]
  - ...

Present but weak:
  - [Section name] — [why it's weak]
  - ...
```

Reference: `CORE__02_phase-2__canonical-section-order-and-html-additions.md`

---

## Section 7 — Schema gaps

Per schema type:

```
FAQPage: [Present / Missing / Incomplete] — [details]
WebPage: ...
LocalBusiness: ...
Service: ...
AggregateRating: ...
BreadcrumbList: ...
VideoObject: [Required / Not applicable]
```

---

## Section 8 — Off-page and citation gaps

```
Regional/local authority listings:
  - [authority] — listed / not listed
  - ...

Trustpilot/Yell/Yelp NAP consistency: [Y / N — discrepancies if any]

Google Business Profile:
  - Service area: [correct / incorrect]
  - Primary category: [correct / incorrect]

Competitor backlink gaps (if Ahrefs/Semrush available):
  - [top 5 priority outreach domains]
```

---

## Section 9 — Meta title and description assessment

```
CURRENT META TITLE: [text] — character count: [N]
Issues:
  - [issue 1]
  - [issue 2]

CURRENT META DESCRIPTION: [text] — character count: [N]
Issues:
  - [issue 1]
  - [issue 2]

Recommend rewrite: [Y / N]
```

If rewrite recommended, do NOT write the rewrites in Phase 1 — those go in Phase 2 Section K.

---

## Section 10 — Existing strengths

Three to five maximum. Brief.

```
Existing strengths to preserve in Phase 2:
  1. [strength]
  2. [strength]
  3. [strength]
```

This section exists to prevent Phase 2 from accidentally removing things that work.

---

## Closing statement

After the report, output verbatim:

> Phase 1 complete. Ready to begin Phase 2 — HTML fixes and additions. Type 'write Phase 2' to continue, or ask questions about the audit first.

Do not begin Phase 2 until explicitly told to continue.

---

## What this report does NOT include

- Specific HTML fixes — those are Phase 2
- Specific meta title rewrites — those are Phase 2 Section K
- Specific FAQ rewrites — those are Phase 2
- Cluster page recommendations — those are Phase 3 (and only if Phase 3 pre-conditions are met)
- Backlink outreach copy — out of scope
- Branding or design feedback — out of scope unless it affects SEO directly (e.g. blue links violate engagement rules)

---

## How this applies to non-Stayful websites

The format is industry-neutral. The keyword cluster names adapt. The competitor gap matrix rows adapt to industry-relevant signals (Trustpilot may not apply; G2 reviews might for SaaS; trade certifications might for services).

The structural elements — Critical/High/Medium classification, indexation status, score summary, gap matrix, strengths — are the same for every audit.
