# 06 — Calendly Webhook → Monday Booking Update

> A lead books a web meeting via Calendly. Capture the booking, find the lead row on Monday by email, and update status + booked date.
>
> Rules in play: [Rule 11](../Core-Principles.md#rule-11) (current Monday GraphQL), [Rule 6](../Core-Principles.md#rule-6) (publish after every change).
> Services: [Calendly](../Services/Calendly.md), [Monday.com](../Services/Monday.com.md).

---

## Use case

Calendly POSTs to an n8n webhook on `invitee.created`. Workflow looks up the lead by email on the Management Leads board, sets status to "Web meeting booked", and stamps the booked datetime.

This is a webhook flow — no challenge handler needed (that's only for Monday triggers).

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node |
|---|---|---|
| 1 | Receive Calendly webhook | `n8n-nodes-base.webhook` ✅ |
| 2 | Extract invitee email + start time + name | `n8n-nodes-base.set` (or Code) ✅ |
| 3 | Search Monday by email | `n8n-nodes-base.httpRequest` (GraphQL) ✅ |
| 4 | Update status + book date + add update | `n8n-nodes-base.httpRequest` (GraphQL) ✅ |

---

## Webhook configuration (step 1)

```ts
{
  type: 'n8n-nodes-base.webhook',
  parameters: {
    httpMethod: 'POST',
    path: 'calendly-booking',
    responseMode: 'onReceived',   // Calendly doesn't need a custom body back
    options: {}
  }
}
```

Configure the webhook URL in Calendly's webhook settings, subscribing to `invitee.created`.

---

## Calendly payload structure

A real `invitee.created` payload looks roughly like:

```json
{
  "event": "invitee.created",
  "payload": {
    "name": "Test Lead",
    "email": "test@example.com",
    "questions_and_answers": [],
    "tracking": { "utm_source": "n8n" },
    "scheduled_event": {
      "name": "Stayful Discovery Call",
      "start_time": "2026-05-21T14:00:00.000000Z",
      "end_time": "2026-05-21T14:30:00.000000Z",
      "event_type": "https://api.calendly.com/event_types/abc"
    }
  }
}
```

Field paths inside n8n:
- Email: `{{ $json.body.payload.email }}`
- Name: `{{ $json.body.payload.name }}`
- Start time: `{{ $json.body.payload.scheduled_event.start_time }}`

---

## Extract Set node (step 2)

```ts
{
  type: 'n8n-nodes-base.set',
  parameters: {
    values: {
      string: [
        { name: 'email',      value: '={{ $json.body.payload.email.toLowerCase().trim() }}' },
        { name: 'name',       value: '={{ $json.body.payload.name }}' },
        { name: 'start_time', value: '={{ $json.body.payload.scheduled_event.start_time }}' },
        { name: 'start_date', value: '={{ $json.body.payload.scheduled_event.start_time.split("T")[0] }}' }
      ]
    },
    options: { keepOnlySet: true }
  }
}
```

`.toLowerCase().trim()` on email — Monday text columns are case-sensitive ([Rule 11](../Core-Principles.md#rule-11)).

---

## Monday search (step 3)

Same as [Recipe 01 step 5](01-Gmail-to-Monday-Search-and-Update.md#monday-search-call-step-5--rule-11):

```graphql
{
  items_page_by_column_values(
    board_id: 5891626711,
    columns: [{column_id: "text_mkygb5xx", column_values: ["{{ $json.email }}"]}],
    limit: 50
  ) {
    items {
      id
      name
      column_values { id text }
    }
  }
}
```

---

## Monday update (step 4)

```graphql
mutation {
  status: change_multiple_column_values(
    board_id: 5891626711,
    item_id: {{ $('Monday Search').item.json.data.items_page_by_column_values.items[0].id }},
    column_values: "{\"status5\": {\"label\": \"Web meeting booked\"}}"
  ) { id }

  comment: create_update(
    item_id: {{ $('Monday Search').item.json.data.items_page_by_column_values.items[0].id }},
    body: "Web meeting booked via Calendly for {{ $('Extract').item.json.start_time }}"
  ) { id }
}
```

Status label `Web meeting booked` corresponds to label ID `108` on `status5`. See [Known-Values-Registry](../Known-Values-Registry.md#monday-management-leads).

Optional: also move the item to the **Web meeting booked group** (`group_mksxb5m0`) — see Monday `move_item_to_group` mutation.

---

## Known values

| Item | Value | Where |
|---|---|---|
| Board ID | `5891626711` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Email column | `text_mkygb5xx` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Status column | `status5` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| "Web meeting booked" label | `108` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Web meeting booked group | `group_mksxb5m0` | [Registry](../Known-Values-Registry.md#monday-management-leads) |

---

## Test pin data

Pin on the webhook trigger:

```json
{
  "type": "webhook",
  "webhookData": {
    "body": {
      "event": "invitee.created",
      "payload": {
        "name": "Test Lead",
        "email": "test@example.com",
        "scheduled_event": {
          "name": "Stayful Discovery Call",
          "start_time": "2026-05-21T14:00:00.000000Z"
        }
      }
    },
    "method": "POST"
  }
}
```

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| Monday search returns empty | Email casing mismatch | `.toLowerCase().trim()` before search |
| Status doesn't update | Label spelling wrong (`"Web meeting booked"` is case-sensitive) | Confirm against [Registry](../Known-Values-Registry.md#monday-management-leads), or use `{"index": 108}` form |
| Webhook fires twice for same booking | Calendly retries on non-200 | Confirm responseMode `onReceived` is set, return 200 quickly |
| Duplicate booking on the same lead | No idempotency check | Add IF: if current status is already "Web meeting booked", skip |
| Timezone shift in stored date | UTC vs local | Calendly always emits UTC `Z`; do timezone conversion downstream if needed |
