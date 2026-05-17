# INDEX

> Single-page retrieval index. One-line summaries for every section in the dataset. Designed so Claude can scan this file once and know exactly where to deep-read next.

## Anchors-at-a-glance

### [Core-Principles.md](Core-Principles.md) — the 16 rules

| # | Rule | One-line | Anchor |
|---|---|---|---|
| 1 | Never retry a failed node | Switch to HTTP Request workaround immediately on first SDK 500 | [#rule-1](Core-Principles.md#rule-1) |
| 1b | JSON-import fallback | When native nodes are needed, write JSON and import via UI drag/paste | [#rule-1b](Core-Principles.md#rule-1b) |
| 1c | Shell + update workaround | Create a minimal shell then `update_workflow` with full code | [#rule-1c](Core-Principles.md#rule-1c) |
| 2 | Validate before creating | Always run `validate_workflow` first | [#rule-2](Core-Principles.md#rule-2) |
| 3 | Map all nodes first | Produce node map with working-equivalent for every step before coding | [#rule-3](Core-Principles.md#rule-3) |
| 4 | Existing workflows = credential source of truth | Use `search_workflows` to find credential names | [#rule-4](Core-Principles.md#rule-4) |
| 5 | Use known values confidently | All board/column/agent IDs in [Known-Values-Registry.md](Known-Values-Registry.md) | [#rule-5](Core-Principles.md#rule-5) |
| 6 | Test with pin data before publishing | Validate → Create → Test → Publish, never skip | [#rule-6](Core-Principles.md#rule-6) |
| 7 | Delete test workflows immediately | Anything named "test" or "bisect" must be deleted right after the answer is extracted | [#rule-7](Core-Principles.md#rule-7) |
| 8 | Handle Monday webhook challenge | Echo `body.challenge` back via Code + Respond node | [#rule-8](Core-Principles.md#rule-8) |
| 9 | Scope Monday webhooks to columns | Never use "any column changes" recipes | [#rule-9](Core-Principles.md#rule-9) |
| 10 | Empty arrays, not sentinels | Filter Code nodes return `[]` for no candidates | [#rule-10](Core-Principles.md#rule-10) |
| 11 | Current Monday GraphQL | `items_page_by_column_values`, not deprecated `items_by_column_values` | [#rule-11](Core-Principles.md#rule-11) |
| 12 | Empty 200 = trial expired | Diagnose silent failures by checking n8n trial status | [#rule-12](Core-Principles.md#rule-12) |
| 13 | Enable MCP access per workflow | Workflow settings → Available to MCP, per workflow | [#rule-13](Core-Principles.md#rule-13) |
| 14 | Sanitize phone numbers | Strip non-`[0-9+]` before Twilio | [#rule-14](Core-Principles.md#rule-14) |
| 15 | String concat in expressions | n8n SDK's `expr()` does not parse template literals | [#rule-15](Core-Principles.md#rule-15) |
| 16 | Separate workflows per trigger | Don't merge webhook + schedule into one canvas | [#rule-16](Core-Principles.md#rule-16) |

[Summary checklist](Core-Principles.md#summary-checklist) — run this on every workflow task.

---

### [System-Patterns.md](System-Patterns.md) — reusable patterns

- [Validation → Create → Test → Publish](System-Patterns.md#validation-create-test-publish) — the canonical build sequence
- [Monday webhook challenge handling](System-Patterns.md#monday-webhook-challenge) — Webhook → IF → Code → Respond
- [Credential management & Header Auth structure](System-Patterns.md#header-auth-structure) — title vs name vs value
- [MCP access enablement](System-Patterns.md#mcp-access) — per-workflow toggle
- [Monday webhook scoping](System-Patterns.md#monday-webhook-scoping) — Integrate panel vs Automate panel
- [Empty array vs sentinel filter pattern](System-Patterns.md#empty-array-filter)
- [Phone number sanitization](System-Patterns.md#phone-sanitization)
- [Test pin data preparation](System-Patterns.md#test-pin-data)
- [Publishing draft vs active versions](System-Patterns.md#draft-vs-active)
- [Deleting test workflows](System-Patterns.md#deleting-test-workflows)

---

### [Services/](Services/) — one file per integration

| Service | What it covers | File |
|---|---|---|
| Monday.com | GraphQL endpoint, current API, column IDs, webhook payload shape | [Monday.com.md](Services/Monday.com.md) |
| Gmail | HTTP polling pattern, OAuth setup, search syntax | [Gmail.md](Services/Gmail.md) |
| Anthropic / Claude | API endpoint, max_tokens-as-int, JSON markdown-fence stripping | [Anthropic-Claude.md](Services/Anthropic-Claude.md) |
| Twilio | E.164 sanitization, regulatory bundle, UK from-number | [Twilio.md](Services/Twilio.md) |
| Retell AI | Lucy agent setup, Vercel property injection | [Retell-AI.md](Services/Retell-AI.md) |
| Calendly | Webhook payload structure, event types | [Calendly.md](Services/Calendly.md) |
| CircleLoop | No native node — webhook-only | [CircleLoop.md](Services/CircleLoop.md) |
| Slack | SDK creation fails — HTTP workaround | [Slack.md](Services/Slack.md) |

---

### [Quick-Recipes/](Quick-Recipes/) — end-to-end working patterns

| # | Recipe | What it does |
|---|---|---|
| 01 | [Gmail → Monday search & update](Quick-Recipes/01-Gmail-to-Monday-Search-and-Update.md) | Poll Gmail, find sender, update Monday row |
| 02 | [Monday webhook challenge echo](Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md) | The mandatory start of every Monday-triggered workflow |
| 03 | [Anthropic API call](Quick-Recipes/03-Anthropic-API-Call.md) | Call Claude inside a workflow, with JSON parsing |
| 04 | [Twilio SMS](Quick-Recipes/04-Twilio-SMS.md) | Send SMS from a workflow with phone sanitization |
| 05 | [Retell outbound call](Quick-Recipes/05-Retell-Outbound-Call.md) | Trigger Lucy to call a lead with property context |
| 06 | [Calendly webhook booking](Quick-Recipes/06-Calendly-Webhook-Booking.md) | Capture booking, update Monday |

---

### [Known-Values-Registry.md](Known-Values-Registry.md) — concrete values

- [Monday.com Management Leads board](Known-Values-Registry.md#monday-management-leads) — board ID, all column IDs, group IDs, status label IDs
- [Anthropic API](Known-Values-Registry.md#anthropic) — endpoint, version header, models
- [Retell AI](Known-Values-Registry.md#retell) — Lucy agent ID, endpoint
- [Twilio](Known-Values-Registry.md#twilio) — UK from-number, endpoint
- [Vercel](Known-Values-Registry.md#vercel) — property API endpoint
- [GitHub](Known-Values-Registry.md#github) — repo, auth account
- [Cloudflare](Known-Values-Registry.md#cloudflare) — account ID, worker, KV namespace
- [Google OAuth](Known-Values-Registry.md#google-oauth) — client ID, callback URL, project
- [n8n credentials](Known-Values-Registry.md#n8n-credentials) — Header Auth account 4 / 6, lookup pattern

---

### [Troubleshooting.md](Troubleshooting.md) — when things break

By HTTP status:
- [401 Unauthorized](Troubleshooting.md#401)
- [403 Forbidden](Troubleshooting.md#403)
- [400 Bad Request](Troubleshooting.md#400)
- [404 Not Found](Troubleshooting.md#404)
- [429 Rate Limited](Troubleshooting.md#429)
- [500 Internal Server Error](Troubleshooting.md#500)
- [Empty 200 with no executions](Troubleshooting.md#empty-200)

By symptom:
- [Workflow won't trigger](Troubleshooting.md#wont-trigger)
- [Executes but returns empty](Troubleshooting.md#returns-empty)
- [Executes too many times](Troubleshooting.md#too-many-executions)
- [Node shows red / won't save](Troubleshooting.md#node-red)
- [Test passes but live doesn't](Troubleshooting.md#test-vs-live)
- ["Cannot read property X of undefined"](Troubleshooting.md#undefined-property)

[Diagnosis flowchart](Troubleshooting.md#diagnosis-flowchart) — start here when in doubt.

---

## Rule → demonstration map

For each rule, here is where it shows up in practice:

| Rule | Demonstrated in |
|---|---|
| [1](Core-Principles.md#rule-1) | [Services/Monday.com](Services/Monday.com.md), [Services/Gmail](Services/Gmail.md), [Services/Twilio](Services/Twilio.md), [Services/Slack](Services/Slack.md) |
| [1b](Core-Principles.md#rule-1b) | [Services/Twilio](Services/Twilio.md), [Services/Slack](Services/Slack.md) |
| [1c](Core-Principles.md#rule-1c) | [System-Patterns](System-Patterns.md#shell-plus-update) |
| [4](Core-Principles.md#rule-4) | [Known-Values-Registry#n8n-credentials](Known-Values-Registry.md#n8n-credentials), [System-Patterns#header-auth](System-Patterns.md#header-auth-structure) |
| [6](Core-Principles.md#rule-6) | every [Quick-Recipe](Quick-Recipes/) |
| [8](Core-Principles.md#rule-8) | [Quick-Recipes/02](Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md), [Services/Monday.com](Services/Monday.com.md) |
| [11](Core-Principles.md#rule-11) | [Quick-Recipes/01](Quick-Recipes/01-Gmail-to-Monday-Search-and-Update.md), [Services/Monday.com](Services/Monday.com.md) |
| [14](Core-Principles.md#rule-14) | [Quick-Recipes/04](Quick-Recipes/04-Twilio-SMS.md), [Services/Twilio](Services/Twilio.md) |
| [15](Core-Principles.md#rule-15) | [Services/Anthropic-Claude](Services/Anthropic-Claude.md) |
