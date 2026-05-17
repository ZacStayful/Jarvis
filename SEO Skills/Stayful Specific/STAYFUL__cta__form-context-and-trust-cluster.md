# Stayful — Form Context and Trust Cluster

**Scope: Stayful Airbnb-management overlay.** What surrounds the income estimate form: the supporting copy, the trust cluster, the disqualifier, and the placement rules.

---

## The income estimate form embed

Always use this exact embed — never a button link:

```html
<div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
```

Place once after the opening intro paragraph (top CTA) and once at the bottom of the page inside a full-width green section.

---

## What to put near the income estimate form

These elements appear in the immediate context of the form. They reduce the friction of conversion and frame what the estimate will deliver.

### 1. A demand anchor

One sentence making the occupancy assumption feel locally grounded.

Example: "Based on Stayful's managed portfolio in Leeds, where occupancy currently averages 67% across comparable terraced properties."

### 2. Net income framing

Confirm the estimate shows net income, not gross bookings.

Example: "What the estimate shows: your typical monthly net after Stayful's 15% + VAT and operating costs — not gross bookings."

### 3. Date-blocking reassurance (Objection 3 exact wording)

> "You block dates you want to use the property in your owner calendar — no notice required, no approval process. And unlike a long-term tenancy, no guest has exclusive possession of your property."

### 4. Payout predictability

"Monthly income paid directly to you between the 1st and 5th of each month"

### 5. A trust cluster

- 4.8 star Google rating
- One anonymised owner example with a slower month figure

### 6. A brief disqualifier

"If you need a guaranteed fixed amount each month regardless of bookings, short letting may not be the right fit."

---

## The income guarantee statement (Objection 2 — exact wording)

> "We don't guarantee a fixed income figure — and we'd be cautious of any company that does. What we show you is the realistic range, including quieter months, based on comparable properties in your postcode. Even in a slower year, the net figure typically exceeds what a long-term tenancy would pay."

Place near the form. Use exactly as worded.

---

## Layout of the form context

In source order, around the form:

1. **Lead-in sentence** — what the form does, why it's worth 2 minutes
2. **Date-blocking reassurance** (Objection 3)
3. **Form embed**
4. **Income guarantee statement** (Objection 2)
5. **Trust cluster** (4.8 stars + one anonymised case study)
6. **Payout timing** (1st–5th of month)
7. **Disqualifier**

The order is engineered: the reader sees the friction-reducer (control reassurance) before the form, the honesty statement immediately after, then the trust signals, then the gentle disqualifier that qualifies the click.

---

## The top CTA block — full structure

```html
<div class="cta-embed">
  <span class="cta-embed-label">Free income estimate</span>
  <span class="cta-embed-title">See what your [CITY] property could earn</span>
  <span class="cta-embed-sub">Tailored to your postcode — no obligation, takes 2 minutes</span>
  <div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
</div>
```

The three text lines are:

1. **Label** — what kind of thing this is (a free income estimate)
2. **Title** — the specific value (your city property's potential earnings)
3. **Subline** — the friction-reducers ("tailored to postcode", "no obligation", "2 minutes")

All three lines work together. The label reduces "is this a sales form?" anxiety. The title personalises the offer. The subline addresses the time and commitment friction.

---

## The bottom CTA block — full structure

```html
<div class="cta-bottom">
  <h2>[Compelling headline]</h2>
  <p>[One sentence]</p>
  <div data-wm-plugin="load" data-source="/calculateyourincome-airbnb-management"></div>
</div>
```

Compelling headline examples:

- "Run the numbers on your [city] property"
- "See what [city] short-letting could pay your property"
- "Get the honest figure for your [city] property"

One-sentence example:

- "The estimate shows you the typical and worst-case monthly net — including the quieter months."

---

## What goes near the form on every variant

These elements are the same across every page type — city, county hub, calculator landing, guide page:

| Element | Required? |
|---|---|
| Demand anchor sentence | Required |
| Date-blocking reassurance (Objection 3) | Required near top CTA |
| Net income framing | Required |
| Income guarantee statement (Objection 2) | Required near top CTA |
| Trust cluster (4.8 + case study) | Required |
| Payout timing | Required |
| Disqualifier | Required at top CTA — optional at bottom |

Each page may have slightly different specific data, but the structural elements are constant.

---

## Common failures

### Failure 1 — Form without context

The embed placed in isolation with no surrounding copy. Reader sees a generic form and doesn't engage.

### Failure 2 — Missing Objection 3 wording near top CTA

The control statement is the friction-reducer that gets the reader to fill in the form. Missing it costs conversions silently.

### Failure 3 — Generic CTA headlines

"Get a free quote!" — replace with specific value: "See what your [city] property could earn" — the headline is the curiosity gap that triggers the conversion.

### Failure 4 — Disqualifier omitted

The disqualifier ("if you need guaranteed fixed amount, this isn't right for you") qualifies the click. Without it, wrong-fit visitors fill the form, drive up CAC, and reduce ICP conversion rates.

### Failure 5 — Trust cluster as logos only

"As featured on..." with logos. Replace with specific proof: a 4.8 star rating with a specific reviewer count if known, and a one-sentence anonymised case study with a real income figure.

---

## Related files

- `STAYFUL__objections__six-mandatory.md` — Objection 2 and 3 exact wordings (which appear here)
- `STAYFUL__objections__worst-case-framing-language.md` — Rule 5 honest-anchor framing (which appears here)
- `STAYFUL__proof__levers-and-disqualifier.md` — the trust cluster proof points
- `HTML__components__cta-blocks-top-bottom-answer.html` — the actual HTML
