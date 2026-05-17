# Retell AI

> Lucy — Stayful's outbound voice agent. Drives lead-qualifying phone calls with property context pre-loaded from the Vercel endpoint.

---

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | `https://api.retellai.com/` |
| Create-call endpoint | `POST /v2/create-phone-call` |
| Auth | Header Auth — `Authorization: Bearer <Retell API key>` |
| Content-Type | `application/json` |

---

## Lucy agent

| Item | Value |
|---|---|
| Agent ID | `agent_82f187b32e8f5e7913da1c506f` |
| Purpose | Outbound calls to qualified leads on the Management Leads board |
| From number | Configured on the Retell side — confirm in Retell dashboard before publishing a workflow |

Agent ID is permanent unless re-created. Store as a constant in workflows — no need to look it up dynamically.

---

## Create call — request structure

```json
{
  "from_number": "<configured on Retell side>",
  "to_number": "{{ $json.phone }}",
  "override_agent_id": "agent_82f187b32e8f5e7913da1c506f",
  "retell_llm_dynamic_variables": {
    "lead_first_name": "Test Lead",
    "property_address": "12 Example Road, London",
    "property_type": "2-bed flat",
    "annual_revenue_estimate": "£28,500"
  },
  "metadata": {
    "monday_item_id": "12345",
    "source": "n8n-WF1"
  }
}
```

### Dynamic variables

`retell_llm_dynamic_variables` interpolates into the agent's system prompt as `{{ lead_first_name }}`, etc. This is how Lucy gets contextualized per call without rewriting the prompt.

Make sure variable names in the workflow match exactly what the agent prompt expects — Lucy will read "undefined" out loud if a variable is missing.

### Metadata

`metadata` is opaque to Retell — it's returned on webhooks and call lookups. Use it to round-trip the Monday item ID so you can update the row when the call completes.

---

## Response

```json
{
  "call_id": "call_abc123…",
  "call_status": "registered",
  "agent_id": "agent_82f187b32e8f5e7913da1c506f",
  "from_number": "…",
  "to_number": "+447700900123"
}
```

`call_id` is the handle for everything downstream (status polling, transcript, recording).

---

## Property data injection — Vercel endpoint

Lucy gets property context from a Vercel-hosted API:

```
POST https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app/api/property-data

{ "monday_item_id": 12345 }
```

Returns:

```json
{
  "address": "12 Example Road, London, SW1A 1AA",
  "property_type": "2-bed flat",
  "annual_revenue": "£28,500",
  "owner_notes": "Wants to know about regulatory compliance"
}
```

### Why Vercel and not inline lookup

- Single source of truth for "what does Lucy know about this property" — easier to update without touching workflows.
- Lucy's agent prompt expects a stable schema — Vercel enforces it.
- Lower coupling between n8n workflow and Retell agent.

The endpoint URL changes when the Vercel deployment ID changes — confirm against [Known-Values-Registry#vercel](../Known-Values-Registry.md#vercel) before publishing.

---

## Call status polling

```
GET https://api.retellai.com/v2/get-call/{call_id}
Auth: Bearer …
```

Status values: `registered`, `ongoing`, `ended`. Transcript is available after `ended`.

For most workflows, polling is unnecessary — set up a Retell **webhook** to notify n8n when the call ends.

---

## Webhook events (set up in Retell dashboard)

| Event | When |
|---|---|
| `call_started` | Call connected |
| `call_ended` | Call completed (use this to update Monday) |
| `call_analyzed` | Post-call analysis ready (transcript + sentiment + tags) |

Hook these to a separate n8n workflow that updates the Monday row + writes a summary to the `long_text_mm231qgr` transcript column.

---

## Transcript retrieval

After `call_analyzed`, the transcript is at:

```
GET /v2/get-call/{call_id} → response.transcript
GET /v2/get-call/{call_id} → response.transcript_object  (structured)
```

The Monday `long_text_mm231qgr` column caps at ~2000 chars. For longer transcripts, summarise into the column and store the full transcript as an item update (`create_update`) — see [Services/Monday.com.md](Monday.com.md#long-text-caps).

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| 400 *invalid phone number* | Phone not E.164 | Sanitize ([Rule 14](../Core-Principles.md#rule-14)) |
| 401 | Wrong bearer token | Re-pick Header Auth credential ([Rule 4](../Core-Principles.md#rule-4)) |
| 404 *agent not found* | Lucy not published in Retell, or wrong agent ID | Verify `agent_82f187b32e8f5e7913da1c506f` and confirm agent is published in Retell dashboard |
| Call connects but Lucy says "undefined" | Dynamic variable name mismatch | Check `retell_llm_dynamic_variables` keys vs agent prompt placeholders |
| Call fails immediately | `from_number` not configured on Retell side | Set the from number in Retell dashboard; restart workflow |
| Workflow fires repeatedly for the same lead | No idempotency check | Add IF: skip if status already changed or call already exists |

---

## Cross-links

- Recipes: [05-Retell-Outbound-Call](../Quick-Recipes/05-Retell-Outbound-Call.md)
- Known values: [Retell](../Known-Values-Registry.md#retell), [Vercel](../Known-Values-Registry.md#vercel)
- Services: [Monday.com](Monday.com.md) (for the Monday update after call ends), [Twilio](Twilio.md) (regulatory context, since Retell uses telephony underneath)
