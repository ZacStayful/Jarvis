# Template — Creating a New Business Overlay

**Scope: Universal.** The master walkthrough for creating an overlay for a new business (or a non-Stayful Stayful site such as the rental-estimates site or the contractor-accommodation site).

Use this guide alongside the blank fill-in templates:
- `TEMPLATE__brand-overlay-blank.md`
- `TEMPLATE__lead-profiles-blank.md`
- `TEMPLATE__objections-blank.md`
- `TEMPLATE__use-and-never-language-blank.md`

---

## What an overlay is

The `CORE__*` files contain the universal SEO playbook — applicable to any commercial website regardless of industry.

An overlay is the business-specific layer that sits on top. It defines:

- Brand visual identity (colours, typography, voice)
- Lead profiles (who the audience is and how they search)
- Mandatory objections (what every reader has on their mind)
- Use-and-never-use language tables
- Business facts (the entity-consistent set)
- Proof points
- Anything else specific to this business

The overlay is what makes the playbook actionable for a specific site.

---

## Naming convention

When creating a new overlay, use a prefix that identifies the business:

```
[BUSINESS]__[section]__[topic].md
```

Examples for hypothetical new Stayful overlays:

| Business | Prefix |
|---|---|
| Stayful rental estimates site | `STAYFUL-ESTIMATES__` |
| Stayful contractor accommodation site | `STAYFUL-CONTRACTORS__` |
| (Hypothetical) new e-commerce client | `[CLIENT-NAME]__` |

The prefix is consistent across every file in the overlay. Files use the same internal structure as `STAYFUL__*` files.

---

## The minimum overlay file set

Every overlay should have at least these files:

| File | Content |
|---|---|
| `[BUSINESS]__brand__visual-identity.md` | Colours, typography, alignment rules |
| `[BUSINESS]__brand__voice-language-rules.md` | Copy style, positioning, use/never use |
| `[BUSINESS]__business__facts-and-positioning.md` | Canonical business facts |
| `[BUSINESS]__lead-profiles__[range].md` | A–F or business-specific profile range |
| `[BUSINESS]__objections__mandatory.md` | The mandatory objections to address |
| `[BUSINESS]__faq__lead-language-tables.md` | FAQ language tables |
| `[BUSINESS]__current__priorities-baseline-competitors.md` | Current state (refresh quarterly) |

Optional, depending on the business:

