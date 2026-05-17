# System Patterns

> Reusable structural patterns used across multiple workflows. Each pattern is anchored so [Core-Principles.md](Core-Principles.md), [Quick-Recipes/](Quick-Recipes/), and [Services/](Services/) can link directly to the canonical version.

---

<a id="validation-create-test-publish"></a>
## Validation → Create → Test → Publish ([Rule 6](Core-Principles.md#rule-6))

The canonical build sequence. Skipping a step is the most common cause of "I thought I fixed it but it's still broken in production".

```
┌────────────────────────────────────────────────────────────┐
│ 1. validate_workflow (Rule 2 — catches structural)         │
│ 2. create_workflow_from_code (only after validation passes)│
│ 3. get_workflow_details (confirm structure exists)         │
│ 4. prepare_test_pin_data (mock input)                      │
│ 5. test_workflow (executes without real API hit)           │
│ 6. publish_workflow (promotes draft → active)              │
└────────────────────────────────────────────────────────────┘
```

After **every** change (credential pick, condition edit, code update) re-publish or production traffic continues running the old logic. See [#draft-vs-active](#draft-vs-active).

For SDK code surgical edits, prefer GET → mutate → PUT via REST API over `n8n:update_workflow` when credentials are involved — `update_workflow` strips credential assignments. See [#shell-plus-update](#shell-plus-update).

---

<a id="monday-webhook-challenge"></a>
## Monday webhook challenge handling ([Rule 8](Core-Principles.md#rule-8))

When Monday registers a webhook URL, it POSTs `{"challenge": "..."}` once for verification. The workflow must echo it back or Monday silently rejects the URL.

### Workflow trigger configuration

- Node: `n8n-nodes-base.webhook`
- `httpMethod: 'POST'`
- `responseMode: 'responseNode'` ← **required** so the Respond node can return the body

### Challenge echo structure

```
[Webhook]
 │
 ▼
[IF: {{ $json.body.challenge }} is not empty]
 ├── TRUE → [Code: return { challenge: $input.item.json.body.challenge }]
 │         ▼
 │         [Respond to Webhook: respondWith='firstIncomingItem']
 │
 └── FALSE → [real workflow starts here]
```

### Code node body (exact)

```js
return { challenge: $input.item.json.body.challenge };
```

### Why a Set node does not work

Set node expressions are not reliably evaluated for this specific challenge echo — Monday receives a response but the body doesn't contain the literal challenge value. A Code node returning a plain object resolves it. Confirmed via multiple debugging sessions.

### Why it fails silently if missing

Monday returns no error to the workflow — it simply does not register the webhook and the URL never fires. Users see "no executions" even though the URL is technically reachable. If you see this pattern, the challenge handler is the first thing to check.

Full recipe: [Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md](Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md).

---

<a id="header-auth-structure"></a>
## Credential management & Header Auth structure ([Rule 4](Core-Principles.md#rule-4))

The single most common cause of 401s on a service the user "knows the token is correct for".

### The three fields

| Field on credential page | What it is | Example for Monday |
|---|---|---|
| **Title** (top of page) | Display name in node dropdowns | `Monday API` |
| **Name** | The literal HTTP header name | `Authorization` |
| **Value** | The token / secret | `eyJhbGciOiJIUzI1Ni…` |

### Failure modes

1. **Name field has the credential's purpose, not the header name.**
   - User typed `Monday API` into the Name field. n8n then sends an HTTP header literally named `Monday API`. Node.js HTTP library rejects with *"Header name must be a valid HTTP token"*.
   - Fix: Name must be `Authorization` for Monday, `X-API-Key` for some others, etc.

2. **Token pasted without clearing the placeholder.**
   - n8n shows `__n8n_BLANK_VALUE_<uuid>` as a placeholder.
   - If user pastes their token in the middle of that string instead of replacing it entirely, the Value becomes `__n8n_BLANK_VALUE_<token>_<uuid>` — broken auth.
   - Fix: ⌘A inside the Value field before pasting.

3. **Value field is in expression mode.**
   - Small `fx` icon highlighted on the left of the field. In expression mode, pasted text is evaluated as JavaScript rather than stored as a literal string.
   - Fix: Toggle the `fx` icon OFF before pasting tokens.

### Credential name lookup (Rule 4)

Before referencing a credential in SDK code, find an existing workflow that uses the same service:

```
n8n:search_workflows({ query: "monday" })
```

Then examine how the credential is referenced there. Use that exact pattern. Do NOT call `newCredential('Name')` — that CREATES a new blank credential, it does not look up an existing one.

### Known credential IDs (Stayful instance)

See [Known-Values-Registry.md#n8n-credentials](Known-Values-Registry.md#n8n-credentials).

- **Header Auth account 4** — Monday API Key (`Authorization` header, no Bearer prefix)
- **Header Auth account 6** — GitHub PAT (Bearer token for `ZacStayful/stayful-presentations` and `ZacStayful/web-meeting-action-plans`)

---

<a id="mcp-access"></a>
## MCP access enablement ([Rule 13](Core-Principles.md#rule-13))

`n8n:get_workflow_details` and `n8n:get_execution` return *"Workflow is not available in MCP"* until **Workflow settings → Available to MCP** is toggled ON for that specific workflow.

This is **per-workflow**, not global. Every new workflow needs this toggled, or debugging via MCP tools is impossible.

Always include in the post-creation handover checklist:
- [ ] Enable MCP access in workflow settings
- [ ] Re-pick credentials (if `update_workflow` was used — Rule 1c)
- [ ] Publish to promote draft → active

---

<a id="monday-webhook-scoping"></a>
## Monday webhook scoping ([Rule 9](Core-Principles.md#rule-9))

Webhooks for the Management Leads board should be created via the Monday **Integrate** panel (not Automate panel). The `create_webhook` GraphQL mutation is blocked by OAuth scope on the current credential.

Always pick the **specific column** recipe, not the "any column" recipe:

| ❌ Avoid | ✅ Use |
|---|---|
| "When ANY column changes, send a webhook" | "When a specific column changes, send a webhook" |

The unscoped recipe fires on every column edit on every item — hundreds of times per day on busy boards. All those executions go to skip-paths but the trigger noise alone causes problems (rate limits, log clutter, billing).

Also note: the **"When update is created"** webhook automation does NOT support conditions on the Monday side. Status filtering must happen inside n8n.

---

<a id="two-automation-status-webhook"></a>
## Two-automation pattern for multiple status triggers

When a workflow needs to fire on **two or more different status values** (e.g. "Warm" OR "Special offer applied"), Monday cannot filter by status on the automation side. The correct pattern:

1. Create **two separate Monday automations** in the Integrate panel, each scoped to `status5`.
   - Automation A: triggers when status changes to "Warm"
   - Automation B: triggers when status changes to "Special offer applied"
2. **Both automations point to the same n8n webhook URL.**
3. Inside n8n, an IF node reads `$json.body.event.value.label.text` and routes based on the actual status value.

```
[Webhook]
    ↓ (challenge handler per Rule 8)
    ↓
[IF: status = "Warm"]
    → TRUE  → [Warm path logic]
    → FALSE → [IF: status = "Special offer applied"]
                → TRUE  → [Special offer path logic]
                → FALSE → [stop — unexpected status, ignore]
```

**Why not one automation with a condition?** Monday's "when a specific column changes" webhook automation fires on ANY value change to that column — it does not support filtering to specific label values. You cannot configure Monday to only fire the webhook when the value is "Warm". The filtering must happen in n8n.

**Why not use the "any column changes" recipe?** That fires hundreds of times per day ([Rule 9](Core-Principles.md#rule-9)).

**Practical implication:** If you add a third status trigger later, create a third Monday automation pointing to the same URL and add another IF branch in n8n.

---

<a id="empty-array-filter"></a>
## Empty array vs sentinel filter pattern ([Rule 10](Core-Principles.md#rule-10))

```js
// ✅ Good — return empty array when nothing matches
return results.map(r => ({ json: r }));

// ❌ Bad — sentinel forces a downstream IF node
if (results.length === 0) {
  return [{ json: { skipped: true, reason: 'no candidates' } }];
}
```

Downstream nodes simply don't execute when given empty input. This avoids n8n's flaky boolean type-validation behaviour with `undefined` properties.

If a downstream IF gate is genuinely needed, check a string field that's always present on candidate items (e.g. `{{ $json.monday_item_id }}` is not empty, type set to string). Never check a boolean field that's only set on one path.

---

<a id="phone-sanitization"></a>
## Phone number sanitization ([Rule 14](Core-Principles.md#rule-14))

```js
const phoneRaw = cols['phone_mm1hp0a8'] || '';
const phone = phoneRaw.replace(/[^0-9+]/g, '');
```

For UK numbers: strip leading zero, ensure `+44` prefix.

```js
let phone = phoneRaw.replace(/[^0-9+]/g, '');
if (phone.startsWith('0')) phone = '+44' + phone.slice(1);
if (!phone.startsWith('+')) phone = '+' + phone;
```

See [Services/Twilio.md](Services/Twilio.md) for the regulatory bundle requirement.

---

<a id="test-pin-data"></a>
## Test pin data preparation

Before `test_workflow`, every trigger node needs pin data so it doesn't try to call the real service.

For webhook nodes:

```json
{
  "type": "webhook",
  "webhookData": {
    "body": { "your": "payload" },
    "method": "POST",
    "headers": {},
    "query": {}
  }
}
```

For schedule triggers: usually no payload needed; pin data is `{}`.

For Monday webhook triggers, include the challenge field in the test payload to verify the [challenge handler](#monday-webhook-challenge) works:

```json
{
  "type": "webhook",
  "webhookData": {
    "body": { "challenge": "test-challenge-abc123" },
    "method": "POST"
  }
}
```

And a separate test without the challenge to verify the real workflow path.

---

<a id="draft-vs-active"></a>
## Publishing draft vs active versions ([Rule 6](Core-Principles.md#rule-6))

n8n Cloud splits every workflow into:

- **Draft** — what the editor and `update_workflow` write to. Saving = drafted.
- **Active** — what production webhooks actually execute. Only updated when `publish_workflow` is called (or Publish button is clicked).

After every change, `n8n:publish_workflow` is required. If executions still show old behaviour after a "fix", the draft was never published. This is the most common false-positive in debugging — verify the active version matches what you think you deployed.

---

<a id="shell-plus-update"></a>
## Shell + update pattern ([Rule 1c](Core-Principles.md#rule-1c))

For workflows that include nodes that break via `create_workflow_from_code` (Gmail/Twilio/Monday native nodes):

1. Create a minimal shell:
   ```
   create_workflow_from_code(code: shell with manualTrigger + Set)
   ```
2. Update with the full code:
   ```
   update_workflow(id: shellId, code: full SDK code)
   ```
3. Publish:
   ```
   publish_workflow(id: shellId)
   ```

> **Surgical edits via REST API** are sometimes a better path when only a single property needs to change on a workflow that already has credentialed nodes — `update_workflow` strips credentials. Use the n8n REST API directly:
>
> - Auth: `X-N8N-API-KEY: <token>`
> - Base: `https://stayful.app.n8n.cloud/api/v1`
> - Pattern: `GET /workflows/{id}` → mutate target node → `PUT /workflows/{id}` → `n8n:publish_workflow`
> - **Strip these fields from the GET response before PUT-ing:** `availableInMCP`, `binaryMode` ([Rule 17](Core-Principles.md#rule-17))
> - Allowed `settings` fields: `executionOrder`, `saveManualExecutions`, `callerPolicy`, `errorWorkflow`, `timezone`, `saveDataSuccessExecution`, `saveDataErrorExecution`, `saveExecutionProgress`, `executionTimeout`, `maxExecutionTimeout`
> - "Continue on Fail" UI toggle = `"onError": "continueRegularOutput"` on the node object

---

<a id="deleting-test-workflows"></a>
## Deleting test workflows ([Rule 7](Core-Principles.md#rule-7))

Sequence is non-negotiable:

```
create test workflow → extract the answer → delete (archive) immediately → continue with the real workflow
```

A test workflow is anything that:
- Has "test" or "bisect" in its name
- Was created to answer a question rather than fulfil the user's actual request
- Was created to explore whether a node or pattern works

Do not batch deletions to "the end of the task". Do it the moment the answer is extracted, or it will be forgotten.

---

<a id="referencing-data-between-nodes"></a>
## Referencing data between nodes

n8n expression paths used inside node parameters:

| Pattern | Meaning |
|---|---|
| `{{ $json.fieldName }}` | Current node's input |
| `{{ $('Node Name').item.json.fieldName }}` | Named upstream node's output |
| `{{ $items('Node Name')[0].json.fieldName }}` | First item from a named node |
| `{{ $json.body.fieldName }}` | Webhook POST body field |
| `{{ $json.query.fieldName }}` | Webhook URL query parameter |
| `{{ $json.headers.fieldName }}` | Webhook header |

Most "Cannot read property X of undefined" errors come from using `$json.x` when the data is actually at `$('Node Name').item.json.x`. See [Troubleshooting#undefined-property](Troubleshooting.md#undefined-property).

In GraphQL queries inside HTTP Request nodes, inject values via expressions:

```json
{
  "query": "mutation { change_multiple_column_values(board_id: 5891626711, item_id: {{ $('Monday Search').item.json.data.items_page_by_column_values.items[0].id }}, column_values: \"{\\\"status5\\\": {\\\"label\\\": \\\"Web meeting booked\\\"}}\") { id } }"
}
```

---

<a id="code-node-modes"></a>
## Code node — runOnceForEachItem vs runOnceForAllItems

| Mode | Return shape |
|---|---|
| `runOnceForEachItem` | Plain `{ json: { ... } }` (not array) |
| `runOnceForAllItems` | Array of `{ json: { ... } }` items, built from `$input.all()` |

For multi-item processing (filter, map, group), use `runOnceForAllItems`:

```js
const items = $input.all();
return items
  .filter(i => i.json.email)
  .map(i => ({ json: { email: i.json.email.toLowerCase() } }));
```

---

<a id="anthropic-pattern"></a>
## Anthropic API via HTTP Request

Three things must be correct or it 400s / parses wrong:

1. **max_tokens must be an integer expression:**
   ```
   "max_tokens": "={{ 200 }}"
   ```
   Not `"200"`. The string form is rejected.

2. **messages built in a Code node:**
   ```js
   return [{ json: { messagesJson: JSON.stringify([
     { role: 'user', content: prompt }
   ]) } }];
   ```
   Then in the HTTP Request body: `"messages": "={{ JSON.parse($json.messagesJson) }}"`.

3. **Strip markdown fences before parsing Claude's JSON output:**
   ```js
   const cleaned = response
     .replace(/```json\n?/g, '')
     .replace(/```\n?/g, '')
     .trim();
   const data = JSON.parse(cleaned);
   ```
   *"Start your response with { and end with }"* in the prompt reduces but does not eliminate this — Claude will sometimes still wrap in fences.

Full service notes: [Services/Anthropic-Claude.md](Services/Anthropic-Claude.md).
