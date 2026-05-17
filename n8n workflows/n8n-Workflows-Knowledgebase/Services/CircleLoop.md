# CircleLoop

> Cloud phone system. **No native n8n node exists** — integration is webhook-only on both directions (inbound events + outbound API calls).

---

## Integration model

Two patterns:

| Direction | Pattern |
|---|---|
| **CircleLoop → n8n** | `n8n-nodes-base.webhook` trigger; CircleLoop POSTs events |
| **n8n → CircleLoop** | `n8n-nodes-base.httpRequest` outbound to CircleLoop API |

There is no native node, so HTTP + webhook are the only paths — that's not a workaround, it's the actual design.

---

## Inbound: webhook receive

Configure CircleLoop's webhook settings to POST to an n8n production URL on events like:

| Event | Trigger |
|---|---|
| `call.received` | Inbound call answered |
| `call.missed` | Inbound call rang but went to voicemail |
| `call.ended` | Any call completed |
| `sms.received` | Inbound SMS |

n8n side:

```ts
{
  type: 'n8n-nodes-base.webhook',
  parameters: {
    httpMethod: 'POST',
    path: 'circleloop-events',
    responseMode: 'onReceived',
    options: {}
  }
}
```

No challenge handshake (CircleLoop doesn't send one).

---

## Outbound: API call

```
URL:    https://api.circleloop.com/v1/<endpoint>
Method: POST / GET / etc.
Auth:   Header Auth — API key in header
Send Headers: enabled
  X-API-Key: <key>
```

The exact header name varies by tenant — confirm with CircleLoop admin. Stayful's credential should already exist in n8n with the right setup; look it up via `n8n:search_workflows` ([Rule 4](../Core-Principles.md#rule-4)).

---

## Common operations

- **Send SMS** via CircleLoop instead of Twilio if the use case wants the CircleLoop number to be the sender (so replies route back into CircleLoop's inbox).
- **Initiate outbound call** programmatically — but Stayful's outbound voice goes through Retell, not CircleLoop.
- **Lookup contact** by phone — useful when an inbound webhook lacks the lead identity.

Exact endpoint paths and payload shapes: refer to CircleLoop's API docs (account-specific) — there is no Stayful-standard endpoint list yet. Add one to this file as the integration solidifies.

---

## Common integrations

- **Inbound call from a known lead** → update Monday "Lead Last Response" date (`date_mm1nmb17`) + add a comment via `create_update`.
- **Missed call** → trigger a Twilio SMS apology with a Calendly booking link.
- **New SMS reply** → forward to Slack channel for human follow-up.

---

## Common errors & fixes

| Failure | Cause | Fix |
|---|---|---|
| Webhook never fires | URL not saved in CircleLoop, or saved as test URL | Confirm production URL in CircleLoop dashboard |
| 401 on outbound | Wrong API key header name | Check the Name field on the Header Auth credential ([Rule 4](../Core-Principles.md#rule-4)) |
| Inbound event has no lead context | CircleLoop event payload only carries phone + timestamp | Add a Monday lookup step keyed on phone (`phone_mm1hp0a8` column) |

---

## Test payload

A representative inbound event (adjust to CircleLoop's exact shape — verify in the n8n executions log on first real event):

```json
{
  "type": "webhook",
  "webhookData": {
    "body": {
      "event": "call.received",
      "data": {
        "from": "+447700900123",
        "to": "+441234567890",
        "duration_seconds": 45,
        "timestamp": "2026-05-14T08:30:00Z"
      }
    },
    "method": "POST"
  }
}
```

---

## Cross-links

- Rules: [1](../Core-Principles.md#rule-1) (HTTP-only integration is by design here, not a workaround)
- Services: [Monday.com](Monday.com.md), [Twilio](Twilio.md), [Slack](Slack.md)
