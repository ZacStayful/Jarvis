# 04 — Twilio SMS

> Send an SMS from a workflow. The two pitfalls: E.164 sanitization and the Ofcom regulatory bundle for UK numbers.
>
> Rules in play: [Rule 14](../Core-Principles.md#rule-14) (phone sanitization), [Rule 1](../Core-Principles.md#rule-1) / [1b](../Core-Principles.md#rule-1b) (native Twilio node fails via SDK — use HTTP or JSON-import).
> Services: [Twilio](../Services/Twilio.md).

---

## Use case

Send a templated SMS to a lead — booking reminder, follow-up nudge, custom outreach. From the Stayful UK number.

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node |
|---|---|---|
| 1 | Trigger (webhook from Monday / Calendly / manual) | trigger ✅ |
| 2 | Sanitize phone to E.164 | `n8n-nodes-base.code` ✅ |
| 3 | Build message body | `n8n-nodes-base.set` ✅ |
| 4 | Send via Twilio | `n8n-nodes-base.httpRequest` ✅ (or JSON-import native node — [Rule 1b](../Core-Principles.md#rule-1b)) |

---

## Phone sanitization Code node (step 2) — [Rule 14](../Core-Principles.md#rule-14)

```js
const phoneRaw = $input.item.json.cols?.['phone_mm1hp0a8']
  || $input.item.json.phone
  || '';

// Strip everything except digits and +
let phone = phoneRaw.replace(/[^0-9+]/g, '');

// UK normalization: 07… → +447…, 447… → +447…
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

return { json: { phone, ...$input.item.json } };
```

---

## Twilio HTTP Request (step 4)

```
URL:    https://api.twilio.com/2010-04-01/Accounts/{{ACCOUNT_SID}}/Messages.json
Method: POST
Auth:   Basic Auth — Account SID as username, Auth Token as password
        (Twilio also accepts the native credential — but see Rule 1 for SDK creation)
Send Body: enabled, Form-Data (application/x-www-form-urlencoded)

Body parameters:
  From:  +447426947296
  To:    {{ $json.phone }}
  Body:  {{ $json.message }}
```

Note: form-urlencoded, **not** JSON. Twilio's `/Messages.json` accepts URL-encoded form data despite the `.json` suffix (which only affects the response format).

### Why HTTP and not the native Twilio node

The native `n8n-nodes-base.twilio` node 500s on `create_workflow_from_code` ([Rule 1](../Core-Principles.md#rule-1)). Two paths:

1. **HTTP Request** — universal, works via SDK. Use Basic Auth.
2. **JSON-import** — drop a pre-built workflow JSON onto the canvas via the UI, then re-pick credentials. See [Rule 1b](../Core-Principles.md#rule-1b).

For most cases HTTP is enough.

---

## Known values

| Item | Value | Where |
|---|---|---|
| From number (UK mobile) | `+447426947296` | [Registry](../Known-Values-Registry.md#twilio) |
| Endpoint | `https://api.twilio.com/2010-04-01/Accounts/.../Messages.json` | [Registry](../Known-Values-Registry.md#twilio) |
| Phone column on Management Leads | `phone_mm1hp0a8` | [Registry](../Known-Values-Registry.md#monday-management-leads) |

---

## Test pin data

Pin on the trigger:

```json
{
  "body": {
    "name": "Test Lead",
    "phone": "07700 900123",
    "message": "Hi Test Lead, this is Stayful — your viewing is confirmed for Thursday at 2pm."
  }
}
```

Sanitized output of step 2:

```json
{ "phone": "+447700900123", "name": "Test Lead", "message": "..." }
```

---

## Regulatory bundle (UK) — [Rule 14](../Core-Principles.md#rule-14)

To send SMS from a UK Twilio number you need an **Ofcom regulatory bundle** approved:

- Passport (photo ID)
- UK proof of address (utility bill, bank statement)
- Submitted in Twilio Console → Regulatory Compliance → Bundles
- 1–3 business days for approval

While the bundle is pending, sends will fail with error code **`21649`** (or similar). That's a Twilio account issue, not a workflow issue — there is no n8n-side fix.

Confirm bundle status before debugging the workflow.

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| 400 *"To" parameter is invalid* | Phone not E.164 | Run sanitizer ([Rule 14](../Core-Principles.md#rule-14)) |
| `21649` regulatory error | Ofcom bundle not approved | Account-side fix; wait for approval |
| 401 | Wrong Account SID / Auth Token | Confirm credential values |
| Native Twilio node 500 on creation | SDK incompatibility | HTTP workaround or JSON-import ([Rules 1, 1b](../Core-Principles.md#rule-1)) |
| Message sends but to wrong number | Phone field wrong path | Check `{{ $json.phone }}` vs `{{ $json.body.phone }}` ([Common gotcha](../Core-Principles.md#common-gotcha-webhook-query-params-vs-body-fields)) |
