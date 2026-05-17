# People-First Content Test

**Scope: Universal.** Five tests every page must pass before publication. A page that fails any of the five tests must be revised before publication.

This is the final content quality gate, run alongside the comprehensive QA checklist (`CORE__02_phase-2__content-quality-qa-checklist.md`).

---

## Test 1 — Does the page answer the reader's actual question?

Not the question the business wants the reader to ask. The question the reader typed.

**Pass:**
- The reader searched "how much can I earn from an Airbnb in Sheffield" → the page answers with a specific income range for Sheffield, in the top half.

**Fail:**
- The same reader gets a page about Stayful's history, awards, and team — with the income range buried in section 6.

Test by re-reading the H1 and the first 200 words from the perspective of someone who has just typed the primary keyword. Does this page deliver what they expected? If they would press back-to-Google, the page fails.

---

## Test 2 — Is the core answer visible without scrolling?

On mobile, a reader should be able to see — without scrolling:

- The H1
- The intro paragraph
- The answer capsule
- The top of the CTA block

If the answer capsule is below the fold on mobile, the page fails this test.

This rule comes from data: bounce rate increases dramatically when the user has to scroll to find the answer. Pages that put the answer above the fold convert at meaningfully higher rates.

**How to test:** Open the page on a real mobile device (or browser dev tools at iPhone resolution). Without scrolling, can you see H1 + intro + answer + top of CTA? If anything is hidden, restructure.

---

## Test 3 — Would a reader need to search again after reading this?

If the reader leaves and re-Googles the same question with slight variation ("what's a more typical Sheffield Airbnb income?" / "Sheffield short-term let income worst case?") then the page didn't fully answer the question.

A page that fully answers the question covers:
- The headline answer
- The specific number
- The worst-case / honest caveat
- The mechanism (how / why)
- The disqualifier (when this isn't the right answer)

Missing any of those five leaves the reader incomplete. They'll search again.

This test is the inverse of pogo-sticking. A page that prevents the second search is a page Google sees as having "satisfied the query."

---

## Test 4 — Does the page contain information that couldn't be found elsewhere?

If the entire page could be assembled from generic templates and public data, why does it exist?

**Information that earns the page's existence:**
- First-party data (Stayful: postcode-specific lead enquiry data)
- Operator knowledge (named local demand drivers, observed guest profiles, seasonality patterns)
- Original analysis (regional uplift calculations, occupancy benchmarks)
- Honest framing of risks specific to this market

**Information that doesn't earn the page's existence:**
- "Sheffield is a great place to short-let your property" (generic)
- "Our 5-step process for managing your Airbnb" (templated)
- "Top tips for short-term letting" (commodity content)

If the page passes Test 4, it has at least three pieces of content that could only come from someone actively in this business in this market. The earlier expert-insight markers rule in `CORE__02_phase-2__content-quality-qa-checklist.md` enforces this — but Test 4 is the gut check.

---

## Test 5 — Does the page leave the reader better informed than when they arrived?

The reader started with a question. The page either:

- Answered it with new information (pass)
- Repeated information they already had (fail)
- Confused them or added uncertainty (catastrophic fail)

A page that simply repeats what the reader already knows is a wasted slot. Even worse: pages that introduce uncertainty without resolution leave the reader less likely to act than before they arrived.

**Pass indicators:**
- The reader could now have a specific conversation about Sheffield income with someone else
- The reader knows what the slow months look like (they didn't before)
- The reader knows what they would actually keep after fees (they didn't before)
- The reader knows their next concrete step

**Fail indicators:**
- The reader still doesn't know a specific number
- The reader is more confused about whether short-let is worth it
- The reader can't articulate what makes this provider different from others

---

## Running the test

Apply all five tests sequentially. Pass criteria are binary — yes or no. If any test returns "no" or "uncertain," revise the page before publication.

The tests are best applied by someone who didn't write the page. The writer is too close to the content; they know what was meant. The test is whether the cold reader sees what the writer thought they wrote.

---

## When the test should fail

The test catches:

- Marketing copy that explains the business instead of answering the reader's question
- Templated city pages that could exist on any competitor's site
- Pages that bury the answer below the fold
- Pages with generic statements ("strong local demand") where specifics are needed
- Pages that leave the reader to do additional searches

If the page passes Phase 1 audit, passes QA checklist, but fails People-First Test — the test is the catch. It's the final gate before publication.

---

## Why this test exists

Google's Helpful Content systems evaluate content holistically. They reward content that:

- Demonstrates expertise (Test 4)
- Demonstrates authority (Tests 1, 3)
- Demonstrates trustworthiness (Test 5)
- Satisfies query intent (Tests 1, 2, 3)

The People-First Test is the human-readable version of those algorithmic checks. A page that passes the test is highly likely to be classified as helpful content. A page that fails any test is at risk regardless of how well it performs on technical SEO checks.

---

## How this applies to non-Stayful websites

Identical structure, different specifics.

For an e-commerce site:
- Test 1: Does the page answer "should I buy this product?"
- Test 2: Is the price, key spec, and CTA visible above the fold?
- Test 3: Would the reader need to search again for "is [product] worth it" or "[product] vs [alternative]"?
- Test 4: Is there owner-tested data, original photos, in-house benchmarking not findable elsewhere?
- Test 5: Does the reader leave knowing whether to buy, with confidence?

For a SaaS site, publisher, or service business: equivalent framing.

The five-test gate is universal.

---

## Related files

- `CORE__02_phase-2__content-quality-qa-checklist.md` — comprehensive QA (this test is a subset)
- `CORE__03_content__immediate-answer-and-intro-structure.md` — what produces Test 1 and Test 2 pass conditions
- `CORE__03_reader-momentum__concept-test-attention-reset-monologue.md` — the concept test and reader's internal monologue (related but distinct)
