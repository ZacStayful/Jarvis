# Quickstart — Audit an existing page

**Scope: Universal.** Use this when a page is live and either (a) failing to rank, (b) failing to get indexed, or (c) being assessed for routine optimisation.

---

## The fork in the road — indexed or not?

Before running any audit, check indexation status:

```
site:[domain]/[page-slug]
```

Three outcomes:

| Result | What it means | What to do |
|---|---|---|
| **INDEXED** | Page is in Google's index | Run a standard Phase 1 audit — Steps 1–10 below |
| **NOT INDEXED** | Page exists but Google has not indexed it | The fix-list is structural, not content. Go to `CORE__07_indexation__decision-tree.md` BEFORE running any content audit. Most "improve the content" instincts at this stage produce no result. |
| **EXCLUDED INTENTIONALLY** | Page is `noindex`'d or redirected | No audit needed. Decide if exclusion was correct; if not, fix the directive. |

This fork is critical. Skipping it is the single most common source of wasted optimisation effort.

---

## If INDEXED — run Phase 1

Open: `CORE__02_phase-1__audit-methodology.md` for the full 10-step methodology.

### Step 1 — Fetch and parse the page

Extract:
- Title tag
- H1
- All H2s in order
- First 100 words of body copy
- All FAQ questions
- Internal links (hrefs)
- External links
- All JSON-LD blocks
- Meta description
- Presence/absence of: phone, address, named person, review stars, video, date label, breadcrumbs, income calculator embed (or business equivalent)

### Step 2 — Competitive SERP research

Search the primary keyword. Identify top 5 ranking pages and classify SERP intent:

- 4+ are guest/end-user content → flag as critical; identify owner-intent keyword variants
- 1–3 are competitor service pages → fetch and analyse them in Step 3
- 0 are service pages → first-mover opportunity

Open: `CORE__02_phase-1__competitor-and-keyword-research.md` for the full competitor analysis matrix.

### Step 3 — Competitor gap matrix

For every direct competitor in top 10, and regional competitors, record presence/absence of: named local person with photo / local-specific data / seasonality data / tax section / service tier comparison / Trustpilot embed / all five schema types / county hub linking / outbound authority links / video / "how it works" steps / etc.

### Step 4 — Keyword gap research

Check ranking status across the relevant keyword clusters: owner-intent, tax/regulatory, comparison, switching/control, long-tail AEO.

### Step 5 — Schema audit

Mark Present / Missing / Incomplete for: FAQPage, WebPage, LocalBusiness, Service, AggregateRating, BreadcrumbList, VideoObject (if applicable).

Open: `CORE__02_phase-2__schema-rules.md` for required fields per type.

### Step 6 — On-page technical checks

Run the full technical pass/fail matrix in `CORE__02_phase-1__audit-methodology.md`.

### Step 7 — PAA harvesting

Search the primary keyword and 2–3 secondary keywords. Record every People Also Ask question verbatim. Flag which are not currently answered on the page.

### Step 8 — Canonical, cannibalisation, indexability, technical integrity

- Canonical tag: self-pointing? pointing elsewhere? absent?
- Cannibalisation: `site:[domain] [primary keyword]` — count overlapping intent pages
- Image alt text gaps
- Featured snippet ownership (who owns it; what format)

### Step 9 — Off-page and citation audit

Citation gaps on tourism authorities, council directories, local listings, Trustpilot consistency, Google Business Profile setup.

### Step 10 — Competitor backlink gap

If Ahrefs/Semrush available, identify domains linking to competitors but not to your site.

---

## Output the Phase 1 audit report

Open: `CORE__02_phase-1__audit-report-format.md` for the exact structure.

Key sections:
- Header (URL, primary keyword, primary profile, SERP classification, audit date)
- **Indexation status** (new in v2.0)
- Score summary (critical / high / medium counts; uplift recommendation; cluster cannibalisation status)
- Sections 1–10 of the report
- Existing strengths (3–5 max)

End with: "Phase 1 complete. Ready to begin Phase 2 — type 'write Phase 2' to continue."

---

## Move to Phase 2 only on explicit instruction

Open: `CORE__02_phase-2__canonical-section-order-and-html-additions.md`

Phase 2 produces self-contained HTML blocks ready to paste into the CMS. It addresses Critical and High priority issues from Phase 1.

After writing all Phase 2 HTML, run these in order:

1. `CORE__02_phase-2__geo-ai-overview-checklist.md` — narrower AI/AEO citation readiness
2. `CORE__02_phase-2__content-quality-qa-checklist.md` — comprehensive pre-publication QA
3. `CORE__02_phase-2__post-publication-indexation-checklist.md` — 24h / 7d / 14d / 30d / 60d gates

---

## If NOT INDEXED — different workflow

Do NOT run a content audit. Open: `CORE__07_indexation__decision-tree.md`

Diagnose in this order; stop at the first failing layer; fix it; wait 2 weeks; recheck.

1. **Layer 1 — Sitemap presence.** Is the URL in `sitemap.xml`?
2. **Layer 2 — Navigation.** Is the page in the main nav?
3. **Layer 3 — Contextual links.** 3+ links from already-indexed pages?
4. **Layer 4 — Cannibalisation.** Is the cluster over the hard limit?
5. **Layer 5 — Distinctiveness.** Is the page templated to look like its siblings?
6. **Layer 6 — External signals.** Any referring domains? Any impressions ever?

If Layers 1–4 are clean and the page has been live 30+ days without indexation, then — and only then — run a full Phase 1 audit with the distinctiveness check enabled.

If 60+ days post-remediation and still not indexed: the page is a pruning candidate. Go to `CORE__07_indexation__pruning-framework.md`.

---

## Routine optimisation (no specific problem to solve)

For periodic re-audits not triggered by a ranking or indexation failure, run Phase 1 with these abbreviated focuses:

- Update `dateModified` schema field and last-updated label to current month
- Refresh business facts and figures if they've changed
- Re-harvest PAA — new questions get added to FAQ
- Confirm all outbound authority links still live
- Confirm cluster cannibalisation status hasn't drifted

Cadence per `CORE__06_measurement__update-cadence-and-triggers.md`: quarterly for figures, annually for full re-audit.

---

## What this audit does NOT do

- It does not recommend removing content unless cannibalisation requires consolidation
- It does not split JSON-LD across multiple script tags
- It does not produce fabricated data, [PENDING] notes, or placeholder text
- It does not assume "improving the content" will fix an indexation problem — see `CORE__07_indexation__vs-ranking-mental-model.md`
