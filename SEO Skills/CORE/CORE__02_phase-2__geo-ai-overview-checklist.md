# Phase 2 — GEO and AI Overview Readiness Checklist

**Scope: Universal.** This is the narrower checklist that governs whether the page is ready to be cited by Google AI Overviews, AI Mode, and third-party LLMs.

It is a focused subset of the comprehensive Content Quality QA Checklist (`CORE__02_phase-2__content-quality-qa-checklist.md`). Run both — they overlap deliberately.

The Entity Consistency check at the top is unique to this checklist (it is a cross-page check) and does not appear elsewhere.

---

## Entity Consistency — cross-page verification

Verify across **all pages written in this session and the rest of the site**:

For Stayful pages:

- [ ] Management fee (15% + VAT) stated identically on every page
- [ ] Google rating (4.8 stars) stated identically on every page
- [ ] Occupancy range (65–70%) stated identically on every page
- [ ] Onboarding time (7–14 days) stated identically on every page
- [ ] Direct booking figure (40%) stated identically on every page
- [ ] No page contradicts a fact stated on another page in the cluster

For other businesses: verify the equivalent set of key facts that appear across multiple pages. The principle is **entity consistency** — Google's AI extraction systems penalise conflicting facts across a domain because they can't tell which is authoritative.

---

## Answer Capsule

- [ ] 50–70 words exactly — counted
- [ ] Contains one specific data point
- [ ] Placed in the top half of the page
- [ ] Self-contained — makes sense if extracted by an AI
- [ ] Does not imply a guaranteed outcome

---

## Objections Coverage

- [ ] Slow months / worst-case outcome addressed in body copy (not FAQ only)
- [ ] Outcome guarantee objection addressed honestly — no guarantee stated or implied
- [ ] Control / friction-reducer statement present near CTA
- [ ] Total fee / cost load addressed proactively in body copy

---

## PAA Coverage

- [ ] Every PAA question harvested in Phase 1 Step 7 answered somewhere on the page
- [ ] PAA question phrasing used verbatim as FAQ question text where applicable
- [ ] FAQ questions use lead language — not business language
- [ ] No PAA question answered with a vague or non-specific response

---

## Worst-Case Framing

- [ ] Worst-case figure shown alongside typical figure, never in isolation
- [ ] Worst-case followed immediately by structural reassurance
- [ ] The stability mechanism cited (Stayful: 40% direct booking figure)
- [ ] No fabricated floor or implied guarantee anywhere on the page

Full rules: `CORE__04_frameworks__worst-case-framing-and-proof-points.md`

---

## Structured Data

- [ ] FAQPage schema present, every visible FAQ has corresponding mainEntity entry
- [ ] Schema in a single combined JSON-LD array — not split across multiple script blocks
- [ ] `dateModified` in WebPage schema is today's date

---

## Content Depth Signals

- [ ] At least one specific named local demand driver on the page
- [ ] At least one specific data point with a source basis
- [ ] At least one worst-case / slow-month figure alongside the headline figure
- [ ] Outbound links to at least one authoritative external source

---

## Freshness

- [ ] "Last updated" date label is present and shows current month and year
- [ ] `dateModified` field in WebPage schema matches the last updated label

---

## Meta Title and Description

- [ ] Title rewrite confirmed if audit flagged failure — character count verified
- [ ] Description rewrite confirmed if audit flagged failure — character count verified
- [ ] Both rewrites confirmed against full rules in `CORE__03_meta__title-and-description-rules.md`

---

## Why this checklist exists separately

AI extraction systems (Google AI Overviews, AI Mode, ChatGPT browsing, Perplexity, etc.) rely on:

1. **Verifiable specific facts** that can be extracted standalone
2. **Consistency** across the domain (no contradictions)
3. **Structural cues** (schema, answer capsules, distinct sections)
4. **Honest framing** (no guarantees, no exaggeration that other sources will contradict)

A page can pass general SEO QA and still fail AI citation readiness if any of these four areas is weak. The most common failure is the entity consistency check — pages from different time periods state slightly different figures, and AI systems see this as low-trust signal.

---

## Run order

1. Run this checklist first — it surfaces cross-page issues that need fixing before page-level QA
2. Run `CORE__02_phase-2__content-quality-qa-checklist.md` second — full pre-publication
3. After publish, run `CORE__02_phase-2__post-publication-indexation-checklist.md`

---

## How this applies to non-Stayful websites

Entity consistency adapts to whatever your key business facts are. For an e-commerce site: pricing, shipping times, return policy figures must be consistent. For a SaaS site: pricing tiers, feature counts, integration counts must be consistent.

The PAA, worst-case, schema, and freshness rules are domain-neutral.

The honesty framing rule is universal: AI systems are trained to detect over-promising. A page that promises guaranteed outcomes is more likely to be cited as a negative example than as an authoritative source.
