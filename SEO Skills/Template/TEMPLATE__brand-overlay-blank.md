# Brand Overlay — Blank Template

**Scope: Template for new business overlays.** Fill in each `[FIELD]` to produce `[BUSINESS]__brand__visual-identity.md` for a new business.

For a worked example, see `STAYFUL__brand__visual-identity.md`.

---

## Brand colours

| Use | Value |
|---|---|
| Background | `[hex]` |
| Primary (text, headings, borders, buttons) | `[hex]` |
| Hover / dark variant | `[hex]` |
| Card / panel surface | `[hex]` |
| Alternating row / featured panel | `[hex]` |
| Border | `[hex with alpha — e.g. rgba(X,Y,Z,0.15)]` |

### Hard rules

- [Rule 1 — e.g. "Never use white as page background" — adjust per brand]
- [Rule 2 — e.g. "Never use blue hyperlinks"]

---

## Typography

### Font stack

```css
font-family: [font stack — recommend system stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif];
```

System font stack is recommended. **Never import external fonts inside code blocks** — causes CLS issues.

### H1

```css
h1 {
  font-weight: [weight];
  font-size: clamp([min], [scale], [max]);
  letter-spacing: [tracking];
  color: [primary colour];
  line-height: [line-height];
  margin: [margin];
  text-align: [center / left];
}
```

### H2

```css
h2 {
  font-weight: [weight];
  font-size: clamp([min], [scale], [max]);
  color: [primary colour];
  letter-spacing: [tracking];
  border-top: [if applicable];
  padding: [padding];
  margin: [margin];
  line-height: [line-height];
  text-align: [center / left];
}
```

### H3

- font-weight: [weight]
- font-size: [size]
- [Optional decoration — e.g. pseudo-element dot/bullet]

### Body paragraphs

- font-size: [size]
- font-weight: [weight — minimum 600 recommended for accessibility on coloured backgrounds]
- line-height: [line-height]
- color: [primary or body colour]

### Intro paragraph

- font-size: [larger than body]
- font-weight: [weight]

---

## Heading alignment

[Specify which headings are centred and which are left-aligned.]

Example for Stayful: H1 and H2 are centred. All other elements (body copy, callouts, FAQ, lists) are left-aligned.

---

## Mobile breakpoints

| Breakpoint | Adjustments |
|---|---|
| 768px (tablet) | [list of changes] |
| 560px (mobile) | [list of changes] |
| 380px (small phones) | [list of changes] |

For tables on mobile:

```css
overflow-x: auto;
-webkit-overflow-scrolling: touch;
margin: 16px -16px;
width: calc(100% + 32px);
```

---

## Internal link styling

```css
a {
  color: [primary brand colour];
  font-weight: [weight];
  text-decoration: none;
  border-bottom: [subtle indicator using brand colour with alpha];
  padding-bottom: 1px;
}
```

**Never blue.** **Never plain underline.** The border-bottom is the visual indicator.

---

## Why this identity (brief rationale)

[1–2 paragraphs explaining the design choices. The palette, the typography, the alignment — why these support the audience's emotional state and the business's positioning.]

---

## Common compromise points (where the brand often gets broken)

[List the most common ways the brand identity gets accidentally violated. Examples for Stayful:]

1. External web fonts loaded via code blocks
2. Blue hyperlinks reasserting through default CSS
3. White-background sections added by visual editors
4. Left-aligned H1/H2 added without re-applying centre rule

Run pre-publish checks against this list.

---

## Related files

- `[BUSINESS]__brand__components-html-library.md` — components using these rules
- `[BUSINESS]__brand__voice-language-rules.md` — voice and copy rules
- `HTML__css__brand-styles.css` (or equivalent business-specific stylesheet) — full implementation
