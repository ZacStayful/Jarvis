# Core Web Vitals and User Engagement Design

**Scope: Universal.** Core Web Vitals are ranking tiebreakers. When two pages are judged comparable on content quality and topical authority, the page with better performance metrics wins. User engagement design rules govern how the page is structured for readers to actually use, not just to satisfy bots.

---

## The four-check CWV pass

For pages delivered through Squarespace 7.1 (or any visual-builder CMS with limited server-level access), the following rules minimise CWV risk without requiring server-side optimisation. Check these four things on every page:

1. **All SVGs have explicit dimensions** (`width` and `height` attributes set)
2. **System font stack used throughout** (no external font imports inside code blocks)
3. **Accordion transitions are CSS-only** (no JavaScript-driven height recalculation)
4. **H1 appears before the first large asset** (SVG or component block) in the HTML source

If all four pass, the page will generally pass CWV thresholds. If any fail, the page is at risk.

---

## LCP (Largest Contentful Paint) — target under 2.5 seconds

LCP measures when the largest visible element finishes rendering. For service pages, the LCP element is usually the H1, a hero image, or the first large component.

### Rules

- **Never load images from external URLs inside code blocks.** All visuals are inline SVGs.
- **Keep inline SVG file sizes reasonable.** If an SVG requires more than approximately 200 lines of markup, simplify the paths.
- **The H1 must appear in the HTML before any large SVG or component block — never after.** This ensures the H1 is the LCP candidate rather than waiting for a later, heavier element to paint.

### Why H1 position matters

If a 4KB SVG renders before the H1 in source order, the SVG becomes the LCP element. Even on a fast connection, SVG rendering takes longer than text rendering. The LCP gets pushed past the 2.5s threshold.

If the H1 appears first in source order, text rendering completes early and the H1 becomes the LCP element — well under 2.5s.

This is the single highest-leverage CWV rule for a Squarespace page.

---

## CLS (Cumulative Layout Shift) — target under 0.1

CLS measures unexpected layout shifts during page load. The most common cause of high CLS on Squarespace pages is unsized SVGs and dynamic font loading.

### Rules

- **All SVG containers use `style="width:100%;height:auto;display:block;"`** — explicit dimensions before any content paints
- **Use the system font stack** (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`); never import external fonts inside code blocks
- **The seasonality bar chart animation must set explicit heights on bar track elements before JS runs**

### Why each rule

- Without explicit SVG dimensions, the container has zero height until the SVG renders. Then the container jumps to the rendered size — every element below it shifts.
- External font loading causes FOUT (Flash Of Unstyled Text): text renders in fallback font, then re-renders when the custom font loads, shifting every line below.
- The seasonality chart animates bar widths on load. If the bar tracks have no initial height, the chart container collapses then expands — a major shift.

---

## INP (Interaction to Next Paint) — target under 200 milliseconds

INP measures how quickly the page responds to user input. For service pages with accordions and FAQ dropdowns, INP is determined by how those interactions are coded.

### Rules

- **All accordion open/close transitions must use CSS `max-height` transitions, not JavaScript-driven height recalculations**
- **Event listeners must be lightweight** — no heavy logic inside click handlers

### Why CSS-only accordions

A JavaScript accordion that calculates element height on each open/close call has variable INP — sometimes fast, sometimes slow if other JS is competing for the main thread.

A CSS `max-height` transition runs entirely on the browser's compositor thread, decoupled from JavaScript execution. INP stays consistent and well under 200ms.

The pattern:

```css
.accordion-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out;
}
.accordion-content.is-open {
  max-height: 2000px;  /* or 400px for short content */
}
```

The button JS only toggles the class — no height calculation, no DOM measurement.

---

## User Engagement Design rules

Page-level rules that govern how a reader actually uses the page, not just whether bots can crawl it.

### Rule 1 — No content below the fold on arrival

On mobile, a reader should be able to see:

- The H1
- The intro paragraph (first 50 words)
- The answer capsule
- The top of the CTA block

— all without scrolling.

If any of these is below the mobile fold, restructure. The single biggest determinant of "did they read the page" is whether the first answer was visible on arrival.

### Rule 2 — Accordion sections must not hide primary answers

If a question is likely to appear in a Google PAA box for the primary keyword, the answer to that question must be visible as **open content** somewhere on the page — not hidden inside an accordion.

Accordions are for secondary depth. The primary answer to the primary query must be visible.

### Rule 3 — The page must give before it asks

The top CTA block must follow — not precede — the answer capsule and at least one specific income / outcome figure.

Asking for the conversion before giving the reader value is the most common pre-CTA mistake. The reader hasn't yet received anything worth converting for.

### Rule 4 — Internal links must support reading, not interrupt it

The correct placement for an internal link is at the end of a paragraph that introduces a topic covered in more depth on another page — not mid-sentence inside the paragraph that covers it.

Mid-sentence links pull the reader off the page mid-thought. End-of-paragraph links offer the next step after the current thought is complete.

### Rule 5 — Pogo-stick prevention — the three-minute test

The specific income figure, the slow-month figure, and the fee structure must all be accessible within the **first third** of the page.

A reader who scans for 3 minutes and can't find these three core facts will return to Google and click the next result. That bounce is the pogo-stick signal — Google interprets it as "the previous page didn't satisfy the query."

The three-minute test: open the page, set a 3-minute timer, scan it. Did you find the income figure, the slow-month figure, and the fee structure? If not, the page will pogo-stick.

---

## Common failures

### CWV failure 1 — Web fonts inside code blocks

Importing Google Fonts or other external fonts inside a Squarespace code block injects the import into the page's head section, causing FOUT and CLS issues. Always use the system font stack.

### CWV failure 2 — H1 below an SVG

A common page structure puts a hero SVG at the top with the H1 below. This makes the SVG the LCP element. Move the H1 above the SVG.

### CWV failure 3 — JavaScript height calculations

`element.style.height = element.scrollHeight + 'px'` for animations. Use `max-height` transitions instead.

### CWV failure 4 — Missing SVG dimensions

`<svg viewBox="0 0 500 300">` without `width="100%" height="auto"` or wrapping container styles. Causes CLS.

### Engagement failure 1 — Answer below the mobile fold

Phone testing on a real device. Without scrolling, what's visible? If the answer capsule isn't, the page fails.

### Engagement failure 2 — CTA before value

Top CTA placed immediately after H1, before any specific information. Pushes for conversion before any value has been delivered.

### Engagement failure 3 — Mid-paragraph internal links

A 4-link paragraph that pulls the reader sideways every two sentences. Reading momentum collapses.

---

## How this applies to non-Stayful websites

CWV rules are platform-agnostic. The Squarespace-specific notes adapt:

- **WordPress:** font handling is more flexible (theme-controlled); same H1-first-in-source rule
- **Webflow:** explicit element sizing is the default; the rule still applies
- **Shopify:** liquid templates allow proper image sizing; the rule still applies
- **Custom Next.js/static sites:** `next/image` and `next/font` handle most of these; the rule still applies as a sanity check

Engagement design rules are domain-neutral. Every commercial page benefits from:

- Above-the-fold answer on mobile
- Visible primary answers (not hidden in accordions)
- Value before CTA
- Reading-supportive internal links
- Three-minute test scan

The specific facts that need to be visible adapt to the business; the structural rule is the same.

---

## Related files

- `CORE__03_content__long-body-text-and-paragraph-formatting.md` — accordion rules (with CWV implications)
- `CORE__02_phase-2__content-quality-qa-checklist.md` — Core Web Vitals section of the pre-publication checklist
- `HTML__css__brand-styles.css` — Stayful brand stylesheet using system font stack
