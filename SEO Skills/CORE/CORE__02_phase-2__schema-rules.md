# Phase 2 — Schema Rules

**Scope: Universal.** Every page produces a single combined JSON-LD array containing the required schema types. The combined-array rule is non-negotiable.

Full HTML template: `HTML__schema__jsonld-combined-and-videoobject.html`

---

## The combined-array rule

```html
<script type="application/ld+json">
[
  { "@type": "Service", ... },
  { "@type": "LocalBusiness", ... },
  { "@type": "BreadcrumbList", ... },
  { "@type": "FAQPage", ... },
  { "@type": "WebPage", ... },
  { "@type": "VideoObject", ... }    /* if applicable */
]
</script>
```

**One script tag. One array. All schemas inside.**

Never split across multiple `<script>` blocks. Multiple script blocks reduce extraction reliability and look algorithmically generated.

The block goes at the very end of the page HTML — position [20] in the canonical section order.

---

## Required schema types

### Service

```json
{
  "@type": "Service",
  "name": "[Service name with location]",
  "serviceType": "[Service category]",
  "provider": {
    "@type": "Organization",
    "name": "[Brand name]",
    "url": "[Brand URL]"
  },
  "areaServed": [
    { "@type": "City", "name": "[City]" },
    { "@type": "AdministrativeArea", "name": "[County]" },
    { "@type": "PostalCode", "postalCode": "[Primary postcode]" }
  ],
  "offers": {
    "@type": "Offer",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "price": "[fee structure if appropriate]"
    }
  }
}
```

`areaServed` always includes city, county, and primary postcode for local commercial pages.

### LocalBusiness

```json
{
  "@type": "LocalBusiness",
  "name": "[Brand name]",
  "url": "[Brand URL]",
  "telephone": "[Phone number]",
  "areaServed": [...],
  "priceRange": "[$$ or equivalent indicator]"
}
```

For Stayful: telephone is `0113 479 0251`, priceRange convention is `££`.

### BreadcrumbList

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "[home URL]" },
    { "@type": "ListItem", "position": 2, "name": "[Hub]", "item": "[hub URL]" },
    { "@type": "ListItem", "position": 3, "name": "[This page]", "item": "[this URL]" }
  ]
}
```

Position values are **sequential integers starting at 1**.

### FAQPage

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "[Verbatim question text matching visible FAQ trigger]",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Answer text matching visible FAQ answer]"
      }
    }
  ]
}
```

Every visible FAQ must have a corresponding mainEntity entry. Question text must match the visible trigger verbatim. Answer text must match the visible answer.

### WebPage

```json
{
  "@type": "WebPage",
  "name": "[Page title]",
  "url": "[Canonical URL]",
  "description": "[Same or similar to meta description]",
  "dateModified": "[YYYY-MM-DD — today's date when published or refreshed]"
}
```

`dateModified` must match today's date when the page is published or refreshed. Update this field alongside the "Last updated" visible label.

### AggregateRating (when ratings exist)

```json
{
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "bestRating": "5",
  "reviewCount": "[Only include if real number is known]"
}
```

For Stayful: `ratingValue` is `"4.8"`. Only include `reviewCount` if a verified count is available — never fabricate.

### VideoObject (when video embedded)

```json
{
  "@type": "VideoObject",
  "name": "[Descriptive video title matching page topic]",
  "description": "[1-2 sentence summary of what the video covers]",
  "thumbnailUrl": "[Full URL to thumbnail image]",
  "uploadDate": "[YYYY-MM-DD]",
  "contentUrl": "[Video file URL — OR use embedUrl]",
  "embedUrl": "[Embed URL — OR use contentUrl]",
  "duration": "PT[#]M[#]S"
}
```

Duration is ISO 8601 — e.g. `PT2M30S` for 2 minutes 30 seconds.

If video URL/duration not known at writing time, output the VideoObject template with values marked `[REPLACE WITH ACTUAL VALUE]` and flag in the Phase 2 output. Never publish with placeholder schema values.

---

## Schema audit checklist

Use during Phase 1 Step 5 and Phase 2 finalisation:

| Check | Pass criterion |
|---|---|
| Combined JSON-LD array | Single `<script>` block containing array |
| All required types present | Service, LocalBusiness, BreadcrumbList, FAQPage, WebPage minimum |
| AggregateRating included if applicable | Yes |
| VideoObject included if video present | Yes — no exceptions |
| `dateModified` is today's date | Matches the "Last updated" visible label |
| FAQ mainEntity count = visible FAQ count | One-to-one match |
| FAQ question text verbatim matches visible triggers | Yes |
| BreadcrumbList positions sequential from 1 | Yes |
| `areaServed` includes city, county, primary postcode | For local commercial pages |
| No fabricated data | Especially `reviewCount`, `aggregateRating` |
| Schema validates in Google's Rich Results Test | Yes — verify before publishing |

---

## Stayful-specific defaults

Used unless overridden in Phase 1:

| Field | Default value |
|---|---|
| Brand name | "Stayful" |
| Brand URL | https://www.stayful.co.uk |
| Telephone | "0113 479 0251" |
| Service serviceType | "Airbnb Management" / "Holiday Let Management" — match the page primary keyword |
| AggregateRating ratingValue | "4.8" |
| AggregateRating bestRating | "5" |
| priceRange | "££" |

For non-Stayful businesses applying this layer: replace with brand equivalents.

---

## Common failures

- Splitting schema across multiple `<script>` blocks — extraction fails on some schema types
- Including `reviewCount` without a real number — fabricated structured data is a Google policy violation
- `dateModified` left at the original publish date during quarterly refresh — defeats the freshness signal
- FAQ schema mainEntity count exceeding visible FAQ count — Google flags as misleading
- `areaServed` populated only with country, not city/county/postcode — weakens local signal
- VideoObject omitted when video is present — biggest single missed opportunity for video pages

---

## How this applies to non-Stayful websites

Schema types are universal. The fields and rules are unchanged across industries.

The brand defaults table at the top adapts to whatever business is being represented. For an e-commerce site, replace `Service` schema with `Product` schema; the combined-array rule and `dateModified` rules still apply.

For a SaaS site: use `SoftwareApplication` schema in place of `Service`; same combined-array rule.

For a publisher: use `Article` or `NewsArticle`; `WebPage` becomes secondary.

The architectural rule — one combined array, no separate script blocks — applies in every case.
