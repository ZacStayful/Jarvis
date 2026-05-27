# Lucy Voice Agent — Current State Audit

Captured before the dynamic-profile-injection upgrade.

- Date: 2026-05-27
- Branch: `claude/gracious-cannon-PuSFb`
- Repo: `ZacStayful/Jarvis`

## Scope of this audit

This records the **repository-side** state prior to any change. The
**live Retell LLM/agent config** capture (Task 1b/1c) and the
`prompt-backup-YYYYMMDD.txt` snapshot are **pending** — they require
calling `api.retellai.com` with the production API key, which is held
until explicit go-ahead (see "Pending" below).

## Repository facts

- Framework: **Next.js (App Router)**, `next@^16`, React 19, TypeScript.
  The task assumed an Express server; that is incorrect. New endpoints
  are App Router route handlers under `app/api/**/route.ts`.
- `tsconfig.json`: `resolveJsonModule: true`, path alias `@/*` → `./*`.
- Retell-related code already present:
  - `app/api/retell/call/route.ts` — creates outbound Retell calls via
    `POST https://api.retellai.com/v2/create-phone-call`. Reads lead data
    from Monday (board `5891626711`) and passes Lucy's dynamic variables:
    `monday_item_id, lead_name, address, lead_profile, call_summary,
    last_call_date, web_meeting_summary`.
  - `app/api/retell/webhook/route.ts`, `app/api/retell/transcribe/route.ts`,
    `app/api/retell/send-link/route.ts`.
  - `app/api/lucy/voice/context/route.ts` and other `app/api/lucy/*` routes.
- Default agent id referenced in code: `agent_82f187b32e8f5e7913da1c506f`
  (matches the AGENT_ID in the task). LLM id is not hardcoded in app code.
- Environment variables referenced: `RETELL_API_KEY`, `RETELL_FROM_NUMBER`,
  `RETELL_AGENT_ID` (optional), `MONDAY_API_KEY`, `RESEND_API_KEY`,
  `ANTHROPIC_API_KEY`, `SESSION_SECRET`. Note: `.env.example` does not yet
  list the Retell vars even though the code reads them.
- `middleware.ts` gates all routes behind a `jarvis_auth` cookie except an
  explicit allowlist (`/api/retell`, `/api/monday`, `/api/calendly`,
  `/api/whatsapp`, `/api/lucy/voice`, etc.). Any endpoint that n8n/Retell
  must hit unauthenticated MUST be added to that allowlist.

## Outbound call trigger (current)

Triggered by `POST /api/retell/call` with `{ monday_item_id }`. No
`psychology_profile_context` or `emotional_profile` is passed today —
those are introduced by this upgrade. The n8n outbound workflow that
calls this route has not been inspected yet (Task 6, pending).

## Pending (require live access / explicit go-ahead)

- [ ] GET `get-retell-llm/{LLM_ID}` — capture current `general_prompt`,
      `model`, `general_tools`, `begin_message`; save as
      `audit/prompt-backup-20260527.txt`.
- [ ] GET `get-agent/{AGENT_ID}` — capture `voice_id`, `response_engine`,
      `ambient_sound`, `interruption_sensitivity`, reminders, webhooks.
- [ ] PATCH the live LLM with the restructured prompt (Task 3).
- [ ] PATCH the live agent settings (Task 5).
- [ ] Inspect + update the n8n outbound workflow (Task 6).

## Security note

The Retell API key and a GitHub PAT were supplied in plaintext in the
task description. They are not written to any file in this repo and must
not be committed. Recommend rotating both.
