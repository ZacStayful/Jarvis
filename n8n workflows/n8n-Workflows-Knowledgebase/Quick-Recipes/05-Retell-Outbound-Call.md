# 05 — Retell Outbound Call (Lucy)

> Trigger Lucy to call a lead, pre-loaded with property context fetched from the Vercel endpoint.
>
> Rules in play: [Rule 14](../Core-Principles.md#rule-14) (E.164 phone), [Rule 5](../Core-Principles.md#rule-5) (known Lucy agent ID).
> Services: [Retell-AI](../Services/Retell-AI.md), [Monday.com](../Services/Monday.com.md).

---

## Use case

Auto-dial a qualified lead with a personalised pitch. Lucy (the Retell agent) reads the property context fetched from the Stayful Vercel endpoint during the call.

This is the workflow that powers WF1 (`z0OzQ2qYVCOJVlvE`).

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node |
|---|---|---|
| 1 | Trigger (Monday status change → Qualified) | `n8n-nodes-base.webhook` ✅ + [challenge handler](02-Monday-Webhook-Challenge-Echo.md) |
| 2 | Extract lead phone + Monday item ID | `n8n-nodes-base.code` ✅ |
| 3 | Sanitize phone to E.164 | `n8n-nodes-base.code` ✅ |
| 4 | Fetch property data from Vercel | `n8n-nodes-base.httpRequest` ✅ |
| 5 | Build Retell call payload | `n8n-nodes-base.set` ✅ |
| 6 | Trigger Retell call | `n8n-nodes-base.httpRequest` ✅ |
| 7 | (optional) Update Monday with call ID | `n8n-nodes-base.httpRequest` (Monday GraphQL) ✅ |

---

## Vercel property fetch (step 4)

```
URL:    https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app/api/property-data
Method: POST
Send Body: enabled, JSON
{
  "monday_item_id": {{ $('Extract').item.json.monday_item_id }}
}
```

The endpoint returns property context (address, property type, expected revenue, owner notes) that Lucy reads from the call's `metadata`.

---

## Retell call request (step 6)

```
URL:    https://api.retellai.com/v2/create-phone-call
Method: POST
Auth:   Header Auth — Authorization: Bearer <Retell key>
Send Body: enabled, JSON
```

```json
{
  "from_number": "{{ $env.RETELL_FROM_NUMBER }}",
  "to_number": "{{ $('Sanitize').item.json.phone }}",
  "override_agent_id": "agent_82f187b32e8f5e7913da1c506f",
  "retell_llm_dynamic_variables": {
    "lead_first_name": "{{ $('Extract').item.json.first_name }}",
    "property_address": "{{ $('Property Fetch').item.json.address }}",
    "property_type": "{{ $('Property Fetch').item.json.property_type }}",
    "annual_revenue_estimate": "{{ $('Property Fetch').item.json.annual_revenue }}"
  },
  "metadata": {
    "monday_item_id": "{{ $('Extract').item.json.monday_item_id }}",
    "source": "n8n-WF1"
  }
}
```

`retell_llm_dynamic_variables` are interpolated into the agent's system prompt as `{{ lead_first_name }}`, etc. — this is how Lucy gets contextualized per call.

---

## Known values

| Item | Value | Where |
|---|---|---|
| Lucy agent ID | `agent_82f187b32e8f5e7913da1c506f` | [Registry](../Known-Values-Registry.md#retell) |
| Retell endpoint | `https://api.retellai.com/` | [Registry](../Known-Values-Registry.md#retell) |
| Vercel property endpoint | `https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app/api/property-data` | [Registry](../Known-Values-Registry.md#vercel) |
| Twilio UK from-number (fallback for Retell) | `+447426947296` | [Registry](../Known-Values-Registry.md#twilio) |

Retell `from_number` is configured on the Retell side — confirm in Retell dashboard before publishing.

---

## Phone sanitization

Same as [Recipe 04 step 2](04-Twilio-SMS.md#phone-sanitization-code-node-step-2--rule-14):

```js
let phone = phoneRaw.replace(/[^0-9+]/g, '');
if (phone.startsWith('0')) phone = '+44' + phone.slice(1);
else if (phone.startsWith('44')) phone = '+' + phone;
else if (!phone.startsWith('+')) phone = '+' + phone;
```

---

## Test pin data

Pin on the trigger:

```json
{
  "type": "webhook",
  "webhookData": {
    "body": {
      "event": {
        "type": "update_column_value",
        "boardId": 5891626711,
        "pulseId": 12345,
        "columnId": "status5",
        "value": { "label": { "text": "Qualified lead", "index": 13 } }
      }
    },
    "method": "POST"
  }
}
```

Pin on the Vercel fetch (mock response):

```json
{
  "address": "12 Example Road, London, SW1A 1AA",
  "property_type": "2-bed flat",
  "annual_revenue": "£28,500"
}
```

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| Call fails with `agent not found` | Lucy agent ID wrong or agent not published in Retell | Re-confirm `agent_82f187b32e8f5e7913da1c506f` and publish in Retell |
| 400 `invalid phone number` | Phone not E.164 | Run sanitizer ([Rule 14](../Core-Principles.md#rule-14)) |
| 401 | Wrong bearer token | Re-pick Header Auth credential ([Rule 4](../Core-Principles.md#rule-4)) |
| Lucy reads "undefined" during the call | Dynamic variable name typo or upstream node didn't fill it | Check `retell_llm_dynamic_variables` against the agent's prompt template |
| Workflow fires repeatedly on the same lead | Webhook scoped to wrong column or no idempotency check | Scope to `status5` only ([Rule 9](../Core-Principles.md#rule-9)); add a check that the new status equals "Qualified lead" before calling |

---

## Pre-publish checklist (WF1)

- [ ] Retell `from_number` confirmed in Retell dashboard
- [ ] Vercel property endpoint returns 200 for a known `monday_item_id`
- [ ] Lucy agent published in Retell (not draft)
- [ ] Monday webhook registered + scoped to `status5`
- [ ] MCP access enabled on this workflow ([Rule 13](../Core-Principles.md#rule-13))
- [ ] Tested with pin data — Retell call ID returned in step 6 response
- [ ] Published ([Rule 6](../Core-Principles.md#rule-6))
