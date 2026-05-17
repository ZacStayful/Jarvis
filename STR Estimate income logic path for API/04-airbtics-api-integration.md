# 04 — Airbtics API Integration

The pipeline depends on **Airbtics** — a third-party API that aggregates
Airbnb listing performance data. Without Airbtics (or an equivalent data
source), the pipeline can't run.

## Connection details

- **Base URL**: `https://crap0y5bx5.execute-api.us-east-2.amazonaws.com/prod`
- **Override**: `AIRBTICS_BASE_URL` env var
- **Auth**: `x-api-key: <AIRBTICS_API_KEY>` header on every request
- **Docs**: https://documenter.getpostman.com/view/25155751/2sB3QRoSvW

## Critical: `cache: 'no-store'` on every fetch

Every Airbtics fetch in `airbtics.ts` includes `cache: 'no-store'`. This was
fixed in commit `6e19d36` ("CRITICAL FIX: add cache: no-store to all Airbtics
fetch calls"). Without it, Next.js's default `fetch` caching makes Airbtics
return stale data for hours, breaking calibration and producing inconsistent
forecasts.

**If porting to a non-Next.js runtime**: the `cache: 'no-store'` option is a
no-op (it's Next.js-specific). On other runtimes, ensure no upstream proxy
or fetch wrapper caches Airbtics responses.

## Endpoints used

### Primary: `report/all` (two-step async)

**Cost**: $0.50 per new report. Reads of an existing report are FREE.

**Step 1 — POST**:
```
POST /report/all
Body: {
  latitude, longitude,
  bedrooms, bathrooms, accommodates,
  currency: 'GBP',
  country_code: 'GB',
}
Response: { message: { report_id: <uuid> } }
        | { message: 'insufficient_credits' }
```

**Step 2 — Poll GET**:
```
GET /report?id=<report_id>
Response: { message: { ..., comps_status, comps: [...], radius } }
```

Poll every 2s up to 25s total, until `comps_status === "success"` or
`comps.length > 0`. Cache the `report_id` keyed by `postcode_bedrooms`
for 24h — repeat reads are free.

**Per-comp shape (`ReportComp`)** — see `airbtics.ts:276`:
- Identity: `listingID`, `name`, `host_name`, `room_type`, `property_type`
- Geo: `latitude`, `longitude`
- Specs: `bedrooms` (string!), `bathrooms`, `accommodates`
- Reviews: `visible_review_count`, `reveiw_scores_rating` (NB: API typo, "reveiw")
- LTM totals: `annual_revenue_ltm`, `avg_occupancy_rate_ltm` (0–100),
  `avg_booked_daily_rate_ltm`, `active_days_count_ltm`
- Monthly: `revenue_ltm_monthly`, `booked_daily_rate_ltm_monthly`,
  `occupancy_rate_ltm_monthly` — all `Record<"YYYY-MM", number>`
- Maturity: `added_on` / `created_date` / `listed_date` (any of the three may
  be present — V3's `parseCompDate` checks all)

### Fallback: `markets/*` flow

Used when `report/all` returns no comps or returns null (e.g. credits
exhausted). Total cost: ~$0.46.

1. **`GET /markets/search?query=<city>&country_code=GB`** — $0.01 — find
   `market_id` from city name. The implementation has a hardcoded
   `KNOWN_MARKETS` table for the 26 most common UK cities to skip this call.
2. **`GET /markets/summary?market_id=&bedrooms=&currency=GBP`** — $0.25 —
   bedroom-specific summary: `revenue`, `occupancy`, `average_daily_rate`,
   `active_listings_count`, `market_grade`, `regulations`.
3. **`GET /markets/metrics/revenue?market_id=&bedrooms=&currency=GBP`** —
   $0.20 — last 24 months of monthly revenue percentiles (p10/p25/p50/p75/p90).
4. **`GET /markets/metrics/occupancy?market_id=&bedrooms=`** — $0.20 — same
   shape, occupancy percentiles.
5. **`POST /listings/search/bounds`** — $0.05 — listings inside a lat/lng
   bounding box. Used for nearby comparables when `report/all` is unavailable.
   Note: response's `listings` field is a JSON-encoded string that needs
   double-parsing (`JSON.parse(data.message.listings)`).

## Insufficient-credits handling

Every endpoint can return `{ message: 'insufficient_credits' }` (200 OK).
Always check `data.message === 'insufficient_credits'` before treating
`data.message` as the data payload. The pipeline returns `null` from
fetchers and falls through to the next path.

## Caching strategy

Two in-memory caches live in module scope:
- `reportCache: Map<postcode_bedrooms, { reportId, expiresAt }>` — 24h TTL.
  Saves $0.50 per repeat lookup.
- `marketIdCache: Map<outwardCode, { id, expiresAt }>` — 30min TTL.
  Saves the $0.01 `markets/search` call.

A `setInterval` cleans up expired entries every 10 min. Both caches are
process-local — they don't survive restarts and aren't shared across
serverless invocations. For production multi-instance deployments, swap to
Redis or persist `reportCache` to disk.

## Two API typos to know

1. `reveiw_scores_rating` (not `review`) on every comp — preserve the typo
   when reading.
2. `mobile home` includes a space in `NON_RESIDENTIAL_TYPES` — the
   `isResidential` check uses substring match so this works either way.

## Rate limiting

The pipeline does not implement Airbtics-side rate limiting (Airbtics' SLA
allows ~10 req/s on the prod tier). The 25s poll budget on `report/all` is
the main wait. When running calibration on >50 properties, sequential
processing (calibrate.mjs runs one at a time) avoids any rate concerns.

## Migration notes

For a non-UK market:

- Change `country_code` from `'GB'` to the new ISO code in `fetchReportAll`
- Change `currency` from `'GBP'` to the new ISO currency code throughout
- Replace the postal-code parsing in `findMarketId` (UK uses outward codes
  like `M1`, `SW1A` — other countries use different formats)
- Replace `KNOWN_MARKETS` (UK-specific market IDs) — query
  `/markets/search` for each major city in the new market and capture the IDs
- Verify Airbtics has coverage for the target country at airbtics.com/coverage
- The `lat/lng` UK bounds filter in `isUKListing` is also country-specific —
  swap to the bounding box of the target country
