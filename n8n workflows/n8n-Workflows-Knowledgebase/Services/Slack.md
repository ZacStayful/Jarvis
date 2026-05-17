# Slack

> Post messages to Stayful's Slack workspace. The native `n8n-nodes-base.slack` node 500s on SDK creation ([Rule 1](../Core-Principles.md#rule-1)) — use HTTP Request or [JSON-import](../Core-Principles.md#rule-1b).

---

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | `https://slack.com/api/` |
| Post message endpoint | `POST /chat.postMessage` |
| Auth | Header Auth — `Authorization: Bearer xoxb-<bot-token>` |
| Content-Type | `application/json` |

Bot tokens (`xoxb-…`) belong to a Slack app installed in the workspace. User tokens (`xoxp-…`) act as a user — usually you want a bot token for workflow notifications.

---

## Required scopes

Configure on the Slack app's OAuth & Permissions page:

| Scope | Purpose |
|---|---|
| `chat:write` | Post messages as the bot |
| `chat:write.public` | Post in public channels the bot isn't a member of |
| `channels:read` | List public channels (for channel-name → ID lookup) |
| `users:read` / `users:read.email` | Direct-message a user by email |

Re-install the app after adding scopes — existing tokens won't have the new permissions.

---

## Post message (basic)

```
URL:    https://slack.com/api/chat.postMessage
Method: POST
Auth:   Header Auth (Bearer xoxb-…)
Send Body: enabled, JSON
```

```json
{
  "channel": "#leads",
  "text": "New qualified lead: Test Lead (test@example.com)"
}
```

Channel can be `#channel-name` or the channel ID (`C01234ABCD`). IDs are more stable across renames.

### Response shape

```json
{
  "ok": true,
  "channel": "C01234ABCD",
  "ts": "1715673600.000200",
  "message": { … }
}
```

Always check `ok` — Slack returns 200 even on logical errors (invalid channel, permission denied), with `ok: false` and an `error` field.

---

## Rich formatting — blocks

Slack's Block Kit gives richer layouts than plain text:

```json
{
  "channel": "#leads",
  "text": "Fallback for notifications",
  "blocks": [
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*New qualified lead*\nName: Test Lead\nEmail: test@example.com" }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "Open in Monday" },
          "url": "https://stayful.monday.com/boards/5891626711/pulses/12345"
        }
      ]
    }
  ]
}
```

The top-level `text` is the fallback shown in notifications and used by screen readers — always include it even when using blocks.

Slack message formatting (mrkdwn):

| Markup | Effect |
|---|---|
| `*bold*` | **bold** |
| `_italic_` | *italic* |
| `` `code` `` | inline code |
| `<https://example.com\|Link text>` | hyperlink |
| `<@U01234>` | user mention |
| `<#C01234>` | channel mention |

---

## Direct messages

Two ways:

### 1. By Slack user ID

```json
{ "channel": "U01234ABCD", "text": "Heads up — Calendly booking from a qualified lead." }
```

### 2. By email — first look up the user

```
POST /users.lookupByEmail?email=zac@stayful.co.uk

Response: { "ok": true, "user": { "id": "U01234ABCD", … } }
```

Then post to that user ID.

---

## Why the native node fails via SDK

`n8n-nodes-base.slack` requires pre-assigned OAuth credentials at SDK-load time. The MCP can't pre-assign, so `create_workflow_from_code` 500s ([Rule 1](../Core-Principles.md#rule-1)).

Workarounds:
1. **HTTP Request + Bearer auth** — universal.
2. **JSON-import** — native node works fine at runtime; only the SDK creation breaks. Drop a JSON workflow onto the canvas and credential-pick in UI ([Rule 1b](../Core-Principles.md#rule-1b)).

---

## Common errors & fixes

| Slack error | Cause | Fix |
|---|---|---|
| `invalid_auth` | Token expired or wrong format | Check Header Auth Value field; ensure `Bearer xoxb-…` prefix |
| `channel_not_found` | Channel name typo, or bot not invited to private channel | Invite the bot (`/invite @YourBotName`), or use channel ID |
| `not_in_channel` | Bot needs to be invited (private channels) | `/invite @BotName` in the target channel |
| `missing_scope` | OAuth scope not granted | Add scope, re-install app, refresh token |
| `rate_limited` | Bursts above Tier 1 limits | Add Wait node; batch messages |
| Returns 200 but `ok: false` | Logical error | Check `error` field in the JSON response |

---

## Test payload

```json
{
  "channel": "#leads",
  "text": "Test message from n8n workflow"
}
```

Successful response:

```json
{
  "ok": true,
  "channel": "C01234ABCD",
  "ts": "1715673600.000200"
}
```

---

## Cross-links

- Rules: [1](../Core-Principles.md#rule-1), [1b](../Core-Principles.md#rule-1b)
- Services: [Monday.com](Monday.com.md) (Slack messages often include Monday item links)
