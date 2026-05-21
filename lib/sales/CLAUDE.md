# Sales Intelligence Dashboard — Claude Code Project Guide

> **Purpose**: This file tells future Claude Code sessions everything they need
> to extend, maintain, and re-wire the Sales Intelligence Dashboard. Read it
> first before touching anything under `app/sales/`, `app/api/sales/`,
> `components/sales/`, or `lib/sales/`.
>
> **Scope**: This is one feature inside the JARVIS app, not a standalone
> project. It is built across four directories, all inside the JARVIS repo:
>   - Route:        `app/sales/page.tsx`
>   - API:          `app/api/sales/*`
>   - Data + logic: `lib/sales/*`        ← **column IDs and metric calc live here**
>   - UI:           `components/sales/*`

---

## 1. PROJECT IDENTITY

**What this is**: A live read-only intelligence dashboard for Stayful's sales
pipeline, reading directly from Monday.com board `5891626711`. Four
focusable chunks, voice-driven. Each chunk fetches independently.

**Owner**: Zac Harrison (zac@stayful.co.uk)
**Lives at**: `/sales` (auth-gated by `middleware.ts`)
**Tech stack** (inherited from JARVIS): Next.js 16 + React 19 + TypeScript +
Tailwind v4 + Vercel. Anthropic SDK for AI briefings.
**Branch convention**: feature branches per session
(`claude/jarvis-sales-dashboard-c0k2B` was Session 1).

---

## 2. SESSION ROADMAP

| Session | Status | Scope |
|---|---|---|
| **1** | ✅ shipped | Dashboard scaffold, four chunks, AI summary, voice commands. Uses existing columns only. Graceful degradation for everything missing. |
| **2** | ⏳ pending | Activity Log board in Monday, new date-milestone + WA columns, n8n daily-batch logger, n8n status-change webhook → Activity Log. Then **update column IDs in `lib/sales/monday.ts`**. |
| **3** | ⏳ pending | WhatsApp send/reply/retry/learn (Twilio + Google Drive learning store). |

**Strict rule**: Do not pull Session 2/3 work into a Session 1 PR. Each session
ships independently.

---

## 3. NON-NEGOTIABLE DESIGN PRINCIPLES

1. **Server-side only token access.** `MONDAY_API_TOKEN` (or the legacy
   `MONDAY_API_KEY`) is never exposed to the client. All Monday reads go
   through `/api/sales/*`.
2. **HTTP GraphQL pattern only.** Never use the n8n native Monday node pattern.
   Mirror `app/api/lucy/calls/route.ts`.
3. **Chunked, independent fetches.** Each chunk owns its own `useEffect` +
   loading/error state. One slow chunk must not block the others.
4. **Graceful degradation, never crash.** Missing columns or activity_logs
   surface a "Tracking from setup date" pill, never an error.
5. **Auth comes from middleware.** New routes inherit the cookie check at
   `middleware.ts:17`. No per-route auth logic needed.
6. **JARVIS voice in the AI summary.** British, analytical, framework
   language (`revenue floor`, `comparable properties`, `fast-path signals`,
   `slow-path signals`, `post-meeting inaction`). No generic business prose.

---

## 4. ARCHITECTURE AT A GLANCE

```
Browser (/sales)
  └─ components/sales/SalesDashboard.tsx
       owns: date range, focused chunk, voice intercepts, TTS
       ├─ DateRangePicker         (preset: week/month/year + custom)
       ├─ ChunkWrapper (×4)       (status dot, scan line, focus banner)
       │    ├─ PipelineFunnel     → GET /api/sales?chunk=pipeline
       │    │     + GET /api/sales?chunk=summary  (AI card)
       │    ├─ OutreachMetrics    → GET /api/sales?chunk=outreach
       │    ├─ WebMeetingMetrics  → GET /api/sales?chunk=meetings
       │    └─ SpecialOffers      → GET /api/sales?chunk=offers
       └─ voice command "summarise" → POST /api/sales/summarise
```

**Cache**: 5-min in-memory in `lib/sales/monday.ts`. One Monday GraphQL
fetch serves all four chunks per warm Lambda. Re-fetch is automatic when
the date range changes.

---

## 5. COLUMN IDs — UPDATE THESE IN SESSION 2

Single source of truth: **`lib/sales/monday.ts` → `COL`**.

**Existing (working today):**
```
status                     status5
profile                    text_mm1x8cgy
presentationResponse       long_text_mm2pse8d   (populated = engaged)
callRecording              file_mm1daxvv        (populated = called)
specialOfferType           dropdown_mm0wabga
specialOfferExpiry         date_mm0wdvyx
estimatedRent              numbers_mkn25e0y
propertyAddress            text6
email                      text_mkygb5xx
```

