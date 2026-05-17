# Core Principles

> The 17 rules that govern every n8n workflow build. Non-negotiable — derived from real trial-and-error. Cite the rule number whenever a decision references one (e.g. "Rule 8 says echo the challenge").
>
> See also: [System-Patterns.md](System-Patterns.md), [Troubleshooting.md](Troubleshooting.md), [INDEX.md](INDEX.md).

---

<a id="rule-1"></a>
## Rule 1 — Never retry a failed node, switch to the workaround immediately

If a node fails to create or produces errors via MCP, do not attempt it again in any variation. Treat it as permanently incompatible and switch to the HTTP Request workaround.

**Known incompatible nodes via the MCP SDK endpoint** — these all return raw HTTP 500 errors (not silent failures) on `create_workflow_from_code` and `update_workflow`:

| Broken node | Replacement |
|---|---|
| `n8n-nodes-base.gmailTrigger` | Schedule Trigger + Gmail API via HTTP Request — see [Services/Gmail.md](Services/Gmail.md) |
| `n8n-nodes-base.gmail` (send) | HTTP Request to Gmail API, or [Rule 1b](#rule-1b) JSON-import |
| `n8n-nodes-base.mondayCom` | HTTP Request + Monday GraphQL — see [Services/Monday.com.md](Services/Monday.com.md) |
| `n8n-nodes-base.twilio` | HTTP Request to Twilio API, or [Rule 1b](#rule-1b) JSON-import |
| `n8n-nodes-base.slack` | HTTP Request to Slack API, or [Rule 1b](#rule-1b) JSON-import |

**Key clarification:** these nodes work fine inside n8n once present in a workflow. The bug is specifically in the SDK creation/update endpoints — they reject the node JSON. Native nodes that arrived via JSON import or UI add work normally at runtime.

Do not waste attempts experimenting with broken nodes via the SDK.

---

<a id="rule-1b"></a>
## Rule 1b — JSON-import fallback when the SDK endpoint 500s

When the user genuinely needs Gmail/Twilio/Slack/Monday native nodes (richer UX, or rebuilding via HTTP would be a major lift):

1. Compose the workflow JSON manually, matching n8n's export format. Use an existing working workflow as the template.
2. Save the JSON file to the user's `~/Downloads` folder via the Write tool with the absolute path `/Users/<user>/Downloads/<workflow-name>.json`.
3. Tell the user to either drag the file onto a blank n8n canvas, OR open in TextEdit → ⌘A → ⌘C → click blank canvas → ⌘V.
4. Walk them through credential picking on each credentialed node.
5. ⌘S → Publish.

This path uses a different parser than the SDK and accepts all node types including the broken-via-SDK ones.

---

<a id="rule-1c"></a>
## Rule 1c — The "shell + update" workaround

If you need an API-only flow but the workflow includes broken-via-SDK nodes, sometimes `update_workflow` succeeds where `create_workflow_from_code` 500s. Pattern:

1. Create a minimal shell via `create_workflow_from_code` (just a manual trigger + a Set node — known compatible).
2. Call `update_workflow` on the shell's ID with the full SDK code.
3. Call `publish_workflow` to make the draft active.

> **Footgun:** `update_workflow` strips credentials from credentialed nodes, even when credentials are referenced in the SDK code. The user must re-pick credentials manually after each update. The `newCredential('Name')` SDK function does NOT lookup existing credentials by name — it CREATES a new blank credential with that name. Don't promise the user a one-shot API solution if credentials are involved.

---

<a id="rule-2"></a>
## Rule 2 — Always validate before creating

Before every single `create_workflow_from_code` call, run `validate_workflow` on the SDK code first. No exceptions. A failed creation wastes time and leaves broken workflows in the instance. If validation fails, fix the code and re-validate before attempting creation.

See the full sequence in [System-Patterns#validation-create-test-publish](System-Patterns.md#validation-create-test-publish).

---

<a id="rule-3"></a>
## Rule 3 — Map all nodes to working equivalents first

Before writing a single line of SDK code, produce a node map that shows every step of the workflow and confirms each step has a working node equivalent. Only proceed to code once every step is accounted for with a compatible node.

**Example node map:**

```
Step 1: Gmail trigger → Schedule Trigger + HTTP Request (Gmail API) ✅
Step 2: Filter by sender → IF node ✅
Step 3: Search Monday.com → HTTP Request (GraphQL) ✅
Step 4: Update Monday.com → HTTP Request (GraphQL) ✅
Step 5: Send SMS → HTTP Request (Twilio API) ✅ (or JSON import — Rule 1b)
```

If any step ends with ❌, stop. Find the workaround in [Services/](Services/) before continuing.

---

<a id="rule-4"></a>
## Rule 4 — Use existing working workflows as the source of truth for credentials

Never guess a credential name or structure. Before referencing any credential, call `n8n:search_workflows` to find an existing workflow that uses the same service, then copy the credential reference shape exactly.

**Header Auth credential structure** — three separate fields, commonly confused. Full discussion in [System-Patterns#header-auth-structure](System-Patterns.md#header-auth-structure).

| Field | Example for Monday | Notes |
|---|---|---|
| Credential title | `Monday API` | Display name, can contain spaces |
| Name | `Authorization` | The literal HTTP header name. **No spaces.** |
| Value | `eyJhbG…` | The actual token |

Common failure modes:
- User types credential's *purpose* (`Monday API`) into the **Name** field → "Header name must be a valid HTTP token" (Node.js rejects).
- User pastes token without clearing the placeholder `__n8n_BLANK_VALUE_<uuid>` → broken auth.
- Value field is in expression mode (small `fx` icon highlighted) → text is evaluated as JS, not stored as literal string. Toggle `fx` off before pasting.

When debugging a 401 from a Header Auth–protected service, check all three before assuming the token itself is bad. See [Troubleshooting#401](Troubleshooting.md#401).

---

<a id="rule-5"></a>
## Rule 5 — Use known values confidently — only ask when genuinely unknown

All concrete IDs (board, columns, status labels, groups, agent IDs, from-numbers, endpoints) are in [Known-Values-Registry.md](Known-Values-Registry.md). **Do not ask Zac to confirm any value that is in the registry.**

Quick pointers (full list in the registry):

- Monday Management Leads board: `5891626711`
- Monday GraphQL endpoint: `https://api.monday.com/v2`, header `API-Version: 2024-10`
- Anthropic endpoint: `https://api.anthropic.com/v1/messages`, header `anthropic-version: 2023-06-01`
- Lucy (Retell) agent: `agent_82f187b32e8f5e7913da1c506f`
- Twilio UK from-number: `+447426947296`
- Action plans Vercel URL: `https://action-plans-theta.vercel.app`
- GitHub action plans repo: `ZacStayful/web-meeting-action-plans`
- Stayful brand colour: `#5d8156`

Only ask the user for information that is genuinely not in the registry and cannot be looked up via an existing workflow ([Rule 4](#rule-4)).

---

<a id="rule-6"></a>
## Rule 6 — Always test with pin data before publishing

The sequence for every workflow is fixed and must not be skipped:

1. `validate_workflow` — before creating ([Rule 2](#rule-2))
2. `create_workflow_from_code` — once validated
3. `get_workflow_details` — confirm structure
4. `prepare_test_pin_data` — set up mock input
5. `test_workflow` — confirm logic works
6. `publish_workflow` — only after a successful test

Never publish a workflow that has not been tested. Never skip steps.

### Critical: active vs draft versions on n8n Cloud

Saving a workflow change writes to a **draft** version. Webhooks at the production URL only execute the **active** (published) version. After every meaningful change — credential pick, condition edit, code update — the workflow must be re-published or production traffic continues running the old logic. The `n8n:publish_workflow` call (or the user clicking Publish in the UI) creates a new `activeVersionId` from the current draft.

If a fix "isn't sticking" and the executions still show old behaviour, the most likely cause is the draft was never published. See [Troubleshooting#test-vs-live](Troubleshooting.md#test-vs-live).

---

<a id="rule-7"></a>
## Rule 7 — Delete test workflows immediately

Any workflow created to test a node, validate an approach, or explore a pattern must be deleted the moment Claude has the answer it needed — not at the end of the task, **right then**.

A test workflow is any workflow that:
- Has "test" or "bisect" in its name
- Was created to answer a question rather than fulfil the actual user request
- Was created to explore whether a node or pattern works

Sequence: create test → extract answer → delete (archive) immediately → continue with real workflow.

Do not leave orphaned test workflows in the n8n instance.

---

<a id="rule-8"></a>
## Rule 8 — Always handle the Monday webhook challenge

When a webhook URL is registered in Monday.com, Monday immediately sends a POST containing `{"challenge": "..."}` to verify the endpoint is reachable. If the workflow does not echo this back, Monday silently rejects the URL and the workflow will never fire.

Every Monday-triggered workflow MUST start with:

```
[Webhook Trigger]
 → [IF node: check {{ $json.body.challenge }} exists]
 → TRUE: [Code node: return { challenge: $input.item.json.body.challenge }]
 → [Respond to Webhook node, respondWith: 'firstIncomingItem']
 → FALSE: [real workflow logic starts here]
```

- Use `n8n-nodes-base.respondToWebhook` for the echo — confirmed working via MCP.
- The Webhook trigger must be configured with `responseMode: 'responseNode'`.
- Monday expects HTTP 200 with body `{"challenge":"<value Monday sent>"}`.
- **Use a Code node, not a Set node.** Set node expressions are not reliably evaluated for the challenge echo — confirmed during debugging.

Skipping this means webhook registration fails with *"The provided URL has not returned the requested challenge"* and the workflow will never trigger.

Full recipe: [Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md](Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md).

---

<a id="rule-9"></a>
## Rule 9 — Scope Monday webhooks to specific columns

Monday's webhook integration recipes come in two flavours. Always pick the scoped version:

| | Pattern | Behaviour |
|---|---|---|
| ❌ | "When ANY column changes, send a webhook" | Fires on every column edit, every item, hundreds of times per day on busy boards |
| ✅ | "When a specific column changes, send a webhook" | Fires only when the target column changes |

The unscoped version generates noisy executions that all route to skip-paths. The scoped version eliminates the noise entirely.

**Also:** Monday's `create_webhook` GraphQL mutation is blocked by OAuth scope. Webhooks must be created via the Monday.com UI **Integrate** panel (not Automate panel). See [Services/Monday.com.md](Services/Monday.com.md).

---

<a id="rule-10"></a>
## Rule 10 — Use empty arrays, not sentinels, in filter Code nodes

When a Code node filters candidates from a fetch, return an empty array when there are no candidates — not a sentinel object like `{ skipped: true }`. Downstream nodes will simply not execute when given empty input.

```js
// ✅ Good — clean and unambiguous
return results.map(r => ({ json: r }));

// ❌ Bad — forces an IF node downstream and creates type-validation issues
if (results.length === 0) {
  return [{ json: { skipped: true, reason: '...' } }];
}
```

This eliminates the need for an "is there a candidate?" IF node and avoids n8n's flaky boolean type-validation behaviour with `undefined` properties. Loose validation does NOT reliably convert `undefined` to `false`, even with "Convert types where required" enabled.

If you DO need an IF gate, check a string field that's always present on candidate items (e.g. `{{ $json.monday_item_id }}` is not empty, with type set to string). Never check a boolean field that's only set on one of the two paths.

---

<a id="rule-11"></a>
## Rule 11 — Monday GraphQL: use current API methods

Monday.com's GraphQL API is versioned. Always use the current paginated methods.

**Search by column value (current):**

```graphql
{
  items_page_by_column_values(
    board_id: 5891626711,
    columns: [{column_id: "status5", column_values: ["Qualified lead"]}],
    limit: 500
  ) {
    items {
      id
      name
      column_values { id text }
    }
  }
}
```

The older `items_by_column_values` still works but is deprecated. Use `items_page_by_column_values` for new workflows.

**Update column value:**

```graphql
mutation {
  change_multiple_column_values(
    board_id: 5891626711,
    item_id: ITEM_ID,
    column_values: "{\"status5\": {\"label\": \"Web meeting booked\"}}"
  ) { id }
}
```

**Add update/comment:**

```graphql
mutation {
  create_update(item_id: ITEM_ID, body: "YOUR COMMENT") { id }
}
```

**Date column value format** — always JSON-stringify:

```js
JSON.stringify({ date: "2026-04-24", time: "22:46:00" })
```

**Webhook event payload — text columns:** Monday wraps text-column values in a nested object. Always use both fallbacks:

```
{{ $json.body?.event?.value?.value ?? $json.body?.event?.value?.text ?? '' }}
```

**Multiple mutations** can be combined with GraphQL aliases to reduce round trips. See [Services/Monday.com.md](Services/Monday.com.md).

---

<a id="rule-12"></a>
## Rule 12 — Empty 200 response = n8n trial expired

If a webhook endpoint returns HTTP 200 with an empty body AND no execution shows up in the executions list (or executions error immediately at the trigger node), the most likely cause is n8n Cloud trial expiration. The webhook accepts the request but n8n refuses to run the workflow.

**Diagnosis path:**
1. Open the n8n workflow in the UI.
2. Look for red error banners saying *"Your trial has ended. Upgrade now to keep automating"*.
3. Open the Executions tab — failed runs will show *"Workflow execution had an error"* with the trial banner attached.

**Resolution:** user upgrades to a paid plan. After upgrading, all previously-frozen workflows resume normal operation.

When this happens, ALL the user's n8n workflows are silently broken, not just the one being debugged. Flag it explicitly so Zac knows to check anything else running.

---

<a id="rule-13"></a>
## Rule 13 — Enable MCP access on each workflow

`n8n:get_workflow_details` and `n8n:get_execution` return *"Workflow is not available in MCP"* until the user has toggled **Workflow settings → Available to MCP** ON for that specific workflow. This is a **per-workflow** setting, not a global one.

Always include "enable MCP access on the workflow settings" in the post-import / post-creation checklist for the user. Without it, debugging via MCP tools is impossible.

---

<a id="rule-14"></a>
## Rule 14 — Sanitize phone numbers before Twilio

Twilio strictly requires E.164 format (`+447XXXXXXXXX`). Monday's phone columns sometimes contain spaces, leading zeros, or country-code variations. Always sanitize before sending:

```js
const phoneRaw = cols['phone_mm1hp0a8'] || '';
const phone = phoneRaw.replace(/[^0-9+]/g, '');
```

For UK numbers specifically, the user must have a Twilio number with an approved Ofcom regulatory bundle (passport + UK proof of address, 1–3 business days for approval). If a UK Twilio send fails with error `21649` or similar, the bundle isn't approved yet — that's a Twilio account issue, not a workflow issue. See [Services/Twilio.md](Services/Twilio.md).

---

<a id="rule-15"></a>
## Rule 15 — Use string concatenation, not template literals, in expressions

The n8n SDK's `expr()` function does not parse JavaScript template literals (backticks). For multi-line or interpolated strings inside expressions, use string concatenation:

```js
// ✅ Correct
expr('{{ "Hi " + $json.first_name + ", here is your link: " + $json.url }}')

// ❌ Wrong — backticks are not parsed
expr(`{{ \`Hi ${$json.first_name}\` }}`)
```

Use single or double quotes around the outer string. When embedding HTML attributes that contain quotes, escape carefully:

```js
expr('{{ "<a href=\\"" + $json.url + "\\">" + $json.url + "</a>" }}')
```

> **Note:** Inside Code nodes (`jsCode` string), template literals are FINE on n8n Cloud. This rule applies specifically to `expr()` strings in the SDK.

---

<a id="rule-16"></a>
## Rule 16 — Multiple triggers: default to separate workflows

n8n supports multiple triggers in a single workflow. They run as independent flows that share the canvas. **Default to separate workflows for different trigger types** (webhook + schedule, schedule + manual, etc.) unless the flows genuinely share state.

Reasoning:
- Different trigger types have different failure modes — separate workflows means clean execution logs per concern.
- Independent toggling — pause follow-ups without breaking initial sends.
- Lower blast radius when editing — don't risk breaking a working flow while tweaking another.
- Canvas readability — 14 nodes ≪ 22 nodes for visual parsing.

Only merge when one flow genuinely depends on another's mid-execution state.

---

<a id="rule-17"></a>
## Rule 17 — Strip `availableInMCP` and `binaryMode` before REST API PUT

The n8n REST API `PUT /api/v1/workflows/{id}` endpoint rejects requests that include `availableInMCP` or `binaryMode` fields with **HTTP 400**. These fields are returned by `GET /api/v1/workflows/{id}` but cannot be sent back.

**Pattern for surgical workflow edits via REST API:**

```
GET https://stayful.app.n8n.cloud/api/v1/workflows/{id}
  → Auth: X-N8N-API-KEY header
  → Mutate the target node or setting in the JSON
  → Strip availableInMCP and binaryMode from the settings object
  → PUT https://stayful.app.n8n.cloud/api/v1/workflows/{id}
  → n8n:publish_workflow(id)
```

**Allowed `settings` fields for PUT:**

```
executionOrder, saveManualExecutions, callerPolicy, errorWorkflow, timezone,
saveDataSuccessExecution, saveDataErrorExecution, saveExecutionProgress,
executionTimeout, maxExecutionTimeout
```

**Why use REST API instead of `update_workflow`:** `update_workflow` (the MCP SDK method) strips credential assignments from all credentialed nodes. The REST API `PUT` does not strip credentials if the node JSON already contains them. Use REST API surgical edits when credentials are involved and you only need to change a single property.

See [System-Patterns#shell-plus-update](System-Patterns.md#shell-plus-update) for the full pattern.

---

## Common gotcha — Webhook query params vs body fields

When a Webhook trigger receives data, the access path depends on how data was sent:

| Source | Path |
|---|---|
| POST body fields | `{{ $json.body.fieldName }}` |
| URL query parameters | `{{ $json.query.fieldName }}` |
| Headers | `{{ $json.headers.fieldName }}` |

A webhook receiving `?event=slide&itemId=123` exposes `$json.query.event` and `$json.query.itemId` — NOT `$json.event`. Using the wrong path returns `undefined` silently.

---

<a id="summary-checklist"></a>
## Summary checklist — run through this on every workflow task

- [ ] Mapped every step to a compatible node before writing code ([Rule 3](#rule-3))
- [ ] Used `search_workflows` to confirm credential names if unsure ([Rule 4](#rule-4))
- [ ] Used known board / column / status / agent IDs without asking ([Rule 5](#rule-5))
- [ ] Ran `validate_workflow` before `create_workflow_from_code` ([Rule 2](#rule-2))
- [ ] If 500s on Gmail/Twilio/Monday native nodes, switched to JSON-import or shell+update ([Rules 1, 1b, 1c](#rule-1))
- [ ] Added Monday webhook challenge handling if trigger is a Monday webhook ([Rule 8](#rule-8))
- [ ] Scoped Monday webhook to a specific column ([Rule 9](#rule-9))
- [ ] Filter Code nodes return empty arrays, not skip-sentinels ([Rule 10](#rule-10))
- [ ] Used current Monday GraphQL methods + correct date format ([Rule 11](#rule-11))
- [ ] Sanitized phone numbers before Twilio ([Rule 14](#rule-14))
- [ ] Used string concatenation in `expr()`, not template literals ([Rule 15](#rule-15))
- [ ] Reminded user to enable MCP access on the workflow ([Rule 13](#rule-13))
- [ ] Reminded user to PUBLISH after every change so the active version updates ([Rule 6](#rule-6))
- [ ] If webhook returns empty 200 + no executions, suspect n8n trial expiration ([Rule 12](#rule-12))
- [ ] Default to separate workflows for distinct trigger types ([Rule 16](#rule-16))
- [ ] If using REST API PUT, stripped `availableInMCP` and `binaryMode` from settings ([Rule 17](#rule-17))
- [ ] Deleted any test/bisect workflows created along the way ([Rule 7](#rule-7))
- [ ] Tested with pin data before publishing ([Rule 6](#rule-6))
- [ ] Published only after a clean test run ([Rule 6](#rule-6))
