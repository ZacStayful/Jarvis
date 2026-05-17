# Troubleshooting

> Sorted by HTTP status code first, by symptom second, with a diagnosis flowchart at the bottom. Every recurring failure mode encountered while building Stayful's n8n workflows is captured here with a [Rule](Core-Principles.md) cross-reference.

---

## By HTTP status code

<a id="401"></a>
### 401 Unauthorized

| Cause | Check / Fix |
|---|---|
| Header Auth Name field is wrong | Open the credential. Name must be `Authorization` for Monday, `X-API-Key` for some others. See [System-Patterns#header-auth-structure](System-Patterns.md#header-auth-structure) ([Rule 4](Core-Principles.md#rule-4)) |
| Header Auth Value has placeholder string in it | Value should be the raw token, not `__n8n_BLANK_VALUE_<token>_<uuid>` |
| Header Auth Value is in expression mode (`fx` icon highlighted) | Toggle `fx` off, paste raw token |
| Monday token expired / revoked | Regenerate token in Monday Admin → API |
| Gmail OAuth token invalid | Re-run OAuth flow in the credential UI |
| Anthropic API key wrong / rotated | Update credential value |
| Workflow uses wrong credential ID | Run `n8n:search_workflows` for the service to find the working credential ID ([Rule 4](Core-Principles.md#rule-4)) |

**Diagnosis path:** check the credential's three fields (title/name/value) before assuming the token is bad. The token is correct 9 times out of 10; the failure is in the credential structure.

---

<a id="403"></a>
### 403 Forbidden

| Cause | Check / Fix |
|---|---|
| Insufficient Monday permissions | The token's user must have access to the board. Check the API token's owner in Monday Admin. |
| Gmail: message not accessible | The OAuth scope may be too narrow. n8n's default `googleOAuth2Api` scopes include `gmail.readonly` and `gmail.modify` — confirm in the credential. |
| Monday `create_webhook` mutation | Blocked by OAuth scope — use Monday UI Integrate panel instead ([Rule 9](Core-Principles.md#rule-9)) |

---

<a id="400"></a>
### 400 Bad Request

| Cause | Check / Fix |
|---|---|
| Anthropic `max_tokens` is a string | Must be integer expression: `"max_tokens": "={{ 200 }}"`, not `"200"` ([Services/Anthropic-Claude.md](Services/Anthropic-Claude.md)) |
| Twilio phone not E.164 | Sanitize before send: `phone.replace(/[^0-9+]/g, '')` ([Rule 14](Core-Principles.md#rule-14)) |
| Monday column value format wrong | Date columns need `JSON.stringify({ date: 'YYYY-MM-DD' })` ([Rule 11](Core-Principles.md#rule-11)) |
| Invalid JSON in HTTP Request body | Check expression escaping — `\"` for embedded quotes in JSON strings |
| Anthropic `messages` not parsed | Build via `JSON.stringify` in Code node, reference as `={{ JSON.parse($json.messagesJson) }}` ([System-Patterns#anthropic-pattern](System-Patterns.md#anthropic-pattern)) |

---

<a id="404"></a>
### 404 Not Found

| Cause | Check / Fix |
|---|---|
| Wrong board ID | Confirm against [Known-Values-Registry#monday-management-leads](Known-Values-Registry.md#monday-management-leads) (`5891626711`) |
| Endpoint URL wrong | Compare against the service file ([Services/](Services/)) — these are the canonical endpoints |
| Item ID doesn't exist | The upstream Monday search returned nothing — check [returns-empty](#returns-empty) below |
| Vercel property endpoint changed | Confirm against [Known-Values-Registry#vercel](Known-Values-Registry.md#vercel) |

---

<a id="429"></a>
### 429 Rate Limited

| Service | Limit | Strategy |
|---|---|---|
| Monday.com | ~10K calls/minute on standard plans | Batch with GraphQL aliases (multiple mutations per request) — see [Services/Monday.com.md](Services/Monday.com.md) |
| Gmail API | 250 quota units per user per second | Lower polling frequency on Schedule Trigger; 5–15 min is usually fine |
| Anthropic | Tier-dependent | Add Wait node before retry, or split prompts |
| Twilio | 1 msg/sec per from-number | Add small delay if iterating over a list |

**Backoff strategy:** add an n8n Wait node, exponential backoff `2s → 4s → 8s`. For repeated 429s on Monday specifically, consolidate mutations via GraphQL aliases.

---

<a id="500"></a>
### 500 Internal Server Error

| Cause | Check / Fix |
|---|---|
| `create_workflow_from_code` rejected a node | The node is on the broken-via-SDK list ([Rule 1](Core-Principles.md#rule-1)). Switch to HTTP Request workaround or [JSON-import fallback](Core-Principles.md#rule-1b) |
| `update_workflow` rejected the JSON | Try the [shell + update](System-Patterns.md#shell-plus-update) pattern, or use REST API surgical edit |
| Service outage | Check the service's status page. Retry after 5 min. |
| n8n internal error during execution | Check the execution log in the n8n UI — often this is a downstream parse error caught at the executor level |

---

<a id="empty-200"></a>
### Empty 200 with no executions

**This usually means n8n trial expired** ([Rule 12](Core-Principles.md#rule-12)).

Diagnosis path:
1. Open the n8n workflow UI.
2. Look for red error banners: *"Your trial has ended. Upgrade now to keep automating"*.
3. Open the Executions tab — failed runs show *"Workflow execution had an error"* with the trial banner attached.
4. **When this happens, ALL workflows are silently broken**, not just the one being debugged. Tell Zac to check anything else running.

Other causes:
- Workflow is disabled (toggle in top-right is OFF)
- Workflow webhook URL is from a draft that was never published ([draft vs active](System-Patterns.md#draft-vs-active))

---

## By symptom

<a id="wont-trigger"></a>
### Workflow won't trigger

| Cause | Check / Fix |
|---|---|
| Monday webhook registration failed | Challenge handler missing or wrong — see [Rule 8](Core-Principles.md#rule-8) and [Quick-Recipes/02](Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md) |
| Wrong webhook URL given to Monday | Confirm production URL (not test URL) is registered in Monday Integrate panel |
| Workflow disabled | Toggle ON in top-right of canvas |
| Workflow not published | Click Publish, or call `n8n:publish_workflow` — drafts don't receive production traffic |
| Trial expired | See [empty 200](#empty-200) |
| Schedule trigger interval too long | Confirm interval — minutes vs hours |

---

<a id="returns-empty"></a>
### Workflow executes but returns empty

| Cause | Check / Fix |
|---|---|
| Search returns no items | Column ID wrong (check against [Known-Values-Registry](Known-Values-Registry.md#monday-management-leads)) or value mismatch (case, whitespace, encoding) |
| Email match failing | Always `.toLowerCase()` the email before searching — Monday is case-sensitive on `text_mkygb5xx` |
| Gmail filter too strict | Test the query string at `gmail.com/mail/u/0/#search/<query>` to see results in your inbox |
| IF node FALSE branch firing | Inspect the IF node's input — wrong field path or wrong type (string vs number) |
| Filter Code node returned `[]` | This is correct ([Rule 10](Core-Principles.md#rule-10)) — downstream nodes don't execute. Add logging in the Code node to confirm input items. |

---

<a id="too-many-executions"></a>
### Executes infinitely / too many times

| Cause | Check / Fix |
|---|---|
| Monday webhook not scoped | Recipe is "any column changes" — change to scoped column ([Rule 9](Core-Principles.md#rule-9)) |
| Schedule trigger too aggressive | Bump interval to 5–15 min |
| IF condition always TRUE | Check the condition values and types |
| Loop via downstream Monday update fires the same webhook | If the webhook is on a column that the workflow updates, you've made an infinite loop. Add a guard or scope the webhook to a different column. |

---

<a id="node-red"></a>
### Node shows red / won't save

| Cause | Check / Fix |
|---|---|
| Credential not selected | After `update_workflow`, all credentials are stripped ([Rule 1c](Core-Principles.md#rule-1c)). Re-pick in the UI. |
| MCP access not enabled | Workflow settings → Available to MCP ([Rule 13](Core-Principles.md#rule-13)) |
| Expression syntax error | Hover the red field — n8n shows the parse error |
| Required field missing | Look for `*` markers in the node config |

---

<a id="test-vs-live"></a>
### Test runs pass but live doesn't

| Cause | Check / Fix |
|---|---|
| Workflow not published | Draft version was tested; active version is still the old logic ([Rule 6](Core-Principles.md#rule-6)) — call `publish_workflow` |
| Credentials changed after `update_workflow` | Strip happens on every update. Re-pick credentials, then re-publish. |
| Real trigger payload differs from pin data | Capture a real production payload from the Executions log and pin that for next test |
| URL difference between test and production webhook | Confirm Monday is hitting the production URL, not the test URL |

---

<a id="undefined-property"></a>
### "Cannot read property X of undefined"

| Cause | Check / Fix |
|---|---|
| Wrong data path | `{{ $json.x }}` references the current node's input; use `{{ $('Named Node').item.json.x }}` for upstream data |
| Node not connected | Inspect the canvas — orphan node or missing wire |
| Upstream node returned empty | The IF/filter upstream returned nothing on this branch — check its output |
| Webhook field path | POST body → `$json.body.x`, query param → `$json.query.x`, header → `$json.headers.x` (see [Core-Principles common gotcha](Core-Principles.md#common-gotcha-webhook-query-params-vs-body-fields)) |
| Monday text column wrapping | Use both fallbacks: `{{ $json.body?.event?.value?.value ?? $json.body?.event?.value?.text ?? '' }}` ([Rule 11](Core-Principles.md#rule-11)) |

---

<a id="diagnosis-flowchart"></a>
## Diagnosis flowchart

When in doubt, walk this:

```
Is the workflow firing at all?
├── No  → Is the URL Monday is hitting the published one?
│         ├── No  → Publish the workflow (Rule 6)
│         └── Yes → Is the trial banner showing? (Rule 12)
│                   ├── Yes → Upgrade plan
│                   └── No  → Is the Monday challenge handler in place? (Rule 8)
│                             ├── No  → Add it (Quick-Recipes/02)
│                             └── Yes → Re-register webhook in Monday Integrate panel
│
└── Yes → Is it failing at a specific node?
          ├── Status code visible?
          │   ├── 401 → See #401 above
          │   ├── 403 → See #403
          │   ├── 400 → See #400
          │   ├── 404 → See #404
          │   ├── 429 → Add Wait + backoff
          │   ├── 500 → Is it a broken-via-SDK node? (Rule 1)
          │   │         ├── Yes → JSON-import (Rule 1b) or HTTP workaround
          │   │         └── No  → Check service status; retry
          │   └── Empty 200 with no execution → Trial expired (Rule 12)
          │
          └── No status visible → Executes but returns empty?
                                  ├── Yes → See #returns-empty above
                                  └── No  → Executes too many times? See #too-many-executions
```

### Quick-fire diagnostic questions

When debugging, walk these in order:

1. **Is the trial expired?** ([Rule 12](Core-Principles.md#rule-12)) → check for red banner.
2. **Is the workflow published, not just saved?** ([Rule 6](Core-Principles.md#rule-6)) → re-publish.
3. **Is the credential's Name field set correctly?** ([Rule 4](Core-Principles.md#rule-4)) → not "Monday API", but "Authorization".
4. **For Monday triggers: is the challenge handler present?** ([Rule 8](Core-Principles.md#rule-8)) → Code node + Respond node.
5. **For Monday webhooks: is it scoped to a specific column?** ([Rule 9](Core-Principles.md#rule-9))
6. **For broken-via-SDK nodes: switched to HTTP / JSON-import?** ([Rules 1, 1b, 1c](Core-Principles.md#rule-1))
7. **For Twilio: phone sanitized to E.164?** ([Rule 14](Core-Principles.md#rule-14))
8. **MCP access enabled on the workflow?** ([Rule 13](Core-Principles.md#rule-13))

90% of failures are caught in this list.
