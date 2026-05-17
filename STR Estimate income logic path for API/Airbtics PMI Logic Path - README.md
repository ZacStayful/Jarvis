# Airbtics PMI Logic Path — Reusable Reference

This folder is the **portable reference** for the PMI-calibrated short-term-let
revenue pipeline that was built on top of the Airbtics API in the
`Stayful-STR-estimate-software` repo. It exists so a future Claude Code session
on a different project can read these docs, copy the source files, and apply
the same logic to a new market or dataset without re-deriving everything.

The repo is the source of truth. This folder is a snapshot taken on
2026-05-09 at git commits `0f59876` (V2 PMI-calibrated pipeline) and `b685d1b`
(V3 annualisation + stacked ADR multipliers).

## What this is

A 9-step filtering + weighting pipeline that turns ~40 raw Airbnb comparables
(from the Airbtics `report/all` endpoint) into a single revenue forecast that
matches PMI's manual underwriting within ±30% on 70% of properties.

Headline accuracy on the 30-property PMI calibration dataset:
- Mean signed divergence: **+8.2%**
- Median absolute divergence: **18%**
- Within ±30% of PMI: **70%**
- Within ±20% of PMI: ~50%

The same shape works for any short-term-rental market — the calibration
constants are the only PMI/UK-specific parts.

## How to read this folder

Read in this order:

1. `Airbtics PMI Logic Path - README.md` — you are here
2. `Airbtics PMI Logic Path - 01-pipeline-overview.md` — the 9 steps as a flow diagram
3. `Airbtics PMI Logic Path - 02-step-by-step-logic.md` — each step in detail, with code refs
4. `Airbtics PMI Logic Path - 03-calibration-methodology.md` — how the harness works + PMI results
5. `Airbtics PMI Logic Path - 04-airbtics-api-integration.md` — Airbtics endpoints, auth, response shapes
6. `Airbtics PMI Logic Path - 05-reuse-checklist.md` — what to swap when applying this on a new project
7. Source files: `Airbtics PMI Logic Path - source - airbtics.ts`, `analysis.ts`, `types.ts`, `calibrate.mjs`, `outlier-sweep.mjs`

## How to apply this on a new project

Short version (full version in `05-reuse-checklist.md`):

1. Copy `airbtics.ts`, `types.ts`, `analysis.ts` into the new repo's `src/lib/`.
2. Copy `calibrate.mjs` and `outlier-sweep.mjs` into a `scripts/` directory.
3. Set env vars: `AIRBTICS_API_KEY`, `CALIBRATION_BYPASS_SECRET`.
4. If the new market is **not the UK**, swap:
   - `UK_BOUNDS` (lat/lng box) in `airbtics.ts`
   - `URBAN_POSTCODE_PREFIXES` / `COASTAL_POSTCODE_PREFIXES`
   - `KNOWN_MARKETS` (Airbtics market_id table) in `findMarketId`
   - `country_code: 'GB'` and `currency: 'GBP'` throughout
5. Build a new calibration dataset (50+ properties with ground-truth annual
   revenue) and run `node scripts/calibrate.mjs` against it.
6. Tune the multiplier tables until calibration shows mean signed divergence
   near 0% and 70%+ within ±30%.

The 9-step pipeline structure itself does not change between markets — only
the constants do.

## Key entry points in airbtics.ts

- `getShortLetData` — top-level entry point
- `fetchReportAll` — two-step report/all flow (POST → poll GET)
- `buildDataFromReportComps` (line 890) — the 9-step pipeline
- `getShortLetDataFromMarkets` — fallback flow

## When NOT to use this

- If the new project doesn't need PMI-style accuracy, the pipeline is
  overkill — Airbtics' raw `markets/summary` is fine.
- If the new market has no Airbtics coverage, the pipeline can't run.
- If the underwriting target isn't PMI-style "annual revenue assuming a good
  operator," the calibration constants are wrong starting points.
