# 02 — Step-by-Step Logic

Each step below maps to a section of `buildDataFromReportComps` in
`airbtics.ts`. Line numbers refer to the verbatim copy.

## Step 3a — Non-UK lat/lng filter

**Function**: `isUKListing(c)` — `airbtics.ts:308`

**Rule**: Keep only listings inside the UK bounding box.

```ts
const UK_BOUNDS = { minLat: 49, maxLat: 61, minLng: -8, maxLng: 2 };
```

**Why**: Airbtics' `report/all` returns the geographically nearest 40 comps
regardless of country. For a postcode in Cornwall (TR), the nearest 40 can
include listings on the French/Spanish coast. Those listings are priced in
EUR-equivalent and have very different occupancy patterns; including them
inflates ADR by 10–20%.

**Edge case**: If lat/lng are missing on a comp (rare), keep it — can't verify.

**Portability**: For a non-UK market, swap to the bounding box of the target
country/region.

## Step 3b — Revenue > 0 filter

**Inline**: `withRevenue = ukComps.filter((c) => (c.annual_revenue_ltm ?? 0) > 0)`

**Why**: Airbtics returns brand-new and dormant listings with `annual_revenue_ltm = 0`.
These are noise — they tell us nothing about market performance.

**Note**: This is fine to apply BEFORE the V3 annualisation pass because
Step 3f handles part-year listings using `revenue_ltm_monthly` (which has
non-zero entries even when the LTM total is small). A brand-new listing with
zero revenue across all months is genuinely useless.

## Step 3c — Tiered guest tolerance

**Function**: `filterByGuestsTiered(comps, targetGuests)` — `airbtics.ts:332`

**Rule**: Try exact match (`accommodates === guests`). If <12 comps, widen to
±1, then ±2, then ±3.

```ts
const tiers = [0, 1, 2, 3];
for (const tolerance of tiers) {
  const filtered = comps.filter((c) => {
    const g = c.accommodates || 0;
    return g >= (targetGuests - tolerance) && g <= (targetGuests + tolerance);
  });
  if (filtered.length >= 12) return filtered;
  if (tolerance === 3) return filtered.length > 0 ? filtered : comps;
}
```

**Why guests, not bedrooms**: PMI's research showed STR revenue scales with
guest capacity, not bedroom count. A 2-bed sleeping 6 (sofa beds) competes
with 3-beds sleeping 6, not other 2-beds.

**Why tiered**: Hard guest match is too restrictive in low-density areas.
Pure ±3 is too loose in dense areas. Tiered widening picks the tightest
match that yields enough comps for stable medians.

## Step 3d — Residential-first property tiering

**Function**: `isResidential(c)` — `airbtics.ts:317`

**Rule**: Sort residential properties first, non-residential last. Don't
exclude — non-residential become tail of the list.

```ts
const NON_RESIDENTIAL_TYPES = [
  'lodge', 'cabin', 'chalet', 'boat', 'treehouse',
  'glamping', 'rv', 'tent', 'yurt', 'cave', 'mobile home',
];
```

**Why**: Most PMI deals are residential houses/flats. A glamping yurt that
nets £80k/year is an outlier that distorts the median upward. But excluding
non-residential breaks rural/coastal areas where they're the only comps.
So: deprioritise but don't drop.

## Step 3e — Parking sort (conditional)

**Inline**: When `hasParking === true`, comps with parking amenities float
to the top of the sort order.

**Why**: For properties where parking is a unique feature (urban areas,
event-adjacent), comps without parking under-represent the achievable ADR.
This is a per-attribute lift; the V3 stacked multiplier (Step 8b) does the
quantitative version.

## Step 4 — Review tier sort → distance, take top 12

**Function**: `reviewTier(c)` — `airbtics.ts:324`

```ts
function reviewTier(c) {
  const r = c.visible_review_count || 0;
  if (r >= 10) return 1; // Tier A — established
  if (r >= 3)  return 2; // Tier B — some track record
  return 3;              // Tier C — new/unproven
}
```

Sort: tier ascending (1=best), then haversine distance ascending. Take top 12.

**Why 12**: PMI underwriters look at ~10–15 comps. 12 is a stable median
denominator that doesn't bottom out in low-density areas.

**Why review tier before distance**: A Tier-A listing 2km away is a more
reliable signal than a Tier-C listing 200m away. Reviews are the cheapest
proxy for "this listing's revenue isn't an artefact."

## Step 3f — Seasonal index + comp annualisation (V3)

**Functions**:
- `buildSeasonalIndex(comps)` — `airbtics.ts:589`
- `annualiseComps(comps, seasonalIndex)` — `airbtics.ts:667`
- `getRampUplift(reviewCount)` — `airbtics.ts:545`

**This is the V3 fix that closed the biggest accuracy gap.** Before V3, a
listing live for 6 months with £20k LTM revenue was treated as a £20k/year
listing — but its part-year revenue is closer to £40k annualised.

**Sub-step 1**: Build a 12-point seasonal index. Priority:
1. **Mature comps curve** (50%): comps live ≥12 months — average their
   `revenue_ltm_monthly` by calendar month
2. **Market curve** (50%): all comps' `occupancy_rate_ltm_monthly` averaged
   by calendar month (used as proxy when mature curve is thin)
3. **Fallback** (`UK_DEFAULT_SEASONAL_INDEX`): blended UK STR seasonal pattern

