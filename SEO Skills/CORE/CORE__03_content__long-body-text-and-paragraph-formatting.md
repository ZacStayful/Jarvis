# Long Body Text and Paragraph Formatting

**Scope: Universal.** Three rules: the accordion treatment for blocks over 75 words, one sentence per paragraph, and the labelled-paragraph pattern for post-chart commentary.

---

## The accordion rule

> Any continuous block of body text exceeding approximately 75 words must be presented inside an accordion dropdown.

Why: a wall of text on a service page lowers scroll-depth, lowers session time, and signals "lots of words, low information density" to ranking algorithms.

### Exceptions — do NOT convert to accordion

- The intro paragraph (it must be visible)
- The featured snippet answer box and answer capsule
- Bullet lists and tables
- Pull stats and stat rows
- CTA blocks
- The first paragraph below any H2 (it sets context for the section)

### What goes in an accordion

- Long-form explanations of regulatory / tax topics
- Detailed how-it-works walkthroughs beyond the 4-step summary
- Demand drivers / supporting context for a city
- Owner / customer case studies beyond the headline pull quote
- Related-links blocks for cluster cross-links

### How an accordion behaves

- `<button>` trigger with chevron SVG that rotates 180° on open
- Body: `max-height: 0` to `max-height: 400px` (or `2000px` for long sections) via CSS transition
- Use CSS `max-height` transitions — never JavaScript-driven height recalculations (CWV impact)
- On open, animate any embedded bar widths via `data-width` attributes

Stayful HTML pattern: `HTML__components__faq-accordion.html`

---

## One sentence per paragraph

Every time a sentence ends with a full stop, begin a new `<p>` tag.

Why:

- One-sentence paragraphs scan faster on mobile
- They isolate each idea so the reader cannot mentally "skip" a sentence buried in a long paragraph
- They produce a more readable rhythm — long paragraphs feel like work
- AI extraction systems treat each paragraph as a candidate citation unit; one sentence per paragraph creates more clean extraction targets

### Exception

When a sentence directly elaborates the immediately preceding one in a way that would lose meaning if separated, the two can sit together. This is rare — usually two sentences "needing to be together" is a signal that one of them is filler.

### Example — wrong

```html
<p>Stayful manages every part of short-term letting in Leeds. We handle listings, photography, dynamic pricing, guest communications and check-ins. Our owners report 65-70% occupancy on average, beating the AirDNA market average of 55%. We charge 15% + VAT with no setup fee.</p>
```

### Example — right

```html
<p>Stayful manages every part of short-term letting in Leeds.</p>
<p>We handle listings, photography, dynamic pricing, guest communications and check-ins.</p>
<p>Our owners report 65–70% occupancy on average, beating the AirDNA market average of 55%.</p>
<p>We charge 15% + VAT with no setup fee.</p>
```

---

## Post-chart data commentary — labelled paragraphs

Paragraphs following a data visual (seasonality bar chart, income comparison panel, stat row) must each carry a short uppercase label.

### Standard labels

- `Seasonal range`
- `Quietest month`
- `Recovery pace`
- `Owner example`
- (or topic-equivalent labels)

### HTML pattern

```html
<p>
  <span style="display:block; font-size:11px; font-weight:700; text-transform:uppercase;
               letter-spacing:0.08em; color:#5D8156; opacity:0.55; margin-bottom:4px;">
    Quietest month
  </span>
  One sentence of body copy here.
</p>
```

The label adds a meso-structure cue that helps both readers and AI extractors. A reader scanning sees "Quietest month — [the figure]" and can immediately locate the specific fact. An AI extractor sees a clearly bounded fact with a category label.

### When to use labels

- Always after a seasonality bar chart
- Always after a stat row that surfaces a specific data point
- Always after an income comparison panel
- After any visual that introduces a fact the labelled paragraph elaborates

### When not to use labels

- General body paragraphs that aren't elaborating a visual
- Intro paragraphs (the four-paragraph structure governs these)
- FAQ answers (the question itself is the label)

---

## Related links — city pages

City pages have related links to other cities. Group these into regional accordion rows:

- North East & Yorkshire
- North West
- Midlands
- London & South East
- South West
- (Scotland / Wales / Northern Ireland as applicable)

Each region is one accordion row. Inside: the list of city links for that region. This prevents a 25-link wall and lets the reader find the city they want.

---

## Why these rules together

The accordion rule, one-sentence-per-paragraph rule, and labelled-paragraph pattern produce pages that:

1. Read clean on mobile (one-sentence paragraphs)
2. Have visible content density without being walls of text (accordions)
3. Make every fact extractable (labelled paragraphs)
4. Score well on engagement metrics (scroll depth, time on page)

Each rule alone gives some improvement. Applied together they compound.

---

## Common failures

### Failure 1 — Wall of text under H2

A 600-word H2 section with no accordion. The reader scrolls past it; engagement drops 50%+ vs. the same content in 4 accordion sections.

### Failure 2 — Three-sentence paragraphs

The default writer instinct. Two sentences per paragraph is mostly OK; three is the point at which scanning breaks.

### Failure 3 — Unlabelled post-chart paragraphs

The bar chart shows seasonality; the paragraph below explains it. Without a label, the reader doesn't know what the paragraph is doing. The label "Quietest month" pre-loads the reader's expectation.

### Failure 4 — Accordion hiding the primary answer

If a question is likely to appear in a Google PAA box for the primary keyword, the answer to that question must be visible as **open content** somewhere on the page. Hiding it inside an accordion means the AI extractor sees the snippet question as unanswered.

### Failure 5 — Over-using accordions

Every section in an accordion. Reduces visible content; the page becomes a list of headings. Use accordion for long-form supporting content, not for primary answers.

---

## How this applies to non-Stayful websites

These rules are domain-neutral.

For an e-commerce product page: long-form spec details and FAQ in accordion; key benefits and pricing visible; product description in one-sentence paragraphs.

For a SaaS landing page: technical deep-dives and integration details in accordion; headline value prop and pricing visible.

For a publisher: long-form supporting context in accordion; main argument visible.

The 75-word ceiling, one-sentence-per-paragraph, and labelled-paragraph patterns scale across content types.

---

## Related files

- `CORE__03_content__immediate-answer-and-intro-structure.md` — exception for intro paragraphs (always visible)
- `CORE__05_technical__core-web-vitals-and-engagement.md` — why accordion transitions must be CSS, not JS
- `HTML__components__faq-accordion.html` — Stayful accordion HTML pattern
