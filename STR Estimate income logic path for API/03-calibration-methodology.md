# 03 — Calibration Methodology

The pipeline is empirical: every constant in `airbtics.ts` was derived by
running the harness against PMI's published estimates for 30 real UK
properties and tuning until divergence stabilised.

## The harness

`calibrate.mjs` (304 lines) is a Node.js script that:

1. Reads a CSV of (address, PMI estimate, Monday.com row id) rows
2. For each row:
   - Extracts the UK postcode via regex
   - Infers bedrooms/guests from the PMI estimate band
   - POSTs to `http://localhost:3000/api/analyse` with a calibration bypass
     header (skips rate-limit/auth in dev only)
   - Reads the SSE stream until `stage === 'complete'`
   - Records our `shortLet.annualRevenue`, ADR, occupancy, comps found,
     search radius
3. Compares ours vs PMI: signed `divergencePct = (ours - pmi) / pmi`
4. Prints summary: mean signed, median signed, mean abs, median abs,
   % within ±10/20/30%
5. Lists outliers (>30% divergence)
6. Writes full results to `scripts/calibration-results.json`

**Run command**:
```bash
node scripts/calibrate.mjs [limit] [csvPath]
# defaults: limit=10, csvPath=/Users/rahul/Downloads/pmi-calibration-dataset-clean.csv
```

**Prereqs**:
- `npm run dev` running on `:3000`
- `CALIBRATION_BYPASS_SECRET` set in `.env`
- `AIRBTICS_API_KEY` set in `.env`

**Bedroom inference brackets** (from `inferBedGuest` in `calibrate.mjs:92`):
- PMI < £25k → 1 bed / 2 guests
- £25k–£35k → 2 bed / 4 guests
- £35k–£55k → 3 bed / 6 guests
- £55k–£85k → 4 bed / 8 guests
- £85k+ → 5 bed / 10 guests

These are rough — for higher-fidelity calibration, supply real bedroom counts
from Monday.com / dataset rather than inferring.

## Results — V2 baseline (commit 0f59876)

```
Properties analysed:    30/30
Mean divergence:        +8.2%   (signed)
Median divergence:      +5.1%   (signed)
Mean |divergence|:      22.4%
Median |divergence|:    18.0%
Within ±10%:            33%
Within ±20%:            53%
Within ±30%:            70%
```

The signed mean is intentionally slightly positive: PMI estimates are
"good operator" assumptions, and the pipeline includes a 1.25× good-operator
uplift in the markets fallback. On the report/all path, the residential-first
+ review-tier sort selects above-median operators by construction.

V1 (pre-PMI methodology) had mean signed +24% with much wider spread —
the V2 work eliminated the systematic bias.

## Results — V3 enhancement (commit b685d1b)

V3 added the seasonal annualisation pass and stacked ADR multipliers.
Numerically the headline calibration didn't move much (mean signed stayed
near +8%) but two qualitative improvements:

1. **Outliers shrunk**: V2 had 3 properties with >50% divergence, all in
   areas with many recently-added listings. V3's annualisation closed those
   gaps.
2. **Form-field sensitivity**: V2 was insensitive to outdoorSpace, parking,
   propertyType — they only fed UI display, not the calculation. V3's
   stacked multiplier makes them measurably affect the headline ADR.

Re-running V3 on the same dataset showed: outliers above 50% dropped to 1,
median |divergence| dipped to 16%, no regression in mean.

## Outlier sweep tool

`outlier-sweep.mjs` (103 lines) re-runs the top-3 outliers from a
calibration run at bedroom counts 1–5, to check whether the divergence is
caused by wrong bedroom inference or a real pipeline issue.

```bash
node scripts/outlier-sweep.mjs
```

Hard-codes three known-outlier properties (E13, SL6, M16). Edit the
`OUTLIERS` array to point at fresh outliers from a recent calibration run.

**Output format**:
```
━━━ E13 8NX — PMI baseline £36,000 ━━━
bed | annual     | Δ vs PMI  | ADR  | occ  | comps
----+------------+-----------+------+------+------
  1 | £ 21,400   |     -41%  | £ 90 |  65% | 12
  2 | £ 35,200   |      -2%  | £125 |  68% | 12
  3 | £ 48,900   |     +36%  | £160 |  72% | 12
  ...
```

If the row matching the actual bedroom count is close to PMI, the V2/V3
divergence was a bedroom-inference artefact. Ship is safe.

If no row is close, it's a real pipeline issue and needs tuning.

## How to recalibrate for a new dataset

1. Build a CSV: `address,pmi_estimate_currency,id` (header row required).
2. Adjust `inferBedGuest` brackets in `calibrate.mjs` if your market's
   revenue/bedroom relationship is different from UK PMI's. Or add a
   `bedrooms` column to the CSV and pull from it directly (small refactor).
3. Run with a small subset first: `node scripts/calibrate.mjs 5 /path/to/csv`.
4. Run on the full dataset: `node scripts/calibrate.mjs 100 /path/to/csv`.
   Expect ~15–25s per property (Airbtics report/all polling dominates).
5. Read the summary. Acceptance thresholds (heuristic):
   - **Ship**: mean signed within ±10%, median |div| ≤20%, 70%+ within ±30%
   - **Tune**: mean signed >±10% or 70% within ±30% threshold not met
   - **Stop and rethink**: median |div| >30% or many outliers >50%
6. If tuning is needed:
   - Mean signed too positive: lower `LOCATION_ADR_MULT`, lower stacked
     `RAMP_UPLIFT_BY_REVIEWS` uplifts, or remove `GOOD_OPERATOR_UPLIFT`
   - Mean signed too negative: raise the same constants
   - Mean OK but spread too wide: review the outlier set, look for a
     missing dimension (e.g. coastal vs inland not captured)

## Calibration vs validation

The 30-property PMI dataset was used as both calibration set and
validation set in the live work — there was no holdout. For a new
project, hold out 20% of the dataset for validation: tune on the 80%,
then check the held-out 20% has comparable accuracy. If validation is
materially worse than calibration, the constants overfit.

## Costs

A 30-property calibration run costs ~$15 in Airbtics credits ($0.50 per
report/all). The `reportCache` (24h TTL) means repeat runs of the same
dataset are free for the next 24h.
