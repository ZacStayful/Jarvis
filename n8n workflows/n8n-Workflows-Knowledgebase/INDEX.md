# INDEX

> Single-page retrieval index. One-line summaries for every section in the dataset. Designed so Claude can scan this file once and know exactly where to deep-read next.

## Anchors-at-a-glance

### [Core-Principles.md](Core-Principles.md) — the 17 rules

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
| 17 | Strip `availableInMCP`/`binaryMode` before REST PUT | These fields are returned by GET but rejected by PUT with HTTP 400 | [#rule-17](Core-Principles.md#rule-17) |

[Summary checklist](Core-Principles.md#summary-checklist) — run this on every workflow task.

---

### [System-Patterns.md](System-Patterns.md) — reusable patterns

- [Validation → Create → Test → Publish](System-Patterns.md#validation-create-test-publish) — the canonical build sequence
- [Monday webhook challenge handling](System-Patterns.md#monday-webhook-challenge) — Webhook → IF → Code → Respond
- [Credential management & Header Auth structure](System-Patterns.md#header-auth-structure) — title vs name vs value
- [MCP access enablement](System-Patterns.md#mcp-access) — per-workflow toggle
- [Monday webhook scoping](System-Patterns.md#monday-webhook-scoping) — Integrate panel vs Automate panel
- [Two-automation pattern for multiple status triggers](System-Patterns.md#two-automation-status-webhook) — "Warm" + "Special offer applied" → same URL, filter in n8n
- [Empty array vs sentinel filter pattern](System-Patterns.md#empty-array-filter)
- [Phone number sanitization](System-Patterns.md#phone-sanitization)
- [Test pin data preparation](System-Patterns.md#test-pin-data)
- [Publishing draft vs active versions](System-Patterns.md#draft-vs-active)
- [Shell + update pattern](System-Patterns.md#shell-plus-update) — includes REST API surgical edit + fields to strip
- [Deleting test workflows](System-Patterns.md#deleting-test-workflows)
- [Referencing data between nodes](System-Patterns.md#referencing-data-between-nodes)
- [Code node modes](System-Patterns.md#code-node-modes)
- [Anthropic API pattern](System-Patterns.md#anthropic-pattern)

---

### [Services/](Services/) — one file per integration

| Service | What it covers | File |
|---|---|---|
| Monday.com | GraphQL endpoint, current API, column IDs, webhook payload shape | [Monday.com.md](Services/Monday.com.md) |
| Gmail | HTTP polling pattern, OAuth setup, search syntax | [Gmail.md](Services/Gmail.md) |
| Anthropic / Claude | API endpoint, max_tokens-as-int, JSON markdown-fence stripping, current model IDs | [Anthropic-Claude.md](Services/Anthropic-Claude.md) |
| Twilio | E.164 sanitization, regulatory bundle, UK from-number | [Twilio.md](Services/Twilio.md) |
| Retell AI | Lucy agent setup, Vercel property injection | [Retell-AI.md](Services/Retell-AI.md) |
| Calendly | Webhook payload structure, event types, no challenge handler needed | [Calendly.md](Services/Calendly.md) |
| CircleLoop | No native node — webhook-only integration | [CircleLoop.md](Services/CircleLoop.md) |
| Slack | SDK create 500s — HTTP Request or JSON-import | [Slack.md](Services/Slack.md) |
| Granola | AI meeting transcripts, 45-min check pattern, Monday column cap | [Granola.md](Services/Granola.md) |
| GitHub | File commits via Contents API, base64 encoding, two repos | [GitHub.md](Services/GitHub.md) |
| Vercel | Auto-deploy from GitHub, URL construction, Lucy property API | [Vercel.md](Services/Vercel.md) |

---

### [Quick-Recipes/](Quick-Recipes/) — full copy-pastable workflows

| Recipe | What it does | File |
|---|---|---|
| 01 | Gmail → Monday search & update | [01-Gmail-to-Monday-Search-and-Update.md](Quick-Recipes/01-Gmail-to-Monday-Search-and-Update.md) |
| 02 | Monday webhook challenge echo | [02-Monday-Webhook-Challenge-Echo.md](Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md) |
| 03 | Anthropic API call | [03-Anthropic-API-Call.md](Quick-Recipes/03-Anthropic-API-Call.md) |
| 04 | Twilio SMS | [04-Twilio-SMS.md](Quick-Recipes/04-Twilio-SMS.md) |
| 05 | Retell outbound call (Lucy) | [05-Retell-Outbound-Call.md](Quick-Recipes/05-Retell-Outbound-Call.md) |
| 06 | Calendly webhook → Monday booking update | [06-Calendly-Webhook-Booking.md](Quick-Recipes/06-Calendly-Webhook-Booking.md) |
| 07 | Web meeting processing (full pipeline) | [07-Web-Meeting-Processing.md](Quick-Recipes/07-Web-Meeting-Processing.md) |

---

### [Known-Values-Registry.md](Known-Values-Registry.md) — concrete IDs and endpoints

| Section | Anchor |
|---|---|
| Monday Management Leads board (all column IDs, group IDs, status labels) | [#monday-management-leads](Known-Values-Registry.md#monday-management-leads) |
| Anthropic API endpoint + recommended model | [#anthropic](Known-Values-Registry.md#anthropic) |
| Retell AI — Lucy agent ID | [#retell](Known-Values-Registry.md#retell) |
| Twilio — UK from-number | [#twilio](Known-Values-Registry.md#twilio) |
| Vercel — action plans URL, presentations URL, Lucy API endpoint | [#vercel](Known-Values-Registry.md#vercel) |
| GitHub — repos, file path pattern, credential | [#github](Known-Values-Registry.md#github) |
| Cloudflare — account ID, proxy worker | [#cloudflare](Known-Values-Registry.md#cloudflare) |
| n8n instance + REST API + credentials | [#n8n-instance](Known-Values-Registry.md#n8n-instance) |
| Google OAuth — client type, callback URL, credential types | [#google-oauth](Known-Values-Registry.md#google-oauth) |
| Stayful branding — colour, logo, Drive image link format | [#branding](Known-Values-Registry.md#branding) |

---

### [Troubleshooting.md](Troubleshooting.md) — by status code and symptom

| Status / Symptom | Anchor |
|---|---|
| 401 Unauthorized | [#401](Troubleshooting.md#401) |
| 403 Forbidden | [#403](Troubleshooting.md#403) |
| 400 Bad Request | [#400](Troubleshooting.md#400) |
| 404 Not Found | [#404](Troubleshooting.md#404) |
| 429 Rate Limited | [#429](Troubleshooting.md#429) |
| 500 Internal Server Error | [#500](Troubleshooting.md#500) |
| Empty 200 / no executions | [#empty-200](Troubleshooting.md#empty-200) |
| Webhook never fires | [#wont-trigger](Troubleshooting.md#wont-trigger) |
| Undefined property errors | [#undefined-property](Troubleshooting.md#undefined-property) |
| Test vs live version mismatch | [#test-vs-live](Troubleshooting.md#test-vs-live) |
| Diagnosis flowchart | [#diagnosis-flowchart](Troubleshooting.md#diagnosis-flowchart) |

---

### [CONTRIBUTING.md](CONTRIBUTING.md) — how to extend this dataset

When to add what, templates for new recipes/services/rules, anchor naming conventions, linting checklist.
