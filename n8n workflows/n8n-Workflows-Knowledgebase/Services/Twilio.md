# Twilio

> SMS and voice. The native `n8n-nodes-base.twilio` node 500s on SDK creation ([Rule 1](../Core-Principles.md#rule-1)) — use HTTP Request or [JSON-import](../Core-Principles.md#rule-1b).

---

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | `https://api.twilio.com/2010-04-01` |
| SMS endpoint | `/Accounts/{AccountSID}/Messages.json` |
| Method | POST |
| Auth | Basic Auth — Account SID as username, Auth Token as password |
| Content-Type | `application/x-www-form-urlencoded` (NOT JSON, despite the `.json` URL suffix) |
| From number (UK mobile) | `+447426947296` |

> The `.json` suffix on the URL only affects the response format — the request body is still form-urlencoded.

---

## E.164 format requirement ([Rule 14](../Core-Principles.md#rule-14))

Twilio strictly requires E.164: `+<country_code><number>` with no spaces, no formatting chars, no leading zeros.

| Input | Output |
|---|---|
| `07700 900123` | `+447700900123` |
| `+44 7700 900123` | `+447700900123` |
| `447700900123` | `+447700900123` |
| `7700900123` | `+447700900123` (assume UK) |
| `(212) 555-0100` | `+12125550100` (assume US — only if Stayful expands) |

### Sanitization snippet

```js
const phoneRaw = cols['phone_mm1hp0a8'] || '';
let phone = phoneRaw.replace(/[^0-9+]/g, '');

if (phone.startsWith('0')) {
  phone = '+44' + phone.slice(1);
} else if (phone.startsWith('44')) {
  phone = '+' + phone;
} else if (!phone.startsWith('+')) {
  phone = '+' + phone;
}

if (!/^\+\d{10,15}$/.test(phone)) {
  return { json: { error: 'invalid_phone', input: phoneRaw } };
}
```

---

## Send SMS — HTTP Request

```
URL:    https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json
Method: POST
Auth:   Basic Auth (Account SID + Auth Token)

Send Body: enabled, Form-Data:
  From:  +447426947296
  To:    {{ $json.phone }}
  Body:  {{ $json.message }}
```

Response includes a `sid` (message ID) and a `status` (queued, sent, delivered, failed, etc.).

---

## Voice (basic — for Retell, see Retell-AI.md)

Twilio voice is rarely used directly by Stayful — voice goes through Retell. Documented here for completeness:

```
POST /Accounts/{AccountSID}/Calls.json
  From=+447426947296
  To=+447700900123
  Url=https://your-twiml-url.example.com/voice.xml
```

---

## Regulatory bundle (UK) — critical

UK Twilio numbers require an approved **Ofcom regulatory bundle** before SMS can be sent. Without it, sends fail with error code **`21649`** (or similar).

### Requirements

- Photo ID (passport)
- UK proof of address (recent utility bill / bank statement)
- Submit via Twilio Console → Phone Numbers → Regulatory Compliance → Bundles
- **Approval takes 1–3 business days**

While pending, every SMS send fails. There is no n8n-side fix — it's a Twilio account issue. Confirm bundle status in the Twilio Console before debugging the workflow.

---

## Why the native node fails via SDK

`n8n-nodes-base.twilio` expects pre-assigned credentials at SDK-load time. The MCP can't provide that, so `create_workflow_from_code` 500s on the node. ([Rule 1](../Core-Principles.md#rule-1))

Workarounds, in order of preference:
1. **HTTP Request + Basic Auth** — universal, no UI step needed.
2. **JSON-import** — drop pre-built workflow JSON onto the canvas via UI ([Rule 1b](../Core-Principles.md#rule-1b)), credential pick manually. Use when native node UX is genuinely needed.

---

## Common errors & fixes

| Error code | Cause | Fix |
|---|---|---|
| `21211` | `To` parameter invalid | Sanitize phone to E.164 ([Rule 14](../Core-Principles.md#rule-14)) |
| `21408` | Permission to send to this region | Enable destination country in Twilio Console |
| `21610` | Recipient unsubscribed via STOP | No workflow fix — recipient must reply START |
| `21614` | Phone number is not a valid mobile number | Verify the destination phone |
| `21649` | UK regulatory bundle not approved | Wait for Ofcom bundle approval; no n8n-side fix |
| 401 | Wrong Account SID / Auth Token | Re-pick credential ([Rule 4](../Core-Principles.md#rule-4)) |
| 500 on SDK node creation | Native node SDK incompatibility | HTTP workaround or JSON-import ([Rules 1, 1b](../Core-Principles.md#rule-1)) |
| Message status `failed` after send | Various — see `error_code` on the response | Look up error code in Twilio docs |

---

## Test payloads

```json
{
  "phone": "+447700900123",
  "message": "Hi Test Lead, this is Stayful — your viewing is confirmed for Thursday at 2pm."
}
```

Successful response:

```json
{
  "sid": "SMabcdef0123456789",
  "status": "queued",
  "to": "+447700900123",
  "from": "+447426947296",
  "body": "Hi Test Lead, …",
  "date_created": "2026-05-14T08:00:00Z"
}
```

---

## Cross-links

- Rules: [1](../Core-Principles.md#rule-1), [1b](../Core-Principles.md#rule-1b), [14](../Core-Principles.md#rule-14)
- Recipes: [04-Twilio-SMS](../Quick-Recipes/04-Twilio-SMS.md)
- Patterns: [Phone sanitization](../System-Patterns.md#phone-sanitization)
- Known values: [Twilio](../Known-Values-Registry.md#twilio)
