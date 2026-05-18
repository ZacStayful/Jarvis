# JARVIS — Setup Status

Single reference for what's wired up and what needs configuration. Update
this file whenever you add or remove an integration.

**Legend**

- ✅ Working — confirmed via runtime logs
- 🟡 Configured but unverified — env vars are set, no end-to-end test yet
- 🔴 Missing — env vars not set, feature will error or no-op
- ⚪ Optional — not wired into the app yet, available as future work

---

## Core platform

| Feature | What it needs (Vercel env) | Status |
| --- | --- | --- |
| Login / session cookie | `JARVIS_PASSWORD`, `SESSION_SECRET` | ✅ |
| Claude chat (Opus/Sonnet streaming) | `ANTHROPIC_API_KEY` | ✅ |
| Voice **input** (Web Speech API) | none — runs in browser | ✅ |
| Voice **output** Phase 2 (server proxy via ElevenLabs) | `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` | ✅ |
| Voice **output** Phase 8 (client-streaming, lower latency) | `NEXT_PUBLIC_ELEVENLABS_API_KEY`, `NEXT_PUBLIC_ELEVENLABS_VOICE_ID` | 🔴 — `voiceEnabled: false` in `useJARVIS` until set |

## Memory / persistence

| Feature | What it needs | Status |
| --- | --- | --- |
| Session messages persisted in KV | Vercel KV bound (`KV_REST_API_URL`, `KV_REST_API_TOKEN`), plus `JARVIS_INTERNAL_TOKEN` (server) and `NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN` (client) — **both tokens must match** | 🔴 — runtime logs show `/api/memory 401` on every load |
| Cross-session context (long-term memory) | Same as above | 🔴 |
| End-of-day learning save | `N8N_WEBHOOK_LEARNING_SAVE` | 🟡 — wired but never observed firing |

When the memory tokens are missing, JARVIS still chats fine — it just
can't remember anything across sessions. The 401 errors are now silenced
by the guard in `hooks/useJARVIS.ts` so they won't spam the Network tab,
but persistence simply won't happen until both env vars are set.

## Intelligence feeds

| Feature | What it needs | Status |
| --- | --- | --- |
| News briefing (NewsAPI + Claude analysis) | `NEWSAPI_KEY` | 🔴 — last call returned 500. **Note:** the free NewsAPI tier blocks server-side requests on Vercel; a paid plan is required for production. |
| Investment dashboard (mock) | none — uses fixtures | ✅ |
| Portfolio Intelligence Dashboard | reads `portfolio/data/*.json` | ✅ structure, 🔴 data (placeholder zeros until you run the first quarterly update via chat) |

## Lucy (Monday.com lead intelligence)

| Feature | What it needs | Status |
| --- | --- | --- |
| Monday API access | `MONDAY_API_KEY`, optional `MONDAY_BOARD_ID` (defaults to `5891626711`) | 🟡 — env var likely set; no `/api/lucy/*` calls observed in latest log window (nav collision now fixed in this commit, so try again) |

## MCP integrations (Claude tool-use)

These are bearer-token MCP servers wired up in `lib/mcp-servers.ts`. Each
appears in the Claude `tools` list only if the corresponding env var is
set.

| Integration | Env var | Status |
| --- | --- | --- |
| Monday.com | `MONDAY_API_KEY` | 🟡 |
| Google (Gmail / Calendar / Drive — three separate MCPs share one token) | `GOOGLE_ACCESS_TOKEN` | 🔴 / 🟡 (unknown — confirm in Vercel) |
| Slack | `SLACK_BOT_TOKEN` | 🟡 |
| Calendly | `CALENDLY_API_KEY` | 🟡 |
| Granola | `GRANOLA_API_KEY` | 🟡 |

If a tool is missing in JARVIS's responses, the env var is almost
certainly not set in Vercel.

---

## Common gotchas

1. **Memory token mismatch.** `JARVIS_INTERNAL_TOKEN` (server) and
   `NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN` (client) must be set to the
   **same value**. The `NEXT_PUBLIC_` one is baked into the client
   bundle at build time, so changing it requires a redeploy.
2. **NewsAPI free tier.** Doesn't work on Vercel — you need the paid
   plan ($449/mo last we checked) or swap to a different feed source.
3. **ElevenLabs Phase 8 vs Phase 2.** Right now `app/page.tsx` uses the
   Phase 2 server proxy (`/api/speak`) and explicitly disables Phase 8
   client streaming with `voiceEnabled: false`. To switch, set the
   `NEXT_PUBLIC_ELEVENLABS_*` vars and flip that flag.
4. **`process.env.NEXT_PUBLIC_*`** values are inlined at **build time**.
   Changing them in Vercel requires a redeploy, not just a restart.
