# Granola

> AI meeting notetaker integrated with Google Calendar. Used in the web meeting pipeline to retrieve transcripts after meetings complete. Accessed via HTTP Request in n8n.
>
> Native n8n node: ❌ does not exist — HTTP Request only.
> Auth: Bearer token (confirm credential name via `n8n:search_workflows` — Rule 4).

---

## How Granola fits the pipeline

Granola listens to Zac's Google Calendar. When a meeting ends it processes the recording and generates a transcript. The web meeting workflow polls Granola **once**, 45 minutes after the scheduled meeting start, to retrieve the transcript.

**Why 45 minutes and no retry:** Analysis of 39 historical Stayful web meetings confirmed 89.7% are exactly 30 minutes long. A single check at T+45 min (15 min after expected end) gives Granola time to finish processing. If there is no transcript at T+45, treat the meeting as a no-show. Do not retry.

**Email = the join key.** All emails across Stayful systems (Monday, Gmail, Granola, Google Calendar) are lowercase and match exactly. Use the lead's email to find the correct Granola meeting.

---

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | Confirm from working workflow via `n8n:search_workflows({ query: "granola" })` |
| Auth | Bearer token — Header Auth credential (confirm name via Rule 4) |
| Content-Type | `application/json` |

> **Important:** Granola's HTTP API is not fully public documentation. Always verify the exact base URL and auth format from the existing web meeting workflow in n8n before building new workflows. Use `n8n:search_workflows({ query: "granola" })` ([Rule 4](../Core-Principles.md#rule-4)).

---

## List / search meetings

Find the meeting record by the lead's attendee email and a time window around the expected meeting time:

```
GET /v1/meetings?attendee_email={lead_email}&after={iso_start}&before={iso_end}
Auth: Bearer <token>
```

Or as a POST search if GET params are not supported:

```
POST /v1/meetings/search
{
  "attendee_email": "lead@example.com",
  "after": "2026-05-14T14:00:00Z",
  "before": "2026-05-14T16:00:00Z"
}
```

Returns an array of meeting objects. If empty → no transcript → treat as no-show.

### Check for transcript availability

```js
// In a Code node after the Granola list call
const meetings = $input.item.json.meetings || $input.item.json || [];
const meeting = Array.isArray(meetings) ? meetings[0] : null;

if (!meeting || !meeting.id) {
  return []; // Empty array = no-show path (Rule 10)
}

return [{ json: { meeting_id: meeting.id, title: meeting.title } }];
```

---

## Get transcript for a meeting

```
GET /v1/meetings/{meeting_id}/transcript
Auth: Bearer <token>
```

Returns structured transcript content. Access the transcript text at the path returned by the actual API (confirm from working workflow — commonly `.transcript` or `.content[0].text`).

---

## Monday column cap — critical

The `long_text_mm231qgr` (Web Meeting Transcript) column **caps at ~2,000 characters** (~3 minutes of spoken content). Never write a full transcript to this column.

**Correct approach:**
1. Write a short summary (first 1,500 chars or Claude-generated summary) to `long_text_mm231qgr` if needed.
2. Write the full Granola summary as a **Monday item update** (`create_update` mutation) — this has no character limit and is the primary content store.

See [Services/Monday.com.md](Monday.com.md) for the `create_update` mutation pattern.

---

## n8n node map for Granola check

```
[Wait node: until meeting_start + 45 minutes]
    ↓
[HTTP Request: GET /meetings?attendee_email=EMAIL&after=MEETING_START_ISO&before=MEETING_START_PLUS_2HRS]
    ↓
[Code: extract meeting_id — return [] if not found (Rule 10)]
    ↓ (empty array = stops here → no-show branch handles separately)
[HTTP Request: GET /meetings/{meeting_id}/transcript]
    ↓
[Code: extract transcript text, build Monday summary]
```

The no-show branch connects from an IF node placed BEFORE the transcript GET:

```
[HTTP Request: GET meetings list]
    ↓
[IF: $json.meetings is not empty / meeting_id exists]
    → FALSE → [Monday: set "Web meeting no show"]
    → TRUE  → [HTTP Request: GET transcript] → [continue pipeline]
```

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| 401 | Wrong or expired Bearer token | Re-pick credential ([Rule 4](../Core-Principles.md#rule-4)) |
| Empty meetings array at T+45 | Meeting did not happen (no-show) | Set Monday status to "Web meeting no show" — correct behaviour |
| Transcript text truncated in Monday | Column cap ~2,000 chars | Write to `create_update` (item comment), not the `long_text_mm231qgr` column |
| Wrong meeting returned | Multiple meetings with same attendee in time window | Narrow the `before`/`after` window; verify meeting title contains lead name |
| API path 404 | Base URL or endpoint path changed | Run `n8n:search_workflows({ query: "granola" })` to find current working pattern ([Rule 4](../Core-Principles.md#rule-4)) |

---

## Test pin data

For the Granola list node (mock a found meeting):

```json
{
  "meetings": [
    {
      "id": "meeting-abc123",
      "title": "Stayful Web Meeting — Test Lead",
      "start_time": "2026-05-14T14:00:00Z",
      "end_time": "2026-05-14T14:30:00Z"
    }
  ]
}
```

For the no-show case (mock empty response):

```json
{ "meetings": [] }
```

---

## Cross-links

- Recipes: [07-Web-Meeting-Processing](../Quick-Recipes/07-Web-Meeting-Processing.md)
- Rules: [Rule 4](../Core-Principles.md#rule-4) (credential lookup), [Rule 5](../Core-Principles.md#rule-5) (email join key), [Rule 10](../Core-Principles.md#rule-10) (empty array not sentinel)
- Services: [Monday.com](Monday.com.md) (transcript column cap, create_update pattern)
- Known values: [Known-Values-Registry#monday-management-leads](../Known-Values-Registry.md#monday-management-leads)