**Placeholder IDs (Session 2 will create these columns and rename the IDs):**
```
dateFirstQualified         date_first_qualified
dateBecameCustomer         date_became_customer
emailsSent                 numbers_emails_sent
waMessagesSent             numbers_wa_messages_sent
waReplies                  numbers_wa_replies
waConversation             long_text_wa_conversation
waStatus                   color_wa_status
wasNoShowed                checkbox_was_noshowed
```

When Session 2 finishes, replace the placeholder strings with the real
Monday column IDs. Nothing else needs to change — the metric calcs in
`lib/sales/metrics.ts` already key by `COL.*`, and the UI already handles
the "absent → coming soon" path.

**Status values** (must match Monday `status5` labels exactly):
`Cold | Abandoned | Future | Web meeting booked | Web meeting no show |
Warm | Special offer applied | Customer`.

---

## 6. METRIC DEFINITIONS — CANONICAL

All implementations live in `lib/sales/metrics.ts`. If a stakeholder asks
"what does X mean", point them here and the file together.

**Pipeline (Chunk 01)**
- Cold leads:                items where `status=Cold` AND `created_at` ∈ range
- Qualification drop-off %:  abandoned / cold leads
- Attendance rate %:         (warm + offer + customer) / web meeting booked
- No-show rate %:            no-show / web meeting booked
- Re-engagement rate %:      (no-shows that returned to booked) / no-show
   - Source preference: `activity_logs` → `checkbox_was_noshowed` → none
- Post-meeting close %:      customer / (warm + offer)
- Overall cold→customer %:   customer / (anyone who entered the funnel in range)
- **Targets**: cold→customer 12-15%, attendance >50%, post-meeting close >15%

**Outreach (Chunk 02)** — channel cards: Calls, Email, WhatsApp (the last
is a "Coming Soon" card until the WA columns are created in Session 2).

**Web Meetings (Chunk 03)** — surfaces the pipeline rates plus
warm/offer/customer counts, warm→customer %, offer→customer %, and
avg-days-to-convert (the last is null until the milestone date columns
exist).

**Special Offers (Chunk 04)** — table of leads with `dropdown_mm0wabga`
populated, sorted by days remaining. Red highlight ≤7 days, amber ≤30.

---

## 7. AI SUMMARY — VOICE & FRAMEWORK

The Chunk 01 AI card and the `/api/sales/summarise` endpoint both write
through `claude-sonnet-4-6`. The system prompts live inline in:
- `app/api/sales/route.ts` → `SUMMARY_SYSTEM`
- `app/api/sales/summarise/route.ts` → `SYSTEM`

**Required language** (do not loosen):
- "revenue floor", not "income projection"
- "comparable properties", not "case studies"
- "fast-path signals" — leads converting in 1-2 touches
- "slow-path signals" — leads cycling without converting
- "post-meeting inaction" — high warm count vs low customer count
- VALIDATE → REFRAME → QUANTIFY when responses are discussed

**Targets to reference**: cold→customer 12-15%, attendance >50%,
post-meeting close >15%, fast-path 1-2 touches, slow-path qualified
out by touch 4-5.

If a Session 4+ needs deep analysis (not a 4-5 sentence summary),
upgrade that single endpoint to `claude-opus-4-7` (mirroring the
existing Lucy analyse route).

---

## 8. VOICE COMMANDS

All sales-related command detection lives in **`lib/sales/commands.ts`**.

**Navigation (handled in `app/page.tsx → applyNavIntents`):**
"open sales", "sales dashboard", "show sales", "show me the pipeline",
"how are we doing", "what's our conversion rate", "sales intelligence".

**On the dashboard (handled in `components/sales/SalesDashboard.tsx`):**
- `focus-pipeline | focus-outreach | focus-meetings | focus-offers`
- `summarise` → POST `/api/sales/summarise` with the focused chunk's metrics → TTS
- `next-section | previous-section`
- `close` → router.push('/')

**Precedence**: sales nav must beat Lucy. The existing entry in
`lib/jarvis-design.ts` no longer maps "sales" / "pipeline" to the legacy
LeadsView — that mapping was removed in Session 1.

---

## 9. WHAT THIS IS NOT

