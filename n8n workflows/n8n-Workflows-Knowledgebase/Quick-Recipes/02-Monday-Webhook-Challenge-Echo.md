# 02 — Monday Webhook Challenge Echo

> The mandatory start of every Monday-triggered workflow. Without this, Monday silently refuses to register the webhook and the workflow will never fire.
>
> Rules in play: [Rule 8](../Core-Principles.md#rule-8) (challenge handling), [Rule 9](../Core-Principles.md#rule-9) (scope to columns).
> Services: [Monday.com](../Services/Monday.com.md).

---

## Use case

Any time Monday.com is the trigger for an n8n workflow. The first POST Monday sends after webhook registration is a challenge — `{"challenge": "<random-string>"}` — and Monday expects HTTP 200 with `{"challenge":"<the same value>"}` in response. Echo it or registration fails with *"The provided URL has not returned the requested challenge"*.

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node |
|---|---|---|
| 1 | Receive Monday webhook | `n8n-nodes-base.webhook` ✅ |
| 2 | Is this a challenge POST? | `n8n-nodes-base.if` ✅ |
| 3a | (TRUE) Build `{ challenge: "<value>" }` | `n8n-nodes-base.code` ✅ — **must be Code, not Set** |
| 3b | (TRUE) Respond to webhook with that body | `n8n-nodes-base.respondToWebhook` ✅ |
| 4 | (FALSE) Real workflow logic | … |

---

## Webhook trigger configuration

```ts
{
  type: 'n8n-nodes-base.webhook',
  parameters: {
    httpMethod: 'POST',
    path: 'monday-leads',
    responseMode: 'responseNode',   // REQUIRED — lets the Respond node return the body
    options: {}
  }
}
```

`responseMode: 'responseNode'` is non-optional. If it's `onReceived` (default), the Respond node has nothing to plug into and Monday gets a generic OK without the challenge body.

---

## IF node configuration

Check that `body.challenge` exists and is non-empty:

```
Condition: {{ $json.body.challenge }}
Operation: exists  (or "is not empty", string type)
```

---

## Code node (TRUE branch) — exact body

```js
return { challenge: $input.item.json.body.challenge };
```

That's it. Not a Set node — n8n's Set expressions do not reliably evaluate this echo, confirmed across multiple debugging sessions. A Code node returning a plain object resolves cleanly.

Mode: `runOnceForEachItem`.

---

## Respond to Webhook node

```ts
{
  type: 'n8n-nodes-base.respondToWebhook',
  parameters: {
    respondWith: 'firstIncomingItem',
    options: {}
  }
}
```

`firstIncomingItem` returns the body of the first item piped in, which is the `{ challenge: "…" }` object from the Code node. The HTTP response Monday sees is:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"challenge":"abc123…"}
```

---

## Why this prevents *"URL has not returned the requested challenge"*

When you register a webhook in Monday's Integrate panel, Monday immediately POSTs a one-time challenge. If the URL doesn't respond with the same `challenge` value, Monday refuses to register the URL and you'll never receive real webhook events.

Common false positives during debugging:
- The workflow appears to be working in test mode but never fires in production — because registration silently failed.
- You see one execution in n8n (the challenge) but nothing after.
- Production traffic 200s but nothing happens in n8n — same root cause as [empty 200](../Troubleshooting.md#empty-200) but for a different reason.

---

## Test payloads

### With challenge (registration POST)

```json
{
  "type": "webhook",
  "webhookData": {
    "body": { "challenge": "abc123" },
    "method": "POST"
  }
}
```

Expected output: the Respond node returns `{"challenge":"abc123"}`.

### Without challenge (real event)

```json
{
  "type": "webhook",
  "webhookData": {
    "body": {
      "event": {
        "type": "update_column_value",
        "boardId": 5891626711,
        "pulseId": 12345,
        "columnId": "status5",
        "value": { "label": { "text": "Qualified lead", "index": 13 } }
      }
    },
    "method": "POST"
  }
}
```

Expected: IF takes FALSE branch, real workflow runs.

---

## Scope the webhook in Monday ([Rule 9](../Core-Principles.md#rule-9))

When creating the webhook in Monday Integrate panel, pick:

✅ **"When a specific column changes, send a webhook"** — then choose the column (e.g. `status5`).

❌ **NOT** "When any column changes…" — fires on every column edit, hundreds of times per day on busy boards.

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| *"URL has not returned the requested challenge"* | Challenge handler missing or returns wrong shape | This recipe |
| Challenge echo returns empty string | Set node used instead of Code node | Switch to Code node ([Rule 8](../Core-Principles.md#rule-8)) |
| Workflow fires constantly | Webhook scoped to "any column" | Re-create webhook scoped to specific column ([Rule 9](../Core-Principles.md#rule-9)) |
| Webhook never receives anything in production | Webhook URL is from a draft that was never published | `publish_workflow` ([Rule 6](../Core-Principles.md#rule-6)) |
| Webhook hits the test URL not the production URL | The test URL is in the n8n editor (`/webhook-test/…`), production URL is `/webhook/…` | Copy production URL from the trigger's panel when active |