| File | When to add |
|---|---|
| `[BUSINESS]__brand__components-html-library.md` | If the business uses a distinct component library |
| `[BUSINESS]__data__overview-and-matching.md` | If the business has first-party data (like Stayful's postcode data) |
| `[BUSINESS]__cta__form-context.md` | If the conversion has specific surrounding copy requirements |
| `[BUSINESS]__phase-2-sections__specific-html.md` | If Phase 2 sections need business-specific HTML |

---

## Step-by-step process

### Step 1 — Define the business and audience

Before writing any overlay files, answer these questions in plain text:

1. **What does the business do?** One sentence.
2. **Who is the primary audience?** One paragraph describing the typical reader.
3. **What is the primary conversion?** The single action you want every page to drive toward.
4. **What is the positioning statement?** One sentence the reader would repeat.

If any of these is fuzzy, sharpen it before writing overlay files. The whole overlay flows from these four definitions.

### Step 2 — Fill in the brand overlay template

Open `TEMPLATE__brand-overlay-blank.md`. Define:

- Primary brand colour palette
- Typography (fonts, sizes, weights)
- Heading alignment
- Component visual style
- Internal link styling

This produces `[BUSINESS]__brand__visual-identity.md`.

### Step 3 — Fill in the lead profiles template

Open `TEMPLATE__lead-profiles-blank.md`. Define each profile:

- A — Primary urgent / commercial
- B — Primary considered / weighing alternatives
- C — Validating before purchase
- D — Transitional / impatient
- E — Aspirational / structurally limited
- F — Marginal / unprofitable

For each: who they are, search intent, emotional state, what the page must show them, copy tone, key proof point.

Most businesses don't need all six profiles. Use as many as actually apply. Stayful uses A–F; a simpler business might use A–C only.

This produces `[BUSINESS]__lead-profiles__A-to-F.md` (or similar).

### Step 4 — Fill in the objections template

Open `TEMPLATE__objections-blank.md`. Identify:

- The 4–7 mandatory objections every reader has
- Classification: Critical (body copy required) vs. Standard (FAQ acceptable)
- Exact language for Critical-class objections (the wording that goes near the CTA)
- Placement rules per objection

This produces `[BUSINESS]__objections__mandatory.md`.

### Step 5 — Fill in the language tables template

Open `TEMPLATE__use-and-never-language-blank.md`. Define:

- The voice and copy style
- The positioning statement (one-sentence)
- The "use this language" list with examples
- The "never use this language" list with reasons
- FAQ lead-language tables by category (income, control, process, etc.)

This produces `[BUSINESS]__brand__voice-language-rules.md` AND `[BUSINESS]__faq__lead-language-tables.md`.

### Step 6 — Document business facts

Create `[BUSINESS]__business__facts-and-positioning.md` listing:

- Every fact that appears across multiple pages (price, time, rating, scale, etc.)
- The canonical phrasing of each fact (entity consistency)
- The positioning statement
- The phrases that should NEVER appear

This is the entity-consistency anchor for the whole overlay.

### Step 7 — Document current state

Create `[BUSINESS]__current__priorities-baseline-competitors.md` with:

- GSC baseline (current quarter)
- Competitive position table
- Page priority matrix (Tier 1–4)
- Direct competitors
- Cluster status
- Current quarter priorities

This file refreshes quarterly per `CORE__06_measurement__update-cadence-and-triggers.md`.

### Step 8 — Optional: components and data files

If the business has:

- A custom component library → create `[BUSINESS]__brand__components-html-library.md` + relevant HTML files
- First-party data (like Stayful's postcode data) → create `[BUSINESS]__data__*` files
- Distinct Phase 2 section requirements → create `[BUSINESS]__phase-2-sections__specific-html.md`

### Step 9 — Update the README and INDEX

Add the new overlay's files to `_INDEX.md` and reference the overlay's existence in `README.md`.

---

## How long does this take?

For a well-understood business:

- Step 1 (definitions): 30 minutes
- Step 2 (brand): 1 hour
- Step 3 (profiles): 2 hours
- Step 4 (objections): 2 hours
- Step 5 (language): 2 hours
- Step 6 (facts): 1 hour
- Step 7 (current state): 1 hour (requires GSC access)
- Step 8 (optional): variable

Total: ~10 hours for the minimum file set. A weekend project for a single business.

The overlay is then reusable forever. Quarterly refresh of facts and current state takes ~2 hours.

---

## When you don't have full information

If some aspects of the business are unclear or undecided:

- **Brand voice undecided:** mark as "DRAFT — TBD" and pull from a closest comparable business until decisions are made
- **Lead profiles unclear:** start with the profiles you can confidently define; add others later as data clarifies
- **Objections list incomplete:** include the obvious 3–4; add later from sales call transcripts
- **No GSC access yet:** leave the current state file with placeholders for baseline numbers

It's better to have a partial overlay that's used than a complete overlay that takes 6 months to finalise. Partial overlays improve over time.

---

## When to retire an overlay

If a business pivots significantly (different audience, different service, different positioning):

- The existing overlay becomes outdated
- Either: deep refresh in place (rewrite each file)
- Or: archive the old overlay (rename files with `_archived` suffix) and create a new one

Don't try to maintain two conflicting overlays for the same business. The entity-consistency check will fail.

---

## Multi-site overlay management (for businesses with multiple sites in the same niche)

Stayful has three sites in the same property/STR niche:

1. Airbnb management (existing — `STAYFUL__*`)
2. Short-term rental estimates (being built)
3. Contractor accommodation (existing)

These sites share some elements (postcode data, FHL tax landscape, general property-niche knowledge) but differ in audience, message, brand voice.

The recommended approach:

- Each site has its own overlay (`STAYFUL__*`, `STAYFUL-ESTIMATES__*`, `STAYFUL-CONTRACTORS__*`)
- Files within an overlay are self-contained — they don't depend on another site's overlay
- Universal SEO practice (`CORE__*`) applies to all three

If shared elements (postcode data, regulatory landscape) need to be referenced across overlays, duplicate the relevant content into each overlay rather than creating cross-site dependencies. Duplication is cheaper than dependency management.

---

## Related files

- `TEMPLATE__brand-overlay-blank.md` — the brand fill-in template
- `TEMPLATE__lead-profiles-blank.md` — the lead profiles fill-in template
- `TEMPLATE__objections-blank.md` — the objections fill-in template
- `TEMPLATE__use-and-never-language-blank.md` — the language tables fill-in template
- All existing `STAYFUL__*` files — fully worked example for reference