- NOT a write-back tool to Monday — read-only by design
- NOT a place to wire up Twilio / WhatsApp send (that's Session 3)
- NOT a place to build n8n workflows (that's Session 2)
- NOT a place to query live STR market data
- NOT a generic CRM view — the four chunks are the spec

---

## 10. HOW TO ADD A NEW METRIC

1. Add the calc to `lib/sales/metrics.ts` inside the relevant `compute*`
   function. Pure function only — no fetching.
2. If it needs a new Monday column, add an entry to `COL` in
   `lib/sales/monday.ts`. Flag as OPTIONAL until the column exists.
3. Surface it in the matching `components/sales/*` chunk.
4. If the metric is high-signal enough to mention in a briefing, add it
   to the data block sent to Claude in `app/api/sales/route.ts`
   (`userBlock`) and in `app/api/sales/summarise/route.ts`.
5. Do not put metric calculation in a UI component — it always lives
   in `lib/sales/metrics.ts`.

---

## 11. HOW TO ADD A NEW CHUNK

1. Add the chunk id to `CHUNK_ORDER` + `CHUNK_META` in
   `lib/sales/commands.ts`. Add focus patterns to `PATTERNS`.
2. Build a `components/sales/MyChunk.tsx` mirroring `OutreachMetrics.tsx`:
   own fetch, own status, own onMetricsReady, wrapped in `<ChunkWrapper>`.
3. Add a new branch to `app/api/sales/route.ts` (`chunk='my-chunk'`)
   and a corresponding `computeMyChunk()` in `lib/sales/metrics.ts`.
4. Render it inside `SalesDashboard.tsx` under the existing four.

---

## 12. ENVIRONMENT VARIABLES

**Required today:**
- `MONDAY_API_TOKEN` (or legacy `MONDAY_API_KEY`) — Monday read
- `ANTHROPIC_API_KEY` — AI summary + briefings
- `SESSION_SECRET` + `JARVIS_PASSWORD` — auth (inherited from JARVIS)

**Required before Session 3:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `GOOGLE_DRIVE_CREDENTIALS` (JSON service account)

**Optional:**
- `MONDAY_BOARD_ID` — overrides the hard-coded `5891626711`.

---

## 13. PATTERNS TO PRESERVE (DO NOT DRIFT)

| Concern | Pattern |
|---|---|
| Monday transport | `lib/sales/monday.ts → mondayQuery()` — never use a native node, never inline fetch |
| Caching | In-memory map in `monday.ts`, 5-min TTL. Do not introduce Vercel KV here — Monday is rate-limited, not slow. |
| Numbers | All percentages go through `pct()` in `metrics.ts`. One decimal place. |
| Dates | Monday returns ISO strings. Use `getColDate()` helper. |
| Colours | `lib/jarvis-design.ts → C`. Never inline hex codes — Zac will tweak the palette in one place. |
| Animations | Co-located `<style>` block in `SalesDashboard.tsx`. Do not pull in styled-jsx. |
| Voice/TTS | Reuse `useTTS` + `useVoiceInput` hooks. Do not roll a second voice layer. |

---

## 14. COMMON PITFALLS

- **`text_mm1x8cgy` is the lead profile** (not the lead name). Do not
  display profile as the lead identifier.
- **Re-engagement requires activity_logs OR `checkbox_was_noshowed`**;
  without either, the rate is `0%` with a "tracking from setup" note. Do
  not fabricate a value.
- **The `name` field of an item IS the lead name** — don't look in
  column values for it.
- **`column_values` returns only existing columns** — querying for a
  non-existent column doesn't error, it simply omits the entry. Always
  guard with `hasColumn()` if behaviour depends on existence.
- **WhatsApp card is intentionally "Coming Soon"** until Session 2 ships
  the columns. Do not stub fake numbers.

---

## 15. RUNBOOK / WHEN THINGS BREAK

| Symptom | First check |
|---|---|
| Chunk shows RETRY | Hit `/api/sales?chunk=<id>` directly — surface the error. Usually `MONDAY_API_TOKEN` missing or rotated. |
| AI summary blank | `ANTHROPIC_API_KEY` missing — the route returns a polite fallback string rather than a 500. |
| Re-engagement always 0 | Monday plan does not expose `activity_logs` and `checkbox_was_noshowed` is not populated yet. Expected pre-Session 2. |
| Date filtering looks wrong | Currently uses `created_at` for cold leads only; pipeline-stage counts use *current* status. Historical filtering ships with Session 2 milestone columns. |
| Voice not navigating "sales" | Check that `detectSalesCommand` returns `'navigate'` first in `app/page.tsx → applyNavIntents`. Lucy must come after sales in the chain. |
