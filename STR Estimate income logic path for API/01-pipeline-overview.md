# 01 — Pipeline Overview

The pipeline lives in `buildDataFromReportComps` in `airbtics.ts` (line 890).
It takes ~40 raw Airbnb comparables from the Airbtics `report/all` endpoint
and produces a single revenue forecast.

## Flow diagram

```
                ┌──────────────────────────────────────────┐
                │  Input: lat/lng + bedrooms + guests      │
                │         + property metadata              │
                └────────────────────┬─────────────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────────┐
                    │ V3 — classifyLocation(postcode)│
                    │ urban / suburban / coastal /  │
                    │ rural_village / rural_isolated │
                    └────────────────┬─────────────┘
                                     │
                                     ▼
                    ┌──────────────────────────────┐
                    │  Airbtics report/all ($0.50) │
                    │  POST → poll GET (≤25s)      │
                    │  → ~40 raw comps             │
                    └────────────────┬─────────────┘
                                     │
                                     ▼
   ╔════════════════════════════════════════════════════════════════╗
   ║   THE 9-STEP PIPELINE (buildDataFromReportComps)               ║
   ╠════════════════════════════════════════════════════════════════╣
   ║                                                                ║
   ║  3a. Non-UK lat/lng filter                                     ║
   ║      ├─ keep: 49<lat<61, -8<lng<2                              ║
   ║      └─ removes pollutant non-UK listings                      ║
   ║                                                                ║
   ║  3b. Revenue > 0 filter                                        ║
   ║      └─ removes brand-new + dormant listings                   ║
   ║                                                                ║
   ║  3c. Tiered guest tolerance: exact → ±1 → ±2 → ±3              ║
   ║      └─ widens until ≥12 comps; preserves like-for-like        ║
   ║                                                                ║
   ║  3d. Residential-first property tiering                        ║
   ║      ├─ residential first                                      ║
   ║      └─ then non-residential (cabin/lodge/glamping/etc.)       ║
   ║                                                                ║
   ║  3e. Parking sort (if user has parking)                        ║
   ║      └─ properties with parking float to top                   ║
   ║                                                                ║
   ║  4.  Sort by review tier → distance                            ║
   ║      A: ≥10 reviews — established                              ║
   ║      B: ≥3 reviews — track record                              ║
   ║      C: <3 reviews — unproven                                  ║
   ║      then take top 12                                          ║
   ║                                                                ║
   ║  3f. (V3) Seasonal index + comp annualisation                  ║
   ║      ├─ buildSeasonalIndex: blend mature comps + market        ║
   ║      ├─ for each comp under 12mo old: divide raw revenue       ║
   ║      │  by seasonal coverage fraction                          ║
   ║      └─ apply ramp-up uplift by review count (0–30%)           ║
   ║                                                                ║
   ║  5.  (V3) Weighted ADR + weighted occupancy                    ║
   ║      └─ weight = distance × bedroom-match × residential        ║
   ║         × review-count weight                                  ║
   ║                                                                ║
   ║  6.  Quality multiplier captured for scenarios layer only      ║
   ║      (NOT applied to headline — keeps headline PMI-pure)       ║
   ║                                                                ║
   ║  7.  Build seasonal ADR + occupancy curves from comp monthly   ║
   ║                                                                ║
   ║  8b. (V3) Stacked ADR feature multiplier                       ║
   ║      total = locationMult × propertyTypeMult × outdoorMult     ║
   ║              × parkingMult × conditionMult + specialBonus      ║
   ║                                                                ║
   ║  8.  Monthly forecast: ADR × seasonalADR × occ × seasonalOcc   ║
   ║      × days_in_month                                           ║
   ║                                                                ║
   ║  9.  Scenarios (worst / base / best)                           ║
   ║      worst = quality-adj                                       ║
   ║      base  = quality-adj + 5% occ                              ║
   ║      best  = quality-adj + 5% occ + 5% ADR                     ║
   ║                                                                ║
   ╚════════════════════════════════════════════════════════════════╝
                                     │
                                     ▼
                    ┌──────────────────────────────┐
                    │ Output: ShortLetData         │
                    │ + DataQuality assessment     │
                    └──────────────────────────────┘
```

## Why nine steps and not three

PMI's manual underwriters do all of this implicitly when they pick
comparables: they reject non-residential, prefer established listings, mentally
adjust for property quality, and seasonally-correct part-year data. The 9-step
pipeline is what each of those judgments looks like once written down as code.

Skipping any step measurably hurts accuracy:
- Skip 3a → median absolute divergence rises ~5pp (foreign listings inflate
  numbers, especially in coastal areas where Spain/France comps leak in)
- Skip 3c (tiered tolerance) → either too few comps for low-density areas or
  too noisy for dense ones
- Skip 3f (V3 annualisation) → systematic 20–30% underestimate on properties
  near new-listing-heavy areas
- Skip 8b (V3 stacked multiplier) → 25%+ underestimate on rural/coastal
  premium properties

## Cost note

Each pipeline run hits Airbtics for $0.50 (report/all POST). Polling and
re-reads of an existing report are free. The `reportCache` (24h TTL keyed by
`postcode_bedrooms`) means rerunning the same property is free. The fallback
markets flow costs ~$0.46 in total.