**Sub-step 2**: For each comp:
- Parse `added_on` / `created_date` / `listed_date`
- If listing is ≥12 months old: revenue is real LTM, no annualisation needed
- If <12 months old: compute `seasonalCoverage` = sum of seasonal index over
  active months, divide by 12. Then `annualisedRevenue = rawRevenue / seasonalCoverage`
- Always apply ramp-up uplift by review count:
  - ≤4 reviews: +30%
  - 5–9: +18%
  - 10–19: +8%
  - 20–49: +3%
  - 50+: 0%

**Why ramp uplift**: New listings underperform because Airbnb's algorithm
deprioritises them. They reach steady-state revenue ~50 reviews in. The
uplift compensates so a 3-review listing isn't taken as a permanent lower
ceiling.

## Step 5 — Weighted ADR + weighted occupancy (V3)

**Functions**:
- `compSimilarityWeight(comp, targetBeds, lat, lng, reviewWeight)` — `airbtics.ts:736`
- `calculateWeightedADR` — `airbtics.ts:762`
- `calculateWeightedOccupancy` — `airbtics.ts:789`

**Weight formula** per comp:

```
weight = distScore × bedroomScore × typeScore × reviewWeight
       = (1 / (1 + distMi)) × (1.0 if exact match else 0.7)
       × (1.2 if residential else 0.85)
       × (review-tier weight: 0.40 → 1.0)
```

**Why weighted instead of median**: V2 used median ADR + outlier trim.
V3 weighted produces tighter forecasts because:
- A 100m-away exact-bedroom-match Tier-A comp counts ~3× a 2km-away
  bedrooms-off Tier-C comp
- Outliers self-down-weight (they're usually distant or unproven)
- No arbitrary trim threshold to tune

V2 median + outlier trim is preserved as `wasADRTrimmed` for telemetry only —
not applied to the headline.

## Step 6 — Quality multiplier (capture only)

```ts
const FINISH_MULTIPLIERS = {
  below_average: 0.75, average: 1.0, high: 1.15, very_high: 1.30,
};
```

**Critical**: This multiplier is captured for the **scenarios layer only**.
The headline `annualRevenue` does NOT include it.

**Why**: Headline matches PMI methodology. Adding a quality multiplier on
top double-counts and introduces the "systematic +20-30%" bias that V1 had.
V2 fixed this by moving the multiplier to the scenarios layer.

## Step 7 — Seasonal ADR + occupancy curves

**Function**: `buildSeasonalMultipliers(comps, monthlyField)` — `airbtics.ts:1199`

Builds two 12-point curves from comp monthly fields:
- ADR seasonal (`booked_daily_rate_ltm_monthly`)
- Occupancy seasonal (`occupancy_rate_ltm_monthly`)

```
multiplier[month] = monthAverage / annualAverage
```

Falls back to a typical UK seasonal pattern if <6 months of comp data.

**Why two separate curves**: ADR peaks in summer for premium destinations
but occupancy peaks earlier (May–June). Combining them into one revenue
seasonality blurs both signals.

## Step 8b — Stacked ADR feature multiplier (V3)

**Function**: `getADRMultiplier(input)` — `airbtics.ts:835`

```
total = locationMult × propTypeMult × outdoorMult × parkingMult
        × conditionMult + specialBonus
```

Tables (excerpt):
- `LOCATION_ADR_MULT`: urban 1.00, suburban 1.05, coastal 1.28, rural 1.22–1.32
- `PROPERTY_TYPE_ADR_MULT`: flat 1.00, terraced 1.05, detached 1.14,
  cottage 1.26, barn_conversion 1.38, unique 1.45
- `OUTDOOR_ADR_MULT`: none 1.00, garden 1.08, hot_tub 1.24, large_grounds 1.20
- `CONDITION_ADR_MULT`: average 1.00, high 1.24, very_high/luxury 1.38
- Parking: 0=1.00, 1=1.06, 2+=1.10
- `specialFeatures` bonus: sea_views +0.15, hot_tub +0.20, near_events +0.08

**Why stacked**: PMI's published methodology lists each as an independent lift.
Multiplicative stacking matches their underwriting more closely than additive
bonuses.

**Tuning**: These tables are PMI/UK-specific — start from PMI's published
multipliers, then tune against the calibration dataset.

## Step 8 — Monthly forecast assembly

```ts
monthlyForecast[i] = {
  adr: adjusted_ADR * seasonalADRMultiplier[i],
  occupancy: min(base_occ * seasonalOccMultiplier[i], 1.0),
  revenue: round(adr * occupancy * DAYS_IN_MONTH[i]),
};
annualRevenue = sum(monthlyForecast.revenue);
```

Cross-check: `ADR × occ × 365` should be within ±5% of summed monthly
revenue. Logged as a warning if it diverges.

## Step 9 — Scenarios (worst / base / best)

```ts
worst = forecast(adjusted_ADR × qualityMultiplier, base_occ)
base  = forecast(adjusted_ADR × qualityMultiplier, base_occ × 1.05)
best  = forecast(adjusted_ADR × qualityMultiplier × 1.05, base_occ × 1.05)
```

**Headline `annualRevenue` is the unadjusted forecast** (no quality mult).
Scenarios are the quality-adjusted three-point spread for the UI.

**V3 fix**: V2 had `bestForecast = worstForecast` (copy-paste bug). V3
properly differentiates the three scenarios.
