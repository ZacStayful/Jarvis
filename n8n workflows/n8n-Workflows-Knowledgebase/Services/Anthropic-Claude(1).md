# Anthropic / Claude

> Call Claude directly via HTTP Request — Stayful workflows use Claude for classification, summarisation, lead enrichment.

---

## Endpoint & auth

| Item | Value |
|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Method | POST |
| Version header | `anthropic-version: 2023-06-01` |
| Auth | Header Auth credential — `Authorization: Bearer <key>` |
| Content-Type | `application/json` |

The Header Auth credential's Name field must be `Authorization`; the Value should be `Bearer sk-ant-…` (include the `Bearer ` prefix in the value).

---

## Request structure

```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": "={{ 200 }}",
  "system": "You are…",
  "messages": "={{ JSON.parse($json.messagesJson) }}"
}
```

### Field rules

1. **`max_tokens` is an integer expression** — `"={{ 200 }}"` not `"200"`. Anthropic 400s on string form.
2. **`messages` must be a JSON array** — build it via `JSON.stringify(...)` in an upstream Code node, reference as `={{ JSON.parse($json.messagesJson) }}` to get a real array back.
3. **`system` is a top-level string field**, not part of messages.

### Messages format

```js
const messages = [
  { role: 'user', content: 'First user turn' },
  { role: 'assistant', content: 'Assistant reply (for multi-turn)' },
  { role: 'user', content: 'Follow-up' }
];
```

Always start with `user`. For single-shot calls, one entry is enough.

---

## Models

| Model ID | Use |
|---|---|
| `claude-sonnet-4-20250514` | Default for Stayful workflows — fast + cheap + plenty smart for classification |
| `claude-opus-4-7` | When you need the smartest model — slower + more expensive |
| `claude-haiku-4-5-20251001` | When latency matters more than nuance |

Default to Claude Sonnet 4.6+ unless there's a reason. Verify model IDs are current — Anthropic deprecates older ones occasionally.

---

## Response structure

```json
{
  "id": "msg_01ABC…",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "{\n  \"intent\": \"qualified\",\n  …\n}" }
  ],
  "model": "claude-sonnet-4-20250514",
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 234, "output_tokens": 42 }
}
```

Access the text via `$json.content[0].text`.

---

## JSON parsing workaround — markdown fence stripping

Claude sometimes wraps JSON in markdown fences even when prompted not to. Always strip before parsing:

```js
const raw = $input.item.json.content[0].text;

const cleaned = raw
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

try {
  return { json: JSON.parse(cleaned) };
} catch (err) {
  return { json: { error: 'parse_failed', raw, cleaned } };
}
```

Prompt instruction *"Start your response with `{` and end with `}`. Do not wrap in code fences."* reduces but does not eliminate the wrapping — strip defensively.

---

## System prompts & prompt engineering

- **Be specific about output format.** Provide an exact JSON schema in the prompt.
- **Use `<example>` and `</example>` tags** for few-shot. Claude responds reliably to XML-like tags.
- **Constrain length explicitly.** *"Reply in fewer than 80 words"* works better than *"keep it brief"*.
- **For classification tasks, provide the enum.** *"Reply with one of: `qualified`, `warm`, `dead`."*

Example system prompt for lead classification:

```
You are classifying inbound lead emails for Stayful, a UK short-term letting management company.

For each email, output ONLY JSON of this shape:
{ "intent": "qualified" | "warm" | "dead", "confidence": <0-1>, "reason": "<one sentence>" }

Definitions:
- qualified: asks to book a call, asks pricing, expresses clear intent to use Stayful
- warm: replied but ambiguous, asked a clarifying question, expressed mild interest
- dead: not interested, unsubscribe request, out-of-office, irrelevant

Start your response with { and end with }. Do not wrap in code fences.
```

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| 400 *"max_tokens must be a valid integer"* | `max_tokens` is a string | `"={{ 200 }}"` not `"200"` |
| 400 *"messages must be a list"* | Body engine isn't re-parsing the JSON | `={{ JSON.parse($json.messagesJson) }}` |
| 400 *"anthropic-version: required"* | Missing version header | Send `anthropic-version: 2023-06-01` |
| 401 | Wrong key, or Value field has placeholder string in it | Check Header Auth Value ([Rule 4](../Core-Principles.md#rule-4)) |
| 429 | Rate-limited (tier-dependent) | Add Wait node before retry, split into multiple calls |
| `SyntaxError` on `JSON.parse` | Markdown fence wrapping | Strip with regex above |
| Empty `content[0].text` or stops mid-sentence | Hit `max_tokens` mid-response | Bump max_tokens, or shorten prompt |
| `Authorization: Bearer Bearer …` (double prefix) | Header Auth Value already includes "Bearer " AND the SDK adds another | Decide one source-of-truth; usually keep "Bearer " in the credential Value |

---

## Cross-links

- Rules: [1](../Core-Principles.md#rule-1), [15](../Core-Principles.md#rule-15)
- Recipes: [03-Anthropic-API-Call](../Quick-Recipes/03-Anthropic-API-Call.md)
- Patterns: [Anthropic pattern](../System-Patterns.md#anthropic-pattern)
- Known values: [Anthropic](../Known-Values-Registry.md#anthropic)
