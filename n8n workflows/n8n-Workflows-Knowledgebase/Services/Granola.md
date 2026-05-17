# Granola

> AI meeting notetaker integrated with Google Calendar. Used at Stayful to capture web meeting transcripts.
>
> **Current status: No HTTP API exists.** Granola cannot be queried from n8n via HTTP Request. The web meeting transcript check ([Recipe 07](../Quick-Recipes/07-Web-Meeting-Processing.md)) is blocked pending Granola providing API access.

---

## Current state

Granola has no public or private HTTP API available as of the time of writing. There is no endpoint Claude or n8n can call to retrieve meetings or transcripts programmatically.

**Impact on the web meeting pipeline:**
- The transcript check step (Node 9 in Recipe 07) **cannot be built** until Granola ships an API.
- The web meeting workflow design up to the Wait node (Nodes 1–8) is valid and buildable.
- The branching logic (transcript found → generate action plan / not found → no-show) is designed and documented, but the trigger for that branch is blocked.

**What to do when Granola releases an API:**
1. Update this file with the actual base URL, auth method, and endpoint paths.
2. Add the credential to the n8n instance.
3. Build Nodes 9–20 of Recipe 07 using the patterns documented in [the recipe](../Quick-Recipes/07-Web-Meeting-Processing.md#node-9--query-granola-http-request).
4. Update [Known-Values-Registry.md](../Known-Values-Registry.md) with the Granola credential name.

---

## How Granola works (manually)

Granola listens to Zac's Google Calendar. When a meeting ends it processes the recording and generates a transcript, visible in the Granola desktop app.

**Meeting duration pattern:** Analysis of 39 historical Stayful web meetings confirmed 89.7% are exactly 30 minutes long. When the API becomes available, a single check at T+45 min (meeting start + 45 minutes = 15 min after expected end) will be sufficient. No retry needed — if there is no transcript at T+45, treat the meeting as a no-show.

**Email = the join key.** All emails across Stayful systems (Monday, Gmail, Granola, Google Calendar) are lowercase and match exactly. When the API arrives, query by the lead's email address.

---

## Intended integration pattern (for when API ships)

This is the design intent — not yet buildable.

### List / search meetings

```
GET /v1/meetings?attendee_email={lead_email}&after={meeting_start_iso}
Auth: Bearer <token>
```

Returns an array of meetings. Empty array = no transcript = treat as no-show.

### Get transcript for a meeting

```
GET /v1/meetings/{meeting_id}/transcript
Auth: Bearer <token>
```

### n8n node position in web meeting workflow

```
[Wait: until meeting_start + 45 minutes]
    ↓
[HTTP Request: Granola — list meetings by attendee email]  ← BLOCKED (no API)
    ↓
[IF: meeting found?]
    → FALSE → [Monday: set "Web meeting no show"]
    → TRUE  → [HTTP Request: Granola — get transcript] → [continue pipeline]
```

---

## Monday column cap — important for when this is built

The `long_text_mm231qgr` (Web Meeting Transcript) column **caps at ~2,000 characters** (~3 minutes of spoken content). Never write a full transcript to this column.

**Correct approach when API is available:**
1. Write a Claude-generated summary (≤1,500 chars) to `long_text_mm231qgr` if needed.
2. Write the full Granola summary as a **Monday item update** (`create_update` mutation) — no character limit, primary content store.

---

## Cross-links

- Recipes: [07-Web-Meeting-Processing](../Quick-Recipes/07-Web-Meeting-Processing.md)
- Rules: [Rule 4](../Core-Principles.md#rule-4) (credential lookup when API exists), [Rule 5](../Core-Principles.md#rule-5) (email join key), [Rule 10](../Core-Principles.md#rule-10) (empty array not sentinel)
- Services: [Monday.com](Monday.com.md) (transcript column cap, create_update pattern)
