# 01 — Gmail → Monday Search & Update

> Poll Gmail for new messages from a target sender, find the matching lead on Monday by email, and update their status / notes.
>
> Rules in play: [Rule 1](../Core-Principles.md#rule-1) (HTTP Gmail instead of native), [Rule 3](../Core-Principles.md#rule-3) (node map first), [Rule 11](../Core-Principles.md#rule-11) (current GraphQL methods), [Rule 6](../Core-Principles.md#rule-6) (validate-create-test-publish).
> Services: [Gmail](../Services/Gmail.md), [Monday.com](../Services/Monday.com.md).

---

## Use case

A specific sender (e.g. Calendly, a property portal, a form provider) emails Stayful when a lead takes an action. Poll Gmail, match the email address to a row on the Management Leads board, and update the row's status / write a note.

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node |
|---|---|---|
| 1 | Trigger every 5 min | `n8n-nodes-base.scheduleTrigger` ✅ |
| 2 | List recent Gmail messages from sender | `n8n-nodes-base.httpRequest` (Gmail API) ✅ — [Rule 1](../Core-Principles.md#rule-1) |
| 3 | Fetch full message body for each | `n8n-nodes-base.httpRequest` (Gmail API) ✅ |
| 4 | Extract email address from From / body | `n8n-nodes-base.code` ✅ |
| 5 | Search Monday by email | `n8n-nodes-base.httpRequest` (Monday GraphQL) ✅ |
| 6 | If found, update status + add update | `n8n-nodes-base.httpRequest` (Monday GraphQL) ✅ |

No native Gmail or Monday nodes — everything HTTP per [Rule 1](../Core-Principles.md#rule-1).

---

## Gmail list call (step 2)

```
URL:    https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:calendly is:unread&maxResults=10
Method: GET
Auth:   predefinedCredentialType googleOAuth2Api
```

Gmail search syntax:
- `from:calendly` — sender substring
- `is:unread` — unread only
- `after:2024/01/01` — date filter
- `subject:"booking confirmed"` — subject substring

Combine: `q=from:calendly is:unread newer_than:1d`.

See [Services/Gmail.md](../Services/Gmail.md) for the full cheat sheet.

---

## Gmail full-message call (step 3)

For each message ID returned by step 2, fetch full body:

```
URL:    https://gmail.googleapis.com/gmail/v1/users/me/messages/{{$json.id}}?format=full
Method: GET
Auth:   predefinedCredentialType googleOAuth2Api
```

Use `runOnceForEachItem` if processing item-by-item; otherwise loop in a Code node.

---

## Extract email Code node (step 4)

```js
const items = $input.all();
return items
  .map(i => {
    const headers = i.json.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';

    // From header looks like: "Name <user@example.com>"
    const match = from.match(/<([^>]+)>/);
    const email = (match ? match[1] : from).toLowerCase().trim();

    return { json: { email, gmail_id: i.json.id, from_header: from } };
  })
  .filter(i => i.json.email);  // empty array if nothing — Rule 10
```

[Rule 10](../Core-Principles.md#rule-10) — return empty array when nothing matches, never a `{ skipped: true }` sentinel.

---

## Monday search call (step 5) — [Rule 11](../Core-Principles.md#rule-11)

```
URL:     https://api.monday.com/v2
Method:  POST
Auth:    Header Auth account 4 (Authorization)
Headers: Content-Type: application/json
         API-Version: 2024-10

Body (JSON):
{
  "query": "{ items_page_by_column_values(board_id: 5891626711, columns: [{column_id: \"text_mkygb5xx\", column_values: [\"{{ $json.email }}\"]}], limit: 50) { items { id name column_values { id text } } } }"
}
```

**Why `items_page_by_column_values` and not `items_by_column_values`:** the old one is deprecated. Always use the paginated version. See [Services/Monday.com.md](../Services/Monday.com.md).

---

## Monday update call (step 6)

Multiple mutations combined via GraphQL aliases (saves a round trip):

```graphql
mutation {
  status: change_multiple_column_values(
    board_id: 5891626711,
    item_id: {{ $('Monday Search').item.json.data.items_page_by_column_values.items[0].id }},
    column_values: "{\"status5\": {\"label\": \"Web meeting booked\"}, \"date_mm1nmb17\": {\"date\": \"{{ $now.format('yyyy-MM-dd') }}\"}}"
  ) { id }

  comment: create_update(
    item_id: {{ $('Monday Search').item.json.data.items_page_by_column_values.items[0].id }},
    body: "Lead replied via email at {{ $now.toISO() }}"
  ) { id }
}
```

The `column_values` argument is a JSON string — note the escaped quotes.

---

## Known values to swap in

| Token | Value | Where |
|---|---|---|
| Board ID | `5891626711` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Email column | `text_mkygb5xx` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Status column | `status5` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Last response column | `date_mm1nmb17` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Status label IDs | `13` Qualified, `108` Web meeting booked, etc. | [Registry](../Known-Values-Registry.md#monday-management-leads) |

---

## Test pin data

Pin data on the Schedule Trigger:
```json
{}
```

Pin data on the Gmail list HTTP node (mock the API response):
```json
{
  "messages": [{ "id": "abc123", "threadId": "xyz789" }],
  "resultSizeEstimate": 1
}
```

Pin data on the Gmail full-message node:
```json
{
  "id": "abc123",
  "payload": {
    "headers": [
      { "name": "From", "value": "Test Lead <lead@example.com>" },
      { "name": "Subject", "value": "Re: Stayful" }
    ]
  }
}
```

---

## Why this pattern works

- **HTTP Gmail bypasses the SDK bug** that breaks `gmailTrigger`.
- **Schedule + filter** is cheaper than the trigger + Gmail push subscription, and avoids the OAuth dance for push notifications.
- **GraphQL aliases** let one HTTP call do status update + comment, halving the Monday rate-limit hit.
- **Lowercase + trim** the email before searching — Monday is case-sensitive on text columns.

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| Monday search returns empty | Email casing mismatch | `.toLowerCase().trim()` before search ([Rule 11](../Core-Principles.md#rule-11)) |
| 401 from Gmail | OAuth scope wrong or token expired | Re-pick credential ([Rule 4](../Core-Principles.md#rule-4)) |
| 401 from Monday | Header Auth Name field wrong | Should be `Authorization` not `Monday API` ([Rule 4](../Core-Principles.md#rule-4)) |
| Update doesn't apply | Workflow not published — still running old draft | `publish_workflow` ([Rule 6](../Core-Principles.md#rule-6)) |
| Workflow fires hundreds of times | Schedule too aggressive or upstream Gmail returning same items | Bump interval, add `is:unread` to query, mark as read after processing |
