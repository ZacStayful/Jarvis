# 03 — Anthropic API Call

> Call Claude from inside an n8n workflow. Three things that bite: `max_tokens` typing, `messages` building, and stripping markdown fences from JSON responses.
>
> Rules in play: [Rule 1](../Core-Principles.md#rule-1) (HTTP only — no native Anthropic node), [Rule 15](../Core-Principles.md#rule-15) (string concatenation in expressions).
> Services: [Anthropic-Claude](../Services/Anthropic-Claude.md).

---

## Use case

Use Claude for classification, summarisation, lead enrichment, transcript analysis, etc. inside a workflow. Common pattern: take an inbound payload, feed it to Claude with a strict JSON schema in the prompt, parse the JSON, route on the result.

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node |
|---|---|---|
| 1 | Trigger (webhook / manual / schedule) | trigger ✅ |
| 2 | Prepare prompt + JSON-encode messages | `n8n-nodes-base.code` ✅ |
| 3 | Call Anthropic | `n8n-nodes-base.httpRequest` ✅ |
| 4 | Strip markdown fences + JSON.parse | `n8n-nodes-base.code` ✅ |
| 5 | Downstream branching on parsed result | IF / switch nodes |

---

## Prep messages Code node (step 2)

Anthropic's `messages` field is an array. Build it via `JSON.stringify` so the HTTP body's expression engine doesn't try to interpret it:

```js
const prompt = `You are classifying lead intent. Reply with ONLY JSON in this shape:
{ "intent": "qualified" | "warm" | "dead", "confidence": 0-1, "reason": "…" }

Lead email body:
"""
${$input.item.json.body}
"""

Start your response with { and end with }.`;

const messages = [
  { role: 'user', content: prompt }
];

return { json: { messagesJson: JSON.stringify(messages) } };
```

Mode: `runOnceForEachItem`.

---

## Anthropic HTTP Request (step 3)

```
URL:    https://api.anthropic.com/v1/messages
Method: POST
Auth:   Header Auth (Anthropic key credential — Authorization: Bearer ...)
Send Headers: enabled
  anthropic-version: 2023-06-01

Send Body: enabled, JSON
```

### Body — pay attention to the typing

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": "={{ 200 }}",
  "messages": "={{ JSON.parse($json.messagesJson) }}"
}
```

Three things that will bite if you get them wrong:

1. **`max_tokens` must be an integer expression**: `"={{ 200 }}"`, **not** the string `"200"`. Anthropic rejects the string form with 400.
2. **`messages` must be parsed back to an array**: `"={{ JSON.parse($json.messagesJson) }}"` — the body engine will JSON-stringify the result of the expression, so re-parsing gives Anthropic a real array.
3. **`anthropic-version` header is required**: `2023-06-01`. Without it, you get a 400.

See [Rule 15](../Core-Principles.md#rule-15) about string concat in `expr()` if you're driving this via SDK.

---

## Parse response Code node (step 4) — markdown fence stripping

Claude will *sometimes* wrap JSON in ` ```json … ``` ` fences even when you tell it not to. Strip before parsing:

```js
const response = $input.item.json;
const raw = response.content[0].text;

const cleaned = raw
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch (err) {
  return { json: { error: 'parse_failed', raw, cleaned } };
}

return { json: parsed };
```

The prompt instruction *"Start your response with { and end with }"* reduces but does not eliminate fences — always strip defensively.

---

## Known values

| Item | Value |
|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Version header | `anthropic-version: 2023-06-01` |
| Auth | `Authorization: Bearer <key>` via Header Auth |
| Model (current) | `claude-sonnet-4-20250514` (verify in [Services/Anthropic-Claude.md](../Services/Anthropic-Claude.md)) |

---

## Test pin data

Pin on the trigger:

```json
{ "body": "Subject: Re: stayful presentation. Body: Hi, looks great — when can we book a call?" }
```

Expected output of step 4 (after parse):

```json
{ "intent": "qualified", "confidence": 0.92, "reason": "Asking to book a call" }
```

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| 400 *"max_tokens: Input should be a valid integer"* | `max_tokens` is a string | Use `"={{ 200 }}"` not `"200"` |
| 400 *"messages must be a list"* | The body engine isn't re-parsing | Use `"={{ JSON.parse($json.messagesJson) }}"` |
| `SyntaxError: Unexpected token \`` | Claude wrapped JSON in markdown fences | Strip with the cleanup regex above |
| 401 | Wrong header or wrong key | Check Header Auth fields ([Rule 4](../Core-Principles.md#rule-4)) |
| 429 | Rate-limited | Add Wait node; check current tier limits |
| Empty `content[0].text` | Hit `max_tokens` mid-response | Bump `max_tokens`; consider shorter prompt |
