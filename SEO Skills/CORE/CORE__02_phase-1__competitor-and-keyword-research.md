# Phase 1 — Competitor and Keyword Research

**Scope: Universal.** Detailed methodology for Steps 2, 3, 4, 7 and 10 of Phase 1.

---

## SERP intent classification (Step 2)

Search Google for the primary keyword. Examine top 10 results.

| Top 5 composition | Classification | Implication |
|---|---|---|
| 4+ guest-intent / end-user content | **Guest-intent dominated** | Owner-intent commercial pages will struggle. Identify owner-intent variant keywords with different SERP. |
| 1–3 competitor service pages | **Owner-intent competitive** | Standard SERP. Analyse competitors. |
| 0 competitor service pages | **First-mover opportunity** | Rare. A genuine ranking opening exists. |

If guest-intent dominated, the page targets the wrong primary keyword. Find an owner-intent variant that returns commercial-intent SERPs, and switch the primary keyword. Otherwise the page is competing against editorial content with a different intent — it will not rank.

---

## Competitor page analysis matrix (Step 3)

For every competitor in top 10 AND every regional competitor identified separately, fetch their location/topic page and record presence (Y/N) for each row:

### Authority and credibility signals
- Named local person with photo
- Trustpilot embed
- AggregateRating schema with real review count
- Years in business stated
- Branded video embed
- VideoObject schema

### Local specificity signals
- Local-specific income / outcome data
- Monthly / seasonal data presented visually
- Named local demand drivers
- Outbound links to authoritative local sources
- Listed on regional tourism/trade authority

### Conversion architecture signals
- "How it works" steps block
- Service tier comparison table
- Owner/customer portal callout
- Primary conversion embed near top
- Primary conversion embed near bottom

### Content depth signals
- Tax / regulatory section
- Council tax / local rates section
- Planning permission / licensing section
- Worst-case / honest framing in body copy
- Control / friction-reducer statement near CTA
- FAQ in lead language (not jargon)
- FAQ with PAA-matched phrasing

### Schema signals
- FAQPage schema
- LocalBusiness or Service schema
- BreadcrumbList schema
- Combined JSON-LD (single script)

### Meta signals
- Meta title with curiosity gap
- Meta description with specific figure
- Meta description with disqualifier

### Cluster signals
- County / regional hub page linking
- Calculator/data page linking
- Specialist supporting page linking

Output as a table: rows = competitor pages, columns = the above checks. Tally count of present checks. The target page's required additions are the checks that ALL major competitors have but the target does not.

---

## Keyword gap research (Step 4)

Run rank checks across these clusters. Adapt the placeholders to your industry.

### Cluster 1 — Primary owner / buyer intent

- "[city] [service] company"
- "manage my [thing] [city]"
- "[service] [county]"
- "best [service] [city]"

### Cluster 2 — Tax / regulatory / compliance

- "[regulatory framework] [region]"
- "[business tax topic] [city]"
- "[licensing requirement] [postcode/area]"
- "[rule name] [county]"

### Cluster 3 — Comparison and evaluation

- "best [service] company [county]"
- "[service] fees [county]"
- "[competitor brand] vs [other competitor brand]"
- "[competitor brand] review"

### Cluster 4 — Switching / control / decision

- "switch [service] company [city]"
- "can I use my [thing] if I [service]"
- "do I lose control of my [thing] [service]"
- "[service] vs [alternative service] [city]"
- "is [service] worth it [city]"

### Cluster 5 — Long-tail AEO / AI Overview targets

- "how much can I earn from a [thing] in [city]"
- "is a [thing] worth it in [city]"
- "do I need [permission] for [thing] [city]"
- "best month to [activity] in [region]"
- "what happens when [worst case scenario]"
- "can [outcome] be guaranteed"

### Recording format

For each query in each cluster:

| Query | Stayful rank | Top competitor rank | Top result type | Action |
|---|---|---|---|---|
| ... | #N or "not visible" | #N | service / editorial / forum | "target with FAQ section" / "new page concept" / "skip — wrong intent" |

**Gaps where no page ranks are highest priority.** Those represent uncontested commercial intent — the rare case where a single well-built page can take page 1 within months.

---

## PAA harvesting (Step 7)

Search the primary keyword. Scroll the SERP, expand each PAA box (Google reveals more questions as you expand). Search 2–3 secondary keywords; PAA changes per query.

Record every PAA question verbatim. Then for each:

| PAA question (verbatim) | Currently answered on target page? | If yes, same phrasing? | Action |
|---|---|---|---|
| "..." | Yes / No | Yes / No | Add to FAQ / rewrite question to match / no action |

### Why verbatim phrasing matters

PAA questions are the language Google has confirmed people actually use. Rewriting them into "cleaner" phrasing breaks the matching signal. If Google shows "Can I airbnb a property I own?" as a PAA, your FAQ question must be "Can I airbnb a property I own?" — not "Can I list a property I own on Airbnb?"

### Where PAA questions go in Phase 2

PAA questions not currently covered are priority FAQ additions in Phase 2, using the exact verbatim phrasing.

---

## Competitor backlink gap (Step 10)

For each direct competitor identified in Step 3:

1. Pull their referring domain list (Ahrefs, Semrush, or Moz)
2. Filter to UK-relevant domains (or your region equivalent)
3. Filter to domains that do NOT link to your site
4. Filter to high-relevance categories: regional tourism authorities, local news outlets, accommodation portals, event websites, professional associations, council/government sites

### Output format

```
COMPETITOR BACKLINK GAPS

[competitor name 1] — N unique referring domains not linking to us
  High-priority targets:
    - [domain] — [relationship: media / authority / portal]
    - [domain] — [relationship]
    ...

[competitor name 2] — N unique referring domains not linking to us
  ...
```

The top 10 highest-relevance domains across all competitors are outreach priorities for the next quarter.

### If no Ahrefs / Semrush access

Flag in the report: "Full backlink gap analysis requires Ahrefs or Semrush — run separately when access available."

You can still do a manual version:
- Google search `"[competitor brand]" -site:[competitor domain]` to find branded mentions
- Filter to regional/authority sites
- Note which mention the competitor but not your brand

This is a rough proxy. Use it only if no tool access is available.

---

## How this applies to non-Stayful websites

The five keyword clusters generalise to any commercial / service business:

| Cluster | E-commerce equivalent | SaaS equivalent |
|---|---|---|
| Primary owner / buyer intent | "[product] online", "buy [product]" | "[service] software", "[problem] tool" |
| Tax / regulatory | Shipping restrictions, age verification, returns law | Data residency, compliance, SOC2 |
| Comparison and evaluation | "best [product] for [use case]" | "[brand A] vs [brand B]" |
| Switching / control | "return [product]", "what if [product] doesn't fit" | "switch from [competitor]", "cancellation policy" |
| Long-tail AEO | "how to [task] with [product]" | "how to [outcome] using [software]" |

PAA harvesting is universal — every commercial query has PAA. The principle (use verbatim phrasing in FAQ) is universal.

Competitor backlink gap analysis is universal — every industry has authority domains worth linking from.
