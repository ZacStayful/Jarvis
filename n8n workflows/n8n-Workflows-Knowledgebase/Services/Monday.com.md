# Monday.com

> The central data store for Stayful's lead workflows. All operations via HTTP Request + GraphQL — the native `n8n-nodes-base.mondayCom` node is broken via the MCP SDK ([Rule 1](../Core-Principles.md#rule-1)).
>
> Known values: [Registry](../Known-Values-Registry.md#monday-management-leads)

---

## Endpoint & auth

| Item | Value |
|---|---|
| Endpoint | `https://api.monday.com/v2` |
| Method | POST (always) |
| Auth | Header Auth account 4 — `Authorization: <token>` (no "Bearer" prefix) |
| Version header | `API-Version: 2024-10` (always send) |
| Content-Type | `application/json` |

> **Header Auth Name field** must be `Authorization`. Common mistake is typing `Monday API` into the Name field — that becomes a literal HTTP header name and Node.js rejects with *"Header name must be a valid HTTP token"*. See [System-Patterns#header-auth-structure](../System-Patterns.md#header-auth-structure).

---

## Current API methods ([Rule 11](../Core-Principles.md#rule-11))

| Use | Method | Notes |
|---|---|---|
| Search by column value | `items_page_by_column_values` | Paginated, current |
| Search by column value (legacy) | `items_by_column_values` | Still works but deprecated; avoid for new workflows |
| Update one or many columns | `change_multiple_column_values` | Single call updates multiple columns on one item |
| Add comment / update | `create_update` | |
| Move item between groups | `move_item_to_group` | |
| Create webhook | `create_webhook` | **Blocked by OAuth scope on current credential** — create via Monday UI Integrate panel instead |

---

## Common GraphQL queries

### Search by column value (current)

```graphql
{
  items_page_by_column_values(
    board_id: 5891626711,
    columns: [{column_id: "text_mkygb5xx", column_values: ["lead@example.com"]}],
    limit: 50
  ) {
    items {
      id
      name
      column_values { id text value }
    }
  }
}
```

Returns: `data.items_page_by_column_values.items[]`.

### Search by status

```graphql
{
  items_page_by_column_values(
    board_id: 5891626711,
    columns: [{column_id: "status5", column_values: ["Qualified lead"]}],
    limit: 500
  ) { items { id name } }
}
```

### Update multiple columns in one call

```graphql
mutation {
  change_multiple_column_values(
    board_id: 5891626711,
    item_id: 12345,
    column_values: "{\"status5\": {\"label\": \"Web meeting booked\"}, \"date_mm1nmb17\": {\"date\": \"2026-05-14\"}}"
  ) { id }
}
```

The `column_values` argument is a **JSON string** (the outer GraphQL value is a string containing JSON). Escape quotes carefully.

### Add comment

```graphql
mutation {
  create_update(item_id: 12345, body: "Auto-update from n8n") { id }
}
```

### Multiple mutations in one request (GraphQL aliases)

Halves your Monday rate-limit hit and keeps logic atomic:

```graphql
mutation {
  status: change_multiple_column_values(
    board_id: 5891626711,
    item_id: 12345,
    column_values: "{\"status5\": {\"label\": \"Web meeting booked\"}}"
  ) { id }

  comment: create_update(
    item_id: 12345,
    body: "Booked via Calendly"
  ) { id }
}
```

The response has both keys: `data.status` and `data.comment`.

---

## Value formats by column type

| Column type | Format |
|---|---|
| Status | `{"label": "Web meeting booked"}` or `{"index": 108}` |
| Text | `"plain string value"` |
| Long text | `{"text": "plain string"}` |
| Date | `{"date": "2026-05-14", "time": "14:30:00"}` (time optional) |
| Phone | `{"phone": "+447426947296", "countryShortName": "GB"}` |
| Email | `{"email": "lead@example.com", "text": "lead@example.com"}` |
| File | (use the dedicated `add_file_to_column` mutation) |

For **dates specifically**, always JSON.stringify in n8n:

```js
JSON.stringify({ date: "2026-04-24", time: "22:46:00" })
```

---

## Webhook integration

### Where to create webhooks

Use the Monday UI **Integrate** panel (NOT Automate). The GraphQL `create_webhook` mutation is blocked by OAuth scope on the current Stayful credential.

### Pick the scoped recipe ([Rule 9](../Core-Principles.md#rule-9))

✅ "When a specific column changes, send a webhook" — fires only on the target column.

❌ "When any column changes, send a webhook" — fires on every edit, hundreds of times per day.

### "When update is created" automation has no conditions

Monday's "When update is created" webhook automation does not support filtering conditions. If you need to filter (e.g. only forward updates from a specific user), do it inside n8n.

### Challenge handshake (mandatory) — [Rule 8](../Core-Principles.md#rule-8)

Every Monday webhook URL must echo back the challenge on registration. See [Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md](../Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md).

### Webhook event payload — text column wrapping

Monday wraps text-column values in a nested object inside the event. Always include both fallbacks:

```
{{ $json.body?.event?.value?.value ?? $json.body?.event?.value?.text ?? '' }}
```

Status columns are at `$json.body.event.value.label.text` (text) or `.label.index` (numeric ID).

---

## Column ID reference (Management Leads board `5891626711`)

Full list in [Known-Values-Registry.md](../Known-Values-Registry.md#monday-management-leads). Quick reference:

| ID | Column |
|---|---|
| `text_mkygb5xx` | Email |
| `phone_mm1hp0a8` | Phone |
| `status5` | Status |
| `text5` | Notes |
| `date_mm1nmb17` | Lead Last Response |
| `text_mm2pfnft` | Slide Progress (final = `'8'`) |
| `long_text_mm2pse8d` | Slide Responses |
| `long_text_mm231qgr` | Web Meeting Transcript (capped ~2000 chars) |

### Status labels (`status5`)

| Text | Index |
|---|---|
| Qualified lead | 13 |
| Web meeting booked | 108 |
| Customer | 4 |
| Warm | 7 |
| Special offer applied | 0 |
| Dead | 1 |
| Abandoned | 2 |

### Long-text caps

`long_text_mm231qgr` (Web Meeting Transcript) caps at ~2000 characters. For longer content (full meeting transcripts), write summary to the column and store the full transcript as an **item update** via `create_update`. Item updates have no comparable cap.

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| `items_page_by_column_values` returns empty `items` | Wrong column ID, wrong value, or case mismatch on text columns | Confirm column ID against [Registry](../Known-Values-Registry.md#monday-management-leads); `.toLowerCase().trim()` emails |
| 401 Unauthorized | Header Auth fields wrong | Check title vs Name vs Value ([Rule 4](../Core-Principles.md#rule-4)) — Name must be `Authorization` |
| 403 on `create_webhook` | OAuth scope blocked | Create via Monday UI Integrate panel ([Rule 9](../Core-Principles.md#rule-9)) |
| Webhook registers but never fires | Challenge handler missing | [Rule 8](../Core-Principles.md#rule-8) + [Quick-Recipes/02](../Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md) |
| Webhook fires hundreds of times | Webhook scoped to "any column" | Re-create scoped to a specific column ([Rule 9](../Core-Principles.md#rule-9)) |
| Date column update silently fails | Date value wasn't JSON-stringified | Use `JSON.stringify({ date: "YYYY-MM-DD" })` ([Rule 11](../Core-Principles.md#rule-11)) |
| Native `mondayCom` node 500 on create | SDK incompatibility | HTTP Request + GraphQL ([Rule 1](../Core-Principles.md#rule-1)) |

---

## Why the native node fails via SDK

`n8n-nodes-base.mondayCom` requires pre-assigned credentials to be valid at JSON-load time. The MCP SDK can't fill those in, so `create_workflow_from_code` rejects the node with HTTP 500. Same root cause as Gmail, Twilio, Slack ([Rule 1](../Core-Principles.md#rule-1)).

Workarounds:
1. **HTTP Request + GraphQL** — recommended path, used in every Stayful workflow.
2. **JSON-import** — drop the workflow JSON into the canvas via UI ([Rule 1b](../Core-Principles.md#rule-1b)), credential pick manually.

---

## Cross-links

- Rules: [1](../Core-Principles.md#rule-1), [8](../Core-Principles.md#rule-8), [9](../Core-Principles.md#rule-9), [11](../Core-Principles.md#rule-11)
- Recipes: [01](../Quick-Recipes/01-Gmail-to-Monday-Search-and-Update.md), [02](../Quick-Recipes/02-Monday-Webhook-Challenge-Echo.md), [05](../Quick-Recipes/05-Retell-Outbound-Call.md), [06](../Quick-Recipes/06-Calendly-Webhook-Booking.md)
- Patterns: [Monday webhook challenge](../System-Patterns.md#monday-webhook-challenge), [Webhook scoping](../System-Patterns.md#monday-webhook-scoping)
- Known values: [Monday Management Leads](../Known-Values-Registry.md#monday-management-leads)
