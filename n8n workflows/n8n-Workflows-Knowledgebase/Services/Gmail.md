# Gmail

> All Gmail access is via HTTP Request + Gmail API + `googleOAuth2Api` credential. The native `gmailTrigger` and `gmail` nodes are broken via the MCP SDK ([Rule 1](../Core-Principles.md#rule-1)).

---

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | `https://gmail.googleapis.com/gmail/v1` |
| Auth | `predefinedCredentialType: 'googleOAuth2Api'` on the HTTP Request node |
| OAuth client type | **Web application** (not Desktop) |
| Callback URL | `https://oauth.n8n.cloud/oauth2/callback` |
| Google project | "My First Project" |
| Client ID | `626654609834-fqu4rrkr5f9pra0b9pufth5q9c1eth74…` (see [Registry](../Known-Values-Registry.md#google-oauth)) |

> **Credential type distinction.** `gmailOAuth2` is locked to the native Gmail nodes. HTTP Request must use `googleOAuth2Api`. These are different credential types in n8n — picking the wrong one causes 401s.

---

## HTTP polling pattern

Native `gmailTrigger` fails via SDK, so use:

```
[Schedule Trigger]   ← every 5-15 min
   ↓
[HTTP Request: list messages]   ← GET /users/me/messages?q=…
   ↓
[Code or Split: per message ID]
   ↓
[HTTP Request: get full message]   ← GET /users/me/messages/{id}?format=full
   ↓
[downstream processing]
```

Polling at 5 min is the sweet spot for most workflows — see [Rule 9](../Core-Principles.md#rule-9) reasoning by analogy.

---

## List messages endpoint

```
GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q={query}&maxResults=10
```

Returns:

```json
{
  "messages": [{ "id": "abc123", "threadId": "xyz789" }, …],
  "resultSizeEstimate": 27,
  "nextPageToken": "01234abc…"
}
```

### Pagination

For more than `maxResults` results, follow `nextPageToken` until absent:

```
GET …/messages?q=…&maxResults=10&pageToken={{ $json.nextPageToken }}
```

---

## Get full message endpoint

```
GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=full
```

Returns nested payload structure:

```json
{
  "id": "abc123",
  "threadId": "xyz789",
  "labelIds": ["INBOX", "UNREAD"],
  "snippet": "Hi Stayful, thanks for the…",
  "payload": {
    "headers": [
      { "name": "From",    "value": "Test Lead <lead@example.com>" },
      { "name": "Subject", "value": "Re: Booking" },
      { "name": "Date",    "value": "Wed, 14 May 2026 07:30:00 +0000" }
    ],
    "parts": [
      { "mimeType": "text/plain", "body": { "data": "base64-encoded" } },
      { "mimeType": "text/html",  "body": { "data": "base64-encoded" } }
    ]
  }
}
```

### Body extraction

Bodies are base64url-encoded. Decode in a Code node:

```js
const parts = $input.item.json.payload.parts || [];
const textPart = parts.find(p => p.mimeType === 'text/plain');
const data = textPart?.body?.data || '';
const decoded = Buffer.from(data, 'base64url').toString('utf-8');
return { json: { body: decoded } };
```

For HTML bodies, swap `'text/plain'` for `'text/html'`. Some messages have no `parts` — body is directly at `payload.body.data` for simple emails.

---

## Search syntax (`q` parameter)

| Operator | Example | Meaning |
|---|---|---|
| `from:` | `from:calendly` | Sender contains |
| `to:` | `to:zac@stayful.co.uk` | Recipient contains |
| `subject:` | `subject:"booking confirmed"` | Subject contains |
| `is:unread` | `is:unread` | Unread only |
| `is:starred` | `is:starred` | Starred only |
| `has:attachment` | `has:attachment` | Has any attachment |
| `after:` | `after:2024/01/01` | Date after (YYYY/MM/DD) |
| `before:` | `before:2024/12/31` | Date before |
| `newer_than:` | `newer_than:1d` | Last N days/h/m |
| `older_than:` | `older_than:7d` | Older than N days/h/m |
| `label:` | `label:inbox` | Label filter |
| `-` | `from:calendly -subject:cancel` | Negate |

Combine with spaces (AND) or `OR` (case-sensitive):

```
q=from:calendly OR from:eventbrite is:unread newer_than:1d
```

Test queries by pasting into `mail.google.com/mail/u/0/#search/<query>` first.

---

## OAuth scopes

n8n's default `googleOAuth2Api` scopes include `gmail.readonly` and `gmail.modify` (enough for read + mark-as-read + label changes). For send, you need `gmail.send` — check the credential's scope list before debugging a 403.

---

## Marking as read / labeling

After processing a message, mark it as read so the next poll doesn't re-pick it:

```
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify

Body (JSON):
{ "removeLabelIds": ["UNREAD"] }
```

Or apply a custom label:

```
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify

Body (JSON):
{ "addLabelIds": ["Label_1234567890"] }
```

Look up label IDs via `GET /users/me/labels`.

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| 401 | OAuth token expired or credential type wrong | Re-run OAuth flow; confirm `googleOAuth2Api` (not `gmailOAuth2`) for HTTP Request |
| 403 | Insufficient OAuth scope | Re-pick credential with broader scope (`gmail.modify`, `gmail.send`) |
| Empty `messages` array | Query syntax wrong, or no matches | Test the `q` string at `mail.google.com/mail/u/0/#search/…` |
| 429 | Rate-limited (250 quota units/user/sec) | Bump Schedule interval to 5–15 min, batch processing |
| `messages` returns same items each poll | Not marking as read after processing | Add the `modify` call to remove `UNREAD` label |
| Body comes back empty | Looking at the wrong `parts` MIME type | Try `text/plain` and `text/html`; some emails only have one |

---

## Why the native nodes fail via SDK

Both `n8n-nodes-base.gmailTrigger` and `n8n-nodes-base.gmail` (send) require pre-assigned OAuth credentials to validate at SDK-load time. The MCP can't pre-assign, so `create_workflow_from_code` 500s on these nodes ([Rule 1](../Core-Principles.md#rule-1)).

If you genuinely need the native Gmail trigger (e.g. for instant push notifications instead of polling), use the [JSON-import fallback](../Core-Principles.md#rule-1b).

---

## Cross-links

- Rules: [1](../Core-Principles.md#rule-1), [1b](../Core-Principles.md#rule-1b)
- Recipes: [01-Gmail-to-Monday-Search-and-Update](../Quick-Recipes/01-Gmail-to-Monday-Search-and-Update.md)
- Known values: [Google OAuth](../Known-Values-Registry.md#google-oauth)
