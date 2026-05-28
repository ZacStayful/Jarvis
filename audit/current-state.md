# Lucy / Retell — Live State Audit

Captured before any changes. Date: 2026-05-27. Secrets are intentionally
redacted; IDs are recorded because they are needed to operate the integration.

## Retell LLM — `llm_eb27591518f3659fce06a448b5ab`

Read via `GET https://api.retellai.com/get-retell-llm/{LLM_ID}` (HTTP 200).

| Field | Value |
|---|---|
| `model` | `claude-4.5-sonnet` |
| `general_prompt` length | 16,733 chars |
| `begin_message` | `"Hi, this is Lucy from Stayful — I saw you enquired with us about short let management for {{address}}, is that correct?"` |
| `is_published` | `false` |
| `version` | `0` |
| `model_temperature` | `null` |
| `knowledge_base_ids` | `null` |
| `states` | none |

`default_dynamic_variables`:
```json
{
  "monday_item_id": "",
  "lead_name": "there",
  "address": "your property",
  "lead_profile": "Existing Property - STL Switch"
}
```

`general_tools` (6):
1. `get_lead_data` (custom)
2. `get_lead_updates` (custom)
3. `update_lead_status` (custom)
4. `check_calendly_availability` (custom)
5. `book_calendly_appointment` (custom)
6. `end_call` (end_call)

The full prior `general_prompt` is backed up verbatim at
`audit/prompt-backup-20260527.txt`.

## Retell Agent — `agent_82f187b32e8f5e7913da1c506f`

Read via `GET https://api.retellai.com/get-agent/{AGENT_ID}` (HTTP 200).

| Field | Value |
|---|---|
| `agent_name` | `Lucy — Stayful Lead Qualifier` |
| `voice_id` | `retell-Maren` |
| `language` | `en-GB` |
| `response_engine.llm_id` | **`llm_95dbc7f0ac93831e2f193c01189f`** (version 3) |
| `ambient_sound` | `coffee-shop` |
| `interruption_sensitivity` | `1` |
| `responsiveness` | `1` |
| `end_call_after_silence_ms` | `20000` |
| `max_call_duration_ms` | `1215000` (~20 min) |
| `enable_backchannel` | `true` |
| `backchannel_frequency` | `0.6` |
| `normalize_for_speech` | `true` |
| `webhook_url` | `https://stayful.app.n8n.cloud/webhook/lucy-post-call` |
| `is_published` | `false` |
| `version` | `3` |
| `reminder_trigger_ms` / `reminder_max_count` / `backchannel_words` | not set |

## Discrepancies vs the implementation task — must be resolved before live writes

1. **LLM-ID mismatch (highest impact).** The agent's `response_engine.llm_id`
   is `llm_95dbc7f0ac93831e2f193c01189f`, **not** the
   `llm_eb27591518f3659fce06a448b5ab` the task targets. Updating `llm_eb…`
   alone has **no effect on live calls**. Task 5's agent PATCH would repoint
   the agent to `llm_eb…` — a substantial change that switches the live LLM
   the agent runs.

2. **Model name.** Live value is `claude-4.5-sonnet` (Retell's naming). The
   task instructs setting `model: "claude-sonnet-4-5"`, which is a different
   string and may be an invalid Retell model identifier. Recommend preserving
   the existing valid value rather than risk breaking the agent.

3. **Tools referenced by the new prompt that are not configured.** The new
   prompt instructs Lucy to use `send_email` and `send_calendly_link` tools.
   The live LLM only has the 6 tools listed above — neither `send_email` nor
   `send_calendly_link` exists. Those instructions will be inert until the
   tools are added (out of scope for the current task's PATCH).

4. **`begin_message`.** Currently set; Task 3 sets it to `null` (the new
   prompt owns the opener). This is intentional but worth confirming.

5. **Repo structure differs from the task's assumptions.** The repo is a
   Next.js (App Router) TypeScript project, not Express. The profile injector
   was therefore implemented as `lib/profile-injector.ts` (ESM, JSON import)
   and the endpoint as a Next.js route handler at
   `app/api/profile-context/route.ts`, rather than the `lib/profile-injector.js`
   CommonJS form in the task. `/api/profile-context` was added to the
   `middleware.ts` auth bypass so n8n (no session cookie) can reach it.

6. **Branch.** This session is constrained to develop on
   `claude/modest-ramanujan-cLNXB`. The task says push to `main` (Vercel
   production). Pushing to production requires explicit owner approval.
