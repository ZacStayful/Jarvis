# Calendly

> Web-meeting bookings. Inbound via Calendly webhook to an n8n Webhook trigger — no native node, no challenge handshake (that's Monday-only), just a straight POST.

---

## Webhook setup

In Calendly:

1. Org settings → Webhooks → Create Webhook Subscription.
2. URL: the n8n production webhook URL (`https://stayful.app.n8n.cloud/webhook/<your-path>`).
3. Events: subscribe to `invitee.created` (and optionally `invitee.canceled`, `routing_form_submission`).
4. Save.

Calendly does NOT require a challenge handshake on registration (unlike Monday). Once the URL is saved, events flow.

---

## Event types

| Event | When |
|---|---|
| `invitee.created` | A new booking happens |
| `invitee.canceled` | Booking cancelled |
| `routing_form_submission` | Calendly routing form completed (before scheduling) |

---

## Webhook payload structure (`invitee.created`)

```json
{
  "event": "invitee.created",
  "payload": {
    "name": "Test Lead",
    "email": "test@example.com",
    "questions_and_answers": [
      { "question": "Phone number", "answer": "07700 900123", "position": 0 }
    ],
    "tracking": {
      "utm_source": "n8n",
      "utm_campaign": "outbound-2026q2"
    },
    "scheduled_event": {
      "name": "Stayful Discovery Call",
      "start_time": "2026-05-21T14:00:00.000000Z",
      "end_time": "2026-05-21T14:30:00.000000Z",
      "event_type": "https://api.calendly.com/event_types/abc",
      "location": { "type": "google_conference", "join_url": "https://meet.google.com/…" }
    }
  }
}
```

### Field paths inside n8n

After the Webhook trigger, the body is at `$json.body.…`:

| Field | Path |
|---|---|
| Invitee email | `{{ $json.body.payload.email }}` |
| Invitee name | `{{ $json.body.payload.name }}` |
| Phone (from custom Q) | `{{ $json.body.payload.questions_and_answers[0].answer }}` |
| Start time (ISO 8601 UTC) | `{{ $json.body.payload.scheduled_event.start_time }}` |
| Event name | `{{ $json.body.payload.scheduled_event.name }}` |
| Meeting link | `{{ $json.body.payload.scheduled_event.location.join_url }}` |

Always `.toLowerCase().trim()` the email before searching Monday — text columns are case-sensitive.

---

## Webhook trigger config in n8n

```ts
{
  type: 'n8n-nodes-base.webhook',
  parameters: {
    httpMethod: 'POST',
    path: 'calendly-booking',
    responseMode: 'onReceived',
    options: {}
  }
}
```

- `responseMode: 'onReceived'` — Calendly doesn't read the response body, just needs a 200.
- No challenge handler needed (Calendly does not send one).

---

## Common integrations

- **Update Monday status** to "Web meeting booked" on `invitee.created`. See [Quick-Recipes/06-Calendly-Webhook-Booking.md](../Quick-Recipes/06-Calendly-Webhook-Booking.md).
- **Send confirmation SMS** via Twilio with the meeting link. See [Quick-Recipes/04-Twilio-SMS.md](../Quick-Recipes/04-Twilio-SMS.md).
- **Trigger Retell** for a reminder call 24h before the meeting (separate workflow with a Schedule Trigger that queries Monday for bookings in the next 24h).
- **Cancel: revert Monday status** on `invitee.canceled` — same workflow shape but updating status to "Warm" or similar.

---

## Timezones

Calendly emits `start_time` and `end_time` in **UTC** (Z suffix). For Stayful, convert to UK time in n8n if displaying to humans:

```js
const utc = new Date($input.item.json.body.payload.scheduled_event.start_time);
const ukTime = utc.toLocaleString('en-GB', { timeZone: 'Europe/London' });
return { json: { uk_time: ukTime } };
```

---

## Duplicate bookings

Calendly retries on non-200 responses. If your workflow takes >5s to respond, Calendly may resend. Two mitigations:

1. **Respond fast.** Use `responseMode: 'onReceived'` so the webhook returns 200 before downstream nodes finish.
2. **Idempotency in the downstream.** Add an IF: skip if Monday status is already "Web meeting booked" for the same email.

---

## Common errors & fixes

| Failure | Cause | Fix |
|---|---|---|
| Webhook never fires | Wrong URL registered in Calendly (test URL vs production URL) | Use the production URL `/webhook/<path>`, not `/webhook-test/<path>` |
| Duplicate Monday updates per booking | Calendly retried because workflow took >5s | Set `responseMode: 'onReceived'`, add idempotency IF |
| Phone is missing | The custom question wasn't asked on this event type | Check the event type config in Calendly; questions are per event type |
| Email lookup fails on Monday | Case mismatch | `.toLowerCase().trim()` before search |
| `start_time` shows wrong time | Timezone confusion (UTC vs local) | Calendly always sends UTC `Z`; convert downstream for display |

---

## Test payload

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
          "start_time": "2026-05-21T14:00:00.000000Z",
          "end_time": "2026-05-21T14:30:00.000000Z",
          "location": { "type": "google_conference", "join_url": "https://meet.google.com/abc-defg-hij" }
        }
      }
    },
    "method": "POST"
  }
}
```

---

## Cross-links

- Recipes: [06-Calendly-Webhook-Booking](../Quick-Recipes/06-Calendly-Webhook-Booking.md)
- Services: [Monday.com](Monday.com.md), [Twilio](Twilio.md)
- Rules: [11](../Core-Principles.md#rule-11) (Monday GraphQL for the downstream update)
