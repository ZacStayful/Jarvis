# Stayful — Visual Identity

**Scope: Stayful Airbnb-management overlay.** Brand colours, typography, and alignment rules. The universal "what to consider for visual identity" framework lives in `TEMPLATE__brand-overlay-blank.md`.

---

## Brand colours

| Use | Value |
|---|---|
| Background | `#BAD6C7` |
| Green (text, headings, borders, buttons) | `#5D8156` |
| Dark green (hover, table totals) | `#4a6944` |
| White (panels, callout boxes, stat rows, FAQ, tables) | `#ffffff` |
| Background dark (alternating rows, featured panels) | `#a8c9b8` |
| Border | `rgba(93,129,86,0.15)` |

### Hard rules

- **Never use white as a page background**
- **Never use blue hyperlinks**

These two rules are critical. Both are enforced in the Content Quality QA Checklist (`CORE__02_phase-2__content-quality-qa-checklist.md`).

---

## Typography

### Font stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

System font stack is mandatory. **Never import external fonts inside code blocks** — causes CLS issues (`CORE__05_technical__core-web-vitals-and-engagement.md`).

### H1

```css
h1 {
  font-weight: 800;
  font-size: clamp(26px, 5vw, 38px);
  letter-spacing: -0.02em;
  color: #5D8156;
  line-height: 1.15;
  margin: 0 0 22px;
  text-align: center;
}
```

### H2

```css
h2 {
  font-weight: 700;
  font-size: clamp(20px, 3vw, 26px);
  color: #5D8156;
  letter-spacing: -0.01em;
  border-top: 2px solid #5D8156;
  padding: 20px 0 14px;
  margin: 40px 0 16px;
  line-height: 1.25;
  text-align: center;
}
```

### H3

- `font-weight: 700`
- `17.5px`
- Small green dot `::before` pseudo-element:
  - `width: 6px`
  - `height: 6px`
  - `border-radius: 50%`
  - `background: #5D8156`
  - `opacity: 0.5`

### Body paragraphs

- `font-size: 15.5px`
- `font-weight: 600`
- `line-height: 1.85`
- `color: #5D8156`

### Intro paragraph

- `font-size: 17px`
- `font-weight: 600`

**All body text must be `font-weight: 600` minimum for readability against the `#BAD6C7` background.**

---

## Heading alignment

**All pages must include `text-align: center` on both H1 and H2 in the CSS.**

All other elements — body copy, intro paragraphs, callout rows, accordion trigger text, accordion answer text, bullet lists, stat labels, footnotes, related links — remain **left-aligned**.

**Only H1 and H2 are centred.**

The H1 + H2 centring is what gives Stayful pages their visual rhythm. Left-aligning H2s breaks the rhythm and makes the page feel like a generic content page.

---

## Mobile breakpoints

Three breakpoints are mandatory on every page:

### 768px — tablet

- 2-column grids
- Smaller headings
- Stacked testimonials

### 560px — mobile

- Single column
- Reduced font sizes
- Tables use:
  ```css
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 16px -16px;
  width: calc(100% + 32px);
  ```
- Stacked pull stats
- Smaller CTA padding

### 380px — small phones

- Single column everything
- Smallest heading sizes

---

## Internal link styling

```css
a {
  color: #5D8156;
  font-weight: 700;
  text-decoration: none;
  border-bottom: 1.5px solid rgba(93,129,86,0.3);
  padding-bottom: 1px;
}
```

Never blue. Never plain underline. The border-bottom is the visual indicator.

---

## Why this identity

The colour palette is deliberately calm — green and warm-toned background — to support the target audience's emotional state (cautious, considered property owners). Saturated colours and high contrast read as aggressive marketing; Stayful's identity reads as honest analysis.

The system font stack ensures fast loading (no FOUT, no external requests) and matches the OS the reader is using — making the page feel native rather than designed.

Centred H1 and H2 with left-aligned body produces visual rhythm without the formal feel of fully centred copy. It reads as a magazine article, not a marketing brochure.

---

## When the identity gets compromised

The brand identity is most often broken by:

1. **Imported web fonts** — usually accidental, via a Squarespace code block that loads a Google Fonts URL
2. **Blue hyperlinks** — Squarespace's default styling reasserts itself if the CSS isn't properly scoped
3. **White-background sections** — added by visual editor without checking the brand
4. **Left-aligned H1/H2** — added without re-applying the centre rule

The Phase 2 QA checklist catches all four. Re-run before every publish.

---

## Related files

- `STAYFUL__brand__components-html-library.md` — component library that uses these rules
- `STAYFUL__brand__voice-language-rules.md` — voice and copy rules paired with the visual identity
- `HTML__css__brand-styles.css` — full stylesheet implementing these rules
- `CORE__05_technical__core-web-vitals-and-engagement.md` — why system font stack matters for CWV
