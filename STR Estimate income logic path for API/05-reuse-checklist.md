# 05 — Reuse Checklist for New Projects

This file is the operational guide for applying the pipeline on a new
project. Read this last — after `01`–`04` give you the model.

## Decision: should this project use the pipeline at all?

Use the pipeline when:
- The new project needs short-term-rental revenue forecasts
- Airbtics has coverage for the target market (check airbtics.com/coverage)
- You have or can build a calibration dataset of 30+ properties with
  ground-truth annual revenue
- The accuracy target is "PMI-style underwriting" (~70% within ±30%)

Don't use it when:
- Airbtics doesn't cover the market — you'd need a different data source
- The project only needs market-level estimates, not per-property — Airbtics'
  raw `markets/summary` is enough
- You need ±10% accuracy — the pipeline doesn't get there even with tuning;
  you'd need property-level historical data, not comp-based estimates

## Files to copy (verbatim)

| File | Path in new repo | Notes |
|------|------------------|-------|
| `airbtics.ts` | `src/lib/apis/airbtics.ts` | The whole pipeline |
| `analysis.ts` | `src/lib/analysis.ts` | Financial calculator + verdict |
| `types.ts` | `src/lib/types.ts` | Shared types |
| `calibrate.mjs` | `scripts/calibrate.mjs` | Calibration harness |
| `outlier-sweep.mjs` | `scripts/outlier-sweep.mjs` | Outlier debug tool |

These have minimal coupling to the rest of `Stayful-STR-estimate-software`:
- `airbtics.ts` imports only from `../types`
- `analysis.ts` imports only from `./types`
- The calibration scripts hit `/api/analyse` — you need a thin route that
  calls `getShortLetData` and returns the result via SSE (see the original
  repo's `src/app/api/analyse/route.ts` for a reference, ~50 lines)

## Constants to swap (PMI/UK-specific → new project)

These ALL live in the top of `airbtics.ts` (lines 30–150). Read each, decide
what makes sense for your market, change in place:

### Geographic

```ts
// REPLACE with target country's bounding box
const UK_BOUNDS = { minLat: 49, maxLat: 61, minLng: -8, maxLng: 2 };

// REPLACE with target country's postal-code prefix lists
const URBAN_POSTCODE_PREFIXES = new Set([...]);
const COASTAL_POSTCODE_PREFIXES = new Set([...]);
```

If your market doesn't have postal codes (US ZIPs work, but many countries
don't have a clean prefix-to-class mapping), replace `classifyLocation` with
a lat/lng-based heuristic or a static city list.

### Market IDs

```ts
// REPLACE — query Airbtics markets/search for each major city in your
// target market and capture the IDs.
const KNOWN_MARKETS = {
  'Manchester': 144265,  // ← these are UK
  'London': 142929,
  ...
};

const postcodeToCity = { 'M': 'Manchester', ... };  // ← also UK
```

### Currency / country code

Search-and-replace in `airbtics.ts`:
- `'GBP'` → your ISO 4217 currency (`'USD'`, `'EUR'`, etc.)
- `'GB'` → your ISO 3166-1 alpha-2 country code (`'US'`, `'FR'`, etc.)

### Multiplier tables — KEEP as starting point, RECALIBRATE

```ts
LOCATION_ADR_MULT
PROPERTY_TYPE_ADR_MULT
OUTDOOR_ADR_MULT
CONDITION_ADR_MULT
RAMP_UPLIFT_BY_REVIEWS
REVIEW_WEIGHT_MULT
UK_DEFAULT_SEASONAL_INDEX
```

Don't blindly copy — start from the UK values, run calibration, tune. The
relative shape (e.g. `cottage > terraced > flat`) usually transfers; the
absolute multiplier values often don't.

## Constants to KEEP (market-agnostic)

These have nothing to do with the UK or PMI specifically — they encode the
pipeline's architecture:

- `TARGET_COMPARABLES = 12` — comp count
- `SEARCH_RADII_KM` — radius progression for fallback
- `REPORT_POLL_INTERVAL_MS = 2000`, `REPORT_POLL_MAX_MS = 25000` — Airbtics
  poll timing
- `REPORT_CACHE_TTL_MS = 24h`, `CACHE_TTL_MS = 30min` — caching
- `ADR_OUTLIER_SPREAD_THRESHOLD = 2.5`, `ADR_OUTLIER_TRIM_PERCENT = 0.15`
  — V2 outlier detection (now telemetry-only in V3)
- `NON_RESIDENTIAL_TYPES` — Airbnb's property type taxonomy is global,
  these terms are universal

## Code structure to KEEP (the pipeline shape)

The 9-step pipeline in `buildDataFromReportComps` is the actual reusable
asset. Don't restructure it. Specifically:

- Filter order matters: 3a (geo) → 3b (revenue) → 3c (guests) → 3d (type)
  → 3e (parking) → 4 (sort+top12) → 3f (annualisation) → 5 (weighted) → 6+ (forecast)
- Headline forecast does NOT include quality multiplier — that's the
  scenarios layer
- Annualisation BEFORE weighting (V3 lesson — annualising after weighting
  reintroduces the part-year bias)
- Two separate seasonal curves (ADR and occupancy), not one combined

## Calibration loop for the new project

1. Build CSV: `address, ground_truth_estimate, id`
2. Run small first: `node scripts/calibrate.mjs 5 /path/to/csv`
3. If it completes, run full: `node scripts/calibrate.mjs 50 /path/to/csv`
4. Read summary. Compare to ship thresholds (see `03-calibration-methodology.md`)
5. If tuning needed, edit multiplier tables, re-run
6. Once stable, run `outlier-sweep.mjs` on top divergences to verify
   they're not bedroom-inference artefacts

## Things that bit us — watch for these

- **`cache: 'no-store'` is non-negotiable** on every Airbtics fetch — see
  commit `6e19d36`. Without it, stale responses break calibration silently.
- **API typo `reveiw_scores_rating`** — preserve when reading
- **`bedrooms` is a string** in `report/all` responses, but a number in
  `listings/search/bounds` responses — handle both
- **`listings` field is JSON-encoded twice** in `listings/search/bounds`
  responses — `JSON.parse(data.message.listings)` then it's an array
- **Quality multiplier double-counts** if applied at headline AND scenarios
  — V1 did this and had +20–30% bias. V2 fixed it.
- **Best scenario must be different from worst** — V2 had a copy-paste bug
  where `bestForecast = worstForecast`; V3 fixed it.
- **Listings under 12 months old need annualisation** (V3 fix). If you
  skip Step 3f, expect 20–30% systematic underestimate in growing markets.
- **Bedroom inference is unreliable** for calibration. If your dataset has
  real bedroom counts, use them — don't infer from price bands.

## Hand-off to a future Claude session

If you're a Claude Code session that just opened this folder on a new
project, the minimum context you need:

1. Read README first
2. Read `01-pipeline-overview.md` to see the 9-step shape
3. Skim `04-airbtics-api-integration.md` for the API contract
4. Open `airbtics.ts` and locate `buildDataFromReportComps` — that's the heart
5. Don't read every line of the source upfront — use the pipeline overview
   as a map and dive in only at the step you're working on
6. The constants tables in lines 30–150 of `airbtics.ts` are what you'll
   actually edit for the new market

When in doubt: the structure is universal, the constants are PMI/UK-specific.
