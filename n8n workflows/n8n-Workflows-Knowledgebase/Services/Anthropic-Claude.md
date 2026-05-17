# Anthropic / Claude

> Call Claude directly via HTTP Request — Stayful workflows use Claude for classification, summarisation, lead enrichment, and HTML action plan generation.
>
> Native n8n node: ❌ does not exist — HTTP Request only ([Rule 1](../Core-Principles.md#rule-1)).

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
  "model": "claude-sonnet-4-6",
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
| `claude-sonnet-4-6` | **Default for Stayful workflows** — fast, capable, cost-effective |
| `claude-opus-4-7` | Highest capability — use for complex reasoning or long HTML generation |
| `claude-haiku-4-5-20251001` | Fastest / cheapest — use when latency matters and task is simple |

> Default to `claude-sonnet-4-6` unless there is a specific reason to use a different model. For the web meeting action plan generation, `claude-sonnet-4-6` or `claude-opus-4-7` is recommended given the complexity of the HTML output. Verify model IDs against [Known-Values-Registry#anthropic](../Known-Values-Registry.md#anthropic) — Anthropic deprecates older model IDs periodically.

---

## Response structure

```json
{
  "id": "msg_01ABC…",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "{\n  \"intent\": \"qualified\",\n …\n}" }
  ],
  "model": "claude-sonnet-4-6",
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

## HTML output — stripping for GitHub commits

When asking Claude to generate a full HTML document (e.g. action plans):

```js
const raw = $input.item.json.content[0].text;

// Strip markdown fences if present (Claude may wrap HTML in ```html ... ```)
const html = raw
  .replace(/```html\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

// html should now start with <!DOCTYPE html> and end with </html>
```

Include in the prompt: *"Output ONLY the HTML document. Start with `<!DOCTYPE html>` and end with `</html>`. No markdown fences, no commentary."*

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

## Stayful branding prompt snippet

For action plan HTML generation, include this branding context in the prompt:

```
Stayful branding:
- Primary colour: #5d8156
- Logo: <img src="https://drive.google.com/uc?export=view&id=1iMvb6qZcCEtUl6IXW_pC9-qfzvQwtuP_" alt="Stayful" style="max-width:200px">
- Company: UK short-term letting management company
- Tone: professional, warm, expert
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
| `SyntaxError: Unexpected token \`` | Claude wrapped JSON in markdown fences | Strip with the cleanup regex above |
| HTML output contains fences | Claude added ```html fences | Strip with `.replace(/\`\`\`html\n?/g, '').replace(/\`\`\`\n?/g, '')` |

---

## Cross-links

- Recipes: [03-Anthropic-API-Call](../Quick-Recipes/03-Anthropic-API-Call.md), [07-Web-Meeting-Processing](../Quick-Recipes/07-Web-Meeting-Processing.md)
- Rules: [Rule 1](../Core-Principles.md#rule-1) (HTTP only), [Rule 15](../Core-Principles.md#rule-15) (string concat in expr)
- Patterns: [System-Patterns#anthropic-pattern](../System-Patterns.md#anthropic-pattern)
- Known values: [Known-Values-Registry#anthropic](../Known-Values-Registry.md#anthropic)
