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
| Voice **output** (server proxy via ElevenLabs, queued, sentence-by-sentence, one voice per member of staff) | `ELEVENLABS_API_KEY`; JARVIS: `ELEVENLABS_VOICE_ID_JARVIS` → `ELEVENLABS_VOICE_ID`; Janet: `ELEVENLABS_VOICE_ID_JANET` → `NEXT_PUBLIC_JANET_VOICE_ID` → `ELEVENLABS_VOICE_ID` | ✅ — `ELEVENLABS_VOICE_ID` (JARVIS) and `NEXT_PUBLIC_JANET_VOICE_ID` (Janet) are set, so no new variables are needed |

## Memory / persistence

| Feature | What it needs | Status |
| --- | --- | --- |
| Session messages persisted in KV | Vercel KV bound (`KV_REST_API_URL`, `KV_REST_API_TOKEN`), plus `JARVIS_INTERNAL_TOKEN` (server) and `NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN` (client) — **both tokens must match** | 🔴 — runtime logs show `/api/memory 401` on every load |
| Cross-session context (long-term memory) | Same as above | 🔴 |
| End-of-day learning save | `N8N_WEBHOOK_LEARNING_SAVE` | 🟡 — wired but never observed firing |

When the memory tokens are missing or mismatched, JARVIS still chats fine
— he just can't remember anything across sessions, and a page refresh
starts blank. The client now keeps one session id per tab
(`sessionStorage`) and summarises on tab-hide with a keepalive request, so
once the two tokens match (set them to the same value, then redeploy —
the `NEXT_PUBLIC_` one is inlined at build time) restore and cross-session
memory work without further code changes.

## Marketing department (Jarvis + Janet)

Reads the private `ZacStayful/stayful-ads` repo at runtime (read-only, cached 1h). Opened by marketing questions ("how are the ads doing?", "Janet, …", "department briefing").

| Feature | What it needs (Vercel env) | Status |
| --- | --- | --- |
| Department view + director answers (`/api/marketing`, chat context) | `STAYFUL_ADS_GITHUB_TOKEN` — fine-grained token, only `stayful-ads`, Contents read-only, server-side (never `NEXT_PUBLIC_`) | 🟡 — set in Vercel (Production + Preview); awaiting the preview test. Without it the view and the directors say the data is unavailable |
| Janet's own voice | `NEXT_PUBLIC_JANET_VOICE_ID` (ElevenLabs voice ID, different from Jarvis's); `/api/speak` reads it server-side by persona, so it no longer needs to be inlined | 🟡 — set in Vercel (Production + Preview); awaiting the preview test. Without it Janet speaks in Jarvis's voice |

## API route security

Routes called by outside services can't use the login cookie, so `middleware.ts` locks them with a shared secret instead. The lock is **off until `JARVIS_API_SECRET` is set**, so update the callers first, then set the variable.

| Feature | What it needs (Vercel env) | Status |
| --- | --- | --- |
| Lock on `/api/whatsapp`, `/api/calendly` (not the webhook), `/api/retell`, `/api/monday`, `/api/email`, `/api/lucy/voice` | `JARVIS_API_SECRET` (`openssl rand -hex 32`) | 🟡 — set in Vercel (Production + Preview). Takes effect with the deploy that includes this lock; until then these routes are open to anyone with the URL (they can email leads, text them, start Lucy calls and edit Monday) |

Callers send the secret as an `x-jarvis-secret` header, `Authorization: Bearer <secret>`, or `?key=<secret>` on the URL. Update every caller **before** the lock goes live (the variable is set and the code that enforces it is deployed):

1. **Retell (Lucy) custom functions**: `monday/lead`, `monday/update-lead`, `monday/get-updates`, `monday/update-status`, `retell/send-link`, `calendly/availability`, `calendly/book`. Add `?key=…` to each function URL, or the header if Retell lets you set one.
2. **Retell agent webhooks**: the call webhook (`/api/retell/webhook`) and the inbound dynamic-variables webhook (`/api/lucy/voice/context`). Add `?key=…`.
3. **n8n HTTP nodes**: anything n8n posts to these prefixes uses the n8n Header Auth credential **"JARVIS API Secret"** (header `x-jarvis-secret`). ✅ Done for "Forward to Jarvis" in *Stayful: Inbound SMS to Monday* (how Twilio texts reach `/api/whatsapp/reply`) and the eight `whatsapp/send-*` nodes in *SMS Qualified Management*.
4. **Twilio** messaging webhook: goes to n8n, which forwards to JARVIS (item 3). If it's ever pointed straight at `/api/whatsapp/reply`, add `?key=…`.
5. **Resend** webhook (`/api/email/tracking`): add `?key=…`.
6. **AssemblyAI** transcription callbacks (`/api/retell/transcribe?itemId=…`): whatever submits the job adds `&key=…` to `webhook_url`.
7. **Calendly** webhook (`/api/calendly/webhook`): not behind this lock (see below). To secure it, recreate the subscription with a signing key and set `CALENDLY_WEBHOOK_SIGNING_KEY`.

Anything still missing the secret gets a 401 once the lock is live; the Vercel runtime logs show which route. To roll back, remove `JARVIS_API_SECRET` in Vercel and redeploy. The JARVIS test page (`/test/whatsapp`) keeps working through your login.

Lead-facing routes (`/api/qualifier`, `/api/presentation`, `/api/tracking`) stay public, because leads' browsers call them. They only accept a numeric Monday item ID, known fields and short values.

Self-authenticating routes skip the login check:
- `/api/cron/weekly-intelligence`: Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. The route refuses everything if `CRON_SECRET` isn't set (it is set in Vercel).
- `/api/intelligence/approve` and `/reject`: links signed with `REVIEW_SECRET`, so they open from your inbox without a login.
- `/api/calendly/webhook`: checks Calendly's signature once `CALENDLY_WEBHOOK_SIGNING_KEY` is set (🔴 not set yet: the current subscription has no signing key, so the webhook is still open). It always answers 200, because Calendly switches a subscription off after repeated errors.

The weekly report email (`lib/intelligence.ts`) is sent through the old `stayful-voice-api` app's `/api/email/send`, so don't pause or delete that Vercel project until the email moves.

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
3. **Two voices.** `/api/speak` picks the ElevenLabs voice by persona:
   JARVIS from `ELEVENLABS_VOICE_ID_JARVIS` then `ELEVENLABS_VOICE_ID`;
   Janet from `ELEVENLABS_VOICE_ID_JANET`, then `NEXT_PUBLIC_JANET_VOICE_ID`,
   then `ELEVENLABS_VOICE_ID`. The old client-side streaming path
   (`NEXT_PUBLIC_ELEVENLABS_*`) has been removed; speech now streams
   sentence by sentence through the proxy.
4. **`process.env.NEXT_PUBLIC_*`** values are inlined at **build time**.
   Changing them in Vercel requires a redeploy, not just a restart.
