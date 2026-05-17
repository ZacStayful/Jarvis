# AI Citation Structure and Discover Readiness

**Scope: Universal.** Two related principles: how to structure content so it can be extracted and cited by AI systems (Google AI Overviews, AI Mode, ChatGPT, Perplexity), and how to make the page eligible for Google Discover.

These are no longer optional. AI extraction is now a meaningful traffic source; Discover operates as a separate ranking framework.

---

## AI Citation Structure — the three-tier rule

Every page must be structured at three nesting levels:

### Macro-structure — the canonical section order

The full 20-section page order from `CORE__02_phase-2__canonical-section-order-and-html-additions.md`. AI extraction systems use this overall shape to understand what kind of page they're reading.

### Meso-structure — each H2 section is independently citable

Every H2 section must contain **one clearly bounded topic** and be readable in isolation. If a section can only be understood by reading the section above it, the section is not independently citable.

Test: copy-paste any H2 plus everything under it (up to the next H2). Does it make sense as a standalone answer to a question? If no, the section needs restructuring.

### Micro-structure — standalone facts in visually distinct formats

Any standalone fact (specific number, named entity, definitive statement) must be in a **visually distinct format** — a callout box, a stat cell, a labelled paragraph, a pull stat — not buried mid-paragraph.

The reason: AI extractors weight visually distinct content higher because it's been intentionally highlighted by the author. A figure buried in a 200-word paragraph is harder to extract reliably.

---

## The First 200 Words Rule

The opening 200 words of the page must function as a **compressed version of the entire page**.

If an AI system reads only the first 200 words and writes a one-paragraph summary, that summary should accurately represent:

- What the page is about
- The primary answer to the headline question
- The specific data point or proof
- The honest caveat
- A signal to the reader (or AI) that more detail follows

This isn't theoretical. Many AI systems extract from the top of the page as a shortcut. A page where the first 200 words are throat-clearing — brand intro, generic positioning, no specific answer — will be cited less often even when the rest of the page is excellent.

The 4-paragraph intro structure (`CORE__03_content__immediate-answer-and-intro-structure.md`) combined with the 50–70 word answer capsule typically lands the first 200 words exactly in this compressed form.

---

## Section-level authority

Every section on every page must earn its place on its own merits.

**The section-level test:**

> "Could this paragraph appear unchanged on a competitor's page about a different city / different topic?"

If yes, it must be rewritten with city-specific or topic-specific detail.

Generic paragraphs are extraction-poison. An AI system reading "Stayful provides professional Airbnb management to property owners" cannot distinguish it from any other management company's site. The page contributes nothing extractable for the topic it claims to be about.

Cities, topics, and data points must thread through every section — not just the headline.

---

## Discover Readiness

Google Discover (the mobile feed) operates under a distinct quality framework, separate from traditional search rankings. From February 2026, Discover surfaces content based on:

- Geographic relevance
- Topical depth
- Headline integrity
- Content originality

— evaluated independently of keyword performance.

### Headline integrity rule

Every H1 must accurately describe what the page covers. **It must not use curiosity-gap phrasing, emotional bait, or implied scarcity.**

Compliant H1: "Short-term letting in Nottingham — what your property could realistically earn"

Non-compliant H1: "Why Nottingham landlords are switching in 2026" (implies a trend story, page doesn't deliver)

Non-compliant H1: "The shocking truth about Airbnb in Sheffield" (clickbait)

### Important distinction — H1 vs meta title

The curiosity gap rule that applies to meta titles (see `CORE__03_meta__title-and-description-rules.md`) does NOT apply to H1s.

- **Meta title:** curiosity gap is required (it's the click decision moment)
- **H1:** accurate and descriptive only (Discover penalises curiosity-gap H1s)

This distinction matters. A title and H1 can be different lines on the same page:

- Title: "Short Let Management Nottingham — 65–70% Occupancy, Everything Handled"
- H1: "Short-term letting in Nottingham — what your property could realistically earn"

### Geographic signal rule

The city name (or primary location) must appear in:

- The H1
- The first sentence of body copy
- The meta description

The page's primary postcode must appear in the schema (`areaServed` in Service / LocalBusiness).

### Original reporting signal

Discover explicitly rewards content that contains in-depth, original, and timely information.

For Stayful: income figures must be sourced from live Stayful data or verified local comparables — not from general UK averages.

For other businesses: the equivalent is original first-party data, surveys, case studies, or analysis not findable elsewhere.

### Pre-publication confirmation step

> "Does this page contain at least one piece of [data] that could only come from someone actively [doing X] in this [city/topic]?"

If no, the page is not ready to publish.

---

## Why these rules exist

Google's AI Overviews, AI Mode, and Discover are downstream from the standard search ranking system, but they apply additional filters. A page that ranks well in traditional search can still be ignored by AI Overviews and Discover if it fails the citation structure or headline integrity rules.

The data shows AI citations and Discover impressions are increasingly important traffic sources — for some queries, larger than traditional organic clicks. Failing these rules leaves traffic on the table that the standard SEO playbook alone won't capture.

---

## Common failures

### Failure 1 — Generic openings that fail first-200-words

A page about "Airbnb management in Sheffield" that opens with three paragraphs about Stayful's history and team. An AI system reading the first 200 words extracts nothing about Sheffield, nothing about Airbnb management as a service, nothing actionable.

### Failure 2 — Curiosity-gap H1 expecting Discover traffic

H1: "What every Brighton landlord needs to know in 2026" — Discover penalises this. The page might rank in standard search but never appear in Discover.

### Failure 3 — Section-level authority failure

A "Why Stayful" section that's identical across 25 city pages. AI extractors recognise repeated content and rank the extraction signal lower.

### Failure 4 — Facts buried in prose

A specific 65% occupancy figure mentioned mid-paragraph in a 180-word block. The same figure presented in a stat cell or labelled callout extracts ~3x more reliably.

### Failure 5 — Missing city in geographic signal

A city page with the city in the H1 and schema but not in the first body sentence. Discover may not classify it as a geographic page.

---

## How this applies to non-Stayful websites

- E-commerce: original product photography, owner-tested specs, in-house benchmarking data are the originality signal
- SaaS: in-house user data, original benchmarks, methodology disclosures are the originality signal
- Publisher: primary reporting, exclusive sources, original analysis are the originality signal

The three-tier structure rule, first 200 words rule, section-level authority test, and Discover headline integrity all apply equally.

---

## Related files

- `CORE__03_content__immediate-answer-and-intro-structure.md` — the structure that produces a strong first 200 words
- `CORE__03_meta__title-and-description-rules.md` — the curiosity-gap rule for titles (distinct from H1)
- `CORE__02_phase-2__geo-ai-overview-checklist.md` — pre-publication checklist for AI citation readiness
