# 07 — Web Meeting Processing

> After a lead's web meeting, wait for the Granola transcript, generate a branded HTML action plan, commit it to GitHub (auto-deployed via Vercel), update Monday, and create a Gmail draft. If there is no transcript, set status to no-show. If GitHub fails, email the HTML to Zac as a fallback.
>
> Rules in play: [Rule 8](../Core-Principles.md#rule-8) (Monday challenge), [Rule 9](../Core-Principles.md#rule-9) (scoped webhook), [Rule 10](../Core-Principles.md#rule-10) (empty array filter), [Rule 11](../Core-Principles.md#rule-11) (current Monday GraphQL), [Rule 16](../Core-Principles.md#rule-16) (single trigger = single workflow).
> Services: [Monday.com](../Services/Monday.com.md), [Granola](../Services/Granola.md), [Anthropic-Claude](../Services/Anthropic-Claude.md), [GitHub](../Services/GitHub.md), [Vercel](../Services/Vercel.md), [Gmail](../Services/Gmail.md).

---

## ⚠️ Build status

| Section | Status | Blocker |
|---|---|---|
| Nodes 1–8 (trigger → wait) | ✅ Buildable now | None |
| Node 9 (Granola transcript check) | ❌ Blocked | Granola has no HTTP API — see [Services/Granola.md](../Services/Granola.md) |
| Nodes 10–20 (action plan → Monday → Gmail) | ⏳ Designed, not yet built | Depends on Node 9 |

**Next step when Granola releases an API:** implement Node 9 using the pattern in [Services/Granola.md](../Services/Granola.md), then build Nodes 10–20 in sequence. The design for all nodes is fully documented below so the workflow can be completed in one session once the blocker clears.

**Current next step (unblocked):** Test GitHub API auth in n8n using Header Auth account 6 (GitHub PAT) — this validates the credential before building the full workflow.

---

## Use case

A lead's web meeting is booked (status = "Web meeting booked" on the Management Leads board). Once the meeting occurs, this workflow:

1. Waits 45 minutes after the scheduled meeting start time.
2. Queries Granola for a transcript. *(blocked — no API yet)*
3. **If no transcript** → marks lead as "Web meeting no show" on Monday.
4. **If transcript found** → Claude generates a branded HTML action plan → committed to GitHub → Vercel auto-deploys → Monday updated (status, offer fields, action plan link) → Granola summary posted as Monday comment → Gmail draft created.
5. **If GitHub commit fails** → fallback email to `zac@stayful.co.uk` with HTML attached.

---

## Monday automation setup (before workflow)

Create **one** webhook automation in Monday's Integrate panel ([Rule 9](../Core-Principles.md#rule-9)):

- **Recipe:** "When a specific column changes, send a webhook"
- **Column:** `status5` (Status)
- **Condition:** when status changes to **"Web meeting booked"** (label ID 108)
- **URL:** the n8n production webhook URL for this workflow

---

## Full node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node | Status |
|---|---|---|---|
| 1 | Receive Monday webhook | `n8n-nodes-base.webhook` ✅ | Buildable |
| 2 | Monday challenge echo | IF + Code + respondToWebhook ✅ | Buildable |
| 3 | Filter: status = "Web meeting booked" | `n8n-nodes-base.if` ✅ | Buildable |
| 4 | Get full lead record from Monday | HTTP Request (GraphQL) ✅ | Buildable |
| 5 | Extract lead fields | `n8n-nodes-base.code` ✅ | Buildable |
| 6 | Query Google Calendar for meeting | HTTP Request ✅ | Buildable |
| 7 | Calculate wait time (start + 45 min) | `n8n-nodes-base.code` ✅ | Buildable |
| 8 | Wait until T+45 | `n8n-nodes-base.wait` ✅ | Buildable |
| 9 | Query Granola for transcript | HTTP Request | ❌ Blocked — no API |
| 10 | Branch: transcript found? | `n8n-nodes-base.if` | ⏳ Pending Node 9 |
| 11a | NO-SHOW: Update Monday status | HTTP Request (GraphQL) | ⏳ Pending |
| 11b | Get full Granola transcript | HTTP Request | ⏳ Pending Node 9 |
| 12 | Build Anthropic prompt | `n8n-nodes-base.code` | ⏳ Pending |
| 13 | Call Anthropic Claude | HTTP Request | ⏳ Pending |
| 14 | Parse response + build filename + base64 | `n8n-nodes-base.code` | ⏳ Pending |
| 15 | Commit HTML to GitHub | HTTP Request | ⏳ Pending |
| 16 | Branch: GitHub success? | `n8n-nodes-base.if` | ⏳ Pending |
| 17a | GITHUB FAIL: Gmail draft to Zac (HTML attached) | HTTP Request | ⏳ Pending |
| 17b | Build Vercel URL | `n8n-nodes-base.code` | ⏳ Pending |
| 18 | Update Monday (status + offer + link) | HTTP Request (GraphQL) | ⏳ Pending |
| 19 | Post Granola summary as Monday comment | HTTP Request (GraphQL) | ⏳ Pending |
| 20 | Create Gmail draft (lead follow-up) | HTTP Request | ⏳ Pending |

---

## Node-by-node detail

### Node 1 — Webhook Trigger

```ts
{
  type: 'n8n-nodes-base.webhook',
  parameters: {
    httpMethod: 'POST',
    path: 'monday-web-meeting',
    responseMode: 'responseNode',  // REQUIRED for challenge echo (Rule 8)
    options: {}
  }
}
```

---

### Nodes 2a–2c — Monday Challenge Echo ([Rule 8](../Core-Principles.md#rule-8))

**IF node:**
```
Condition: {{ $json.body.challenge }}
Operation: exists (string type, not empty)
```

**Code node (TRUE branch — exact body):**
```js
return { challenge: $input.item.json.body.challenge };
```

**Respond to Webhook node:**
```ts
{ parameters: { respondWith: 'firstIncomingItem', options: {} } }
```

---

### Node 3 — Filter: Status = "Web meeting booked"

Monday fires on any `status5` change. Filter in n8n:

```
IF: {{ $json.body.event.value.label.index }} equals 108
```

Using label index (more robust against renames). FALSE branch → stop (no output).

---

### Node 4 — Get Full Lead Record from Monday

Extract `pulseId` from the webhook event, then query the full item:

```
URL: https://api.monday.com/v2
Method: POST
Auth: Header Auth account 4
Headers:
  Content-Type: application/json
  API-Version: 2024-10

Body:
{
  "query": "{ items(ids: [{{ $json.body.event.pulseId }}]) { id name column_values { id text value } } }"
}
```

---

### Node 5 — Extract Lead Fields (Code node)

```js
const items = $input.item.json.data.items;
if (!items || items.length === 0) return [];  // Rule 10

const item = items[0];
const cols = {};
for (const col of item.column_values) {
  cols[col.id] = col.text;
}

const fullName = item.name.trim();
const nameParts = fullName.split(' ');
const firstName = nameParts[0] || '';
const lastName = nameParts[nameParts.length - 1] || '';
const email = (cols['text_mkygb5xx'] || '').toLowerCase().trim();

return [{
  json: {
    item_id: item.id,
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: cols['phone_mm1hp0a8'] || '',
    property_type: cols['text_mm2qhtqa'] || ''
  }
}];
```

---

### Node 6 — Query Google Calendar

Find the meeting event by searching for the lead's email as an attendee. Uses `googleOAuth2Api` credential (same as Gmail HTTP Requests — see [Services/Gmail.md](../Services/Gmail.md)).

```
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
  ?q={{ $json.email }}
  &timeMin={{ $now.toISO() }}
  &timeMax={{ $now.plus({days: 7}).toISO() }}
  &singleEvents=true
  &orderBy=startTime
Auth: predefinedCredentialType googleOAuth2Api
```

Extract `items[0].start.dateTime` as the meeting start time.

> **Alternative:** If the meeting start time was already stored in Monday at booking time (e.g. from Calendly), skip this node and read from the Monday column directly. Verify against the actual workflow data.

---

### Node 7 — Calculate Wait Time (Code node)

```js
const meetingStart = new Date($input.item.json.meeting_start_iso);
const waitUntil = new Date(meetingStart.getTime() + 45 * 60 * 1000);

return [{
  json: {
    ...$input.item.json,
    meeting_start_iso: meetingStart.toISOString(),
    wait_until: waitUntil.toISOString()
  }
}];
```

---

### Node 8 — Wait Node

```ts
{
  type: 'n8n-nodes-base.wait',
  parameters: {
    resume: 'specificTime',
    dateTime: '={{ $json.wait_until }}'
  }
}
```

Workflow pauses here and resumes automatically at `wait_until`.

---

### Node 9 — Query Granola ❌ BLOCKED

**Cannot be built — Granola has no HTTP API.**

See [Services/Granola.md](../Services/Granola.md) for the intended design and what to do when the API ships.

When the API becomes available, this node will be:

```
GET <Granola base URL>/v1/meetings?attendee_email={{ $json.email }}&after={{ $json.meeting_start_iso }}
Auth: Granola Bearer credential
```

---

### Node 10 — Branch: Transcript Found?

```
IF: {{ $json.meetings[0].id }} exists (string type, not empty)
FALSE → Node 11a (no-show)
TRUE  → Node 11b (transcript path)
```

---

### Node 11a — No-Show: Update Monday Status

```graphql
mutation {
  change_multiple_column_values(
    board_id: 5891626711,
    item_id: {{ $json.item_id }},
    column_values: "{\"status5\": {\"label\": \"Web meeting no show\"}}"
  ) { id }
}
```

> **TODO:** Add "Web meeting no show" label ID to [Known-Values-Registry.md](../Known-Values-Registry.md) once confirmed.

---

### Node 11b — Get Full Granola Transcript

```
GET <Granola base URL>/v1/meetings/{{ $json.meetings[0].id }}/transcript
Auth: Granola Bearer credential
```

---

### Node 12 — Build Anthropic Prompt (Code node)

```js
const lead = $input.item.json;
const transcript = lead.transcript || lead.content || '';

const prompt = `You are generating a branded post-meeting action plan for Stayful, a UK short-term letting management company.

Lead name: ${lead.full_name}
Lead email: ${lead.email}
Property type: ${lead.property_type || 'not specified'}

Meeting transcript:
"""
${transcript.substring(0, 6000)}
"""

Generate a professional, branded HTML action plan page. Requirements:
- Stayful brand colour: #5d8156
- Logo: <img src="https://drive.google.com/uc?export=view&id=1iMvb6qZcCEtUl6IXW_pC9-qfzvQwtuP_" alt="Stayful" style="max-width:200px">
- Include: personalised summary of the meeting, key next steps, relevant Stayful services discussed
- Professional, clean layout with inline CSS (no external stylesheets)
- Must be a complete, self-contained HTML document

Also output a JSON metadata block BEFORE the HTML, separated by the string ---METADATA---:
{
  "status": "Warm" or "Special offer applied",
  "special_offer": "<offer description or empty string>",
  "offer_expiry_days": <number of days, e.g. 14>
}

Format your full response as:
---METADATA---
{ ...json... }
---HTML---
<!DOCTYPE html>...`;

return [{ json: { ...lead, transcript, messagesJson: JSON.stringify([{ role: 'user', content: prompt }]) } }];
```

---

### Node 13 — Call Anthropic Claude (HTTP Request)

```
URL: https://api.anthropic.com/v1/messages
Method: POST
Auth: Header Auth (Anthropic API key credential)
Headers:
  anthropic-version: 2023-06-01

Body:
{
  "model": "claude-sonnet-4-6",
  "max_tokens": "={{ 4096 }}",
  "messages": "={{ JSON.parse($json.messagesJson) }}"
}
```

`max_tokens` must be an integer expression ([Services/Anthropic-Claude.md](../Services/Anthropic-Claude.md)).

---

### Node 14 — Parse Response + Prepare for GitHub (Code node)

```js
const raw = $input.item.json.content[0].text;

// Split on the delimiters from the prompt
const metadataPart = raw.split('---METADATA---')[1]?.split('---HTML---')[0]?.trim() || '{}';
const htmlPart = raw.split('---HTML---')[1]?.trim() || raw;

// Strip any stray markdown fences
const html = htmlPart
  .replace(/```html\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

// Parse metadata
let metadata = {};
try {
  const cleanedMeta = metadataPart
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  metadata = JSON.parse(cleanedMeta);
} catch (e) {
  metadata = { status: 'Warm', special_offer: '', offer_expiry_days: 14 };
}

const firstName = ($input.item.json.first_name || '').toLowerCase().replace(/\s+/g, '-');
const lastName = ($input.item.json.last_name || '').toLowerCase().replace(/\s+/g, '-');
const filename = `${firstName}-${lastName}-action-plan.html`;
const githubPath = `leads/${filename}`;
const vercelUrl = `https://action-plans-theta.vercel.app/leads/${filename}`;
const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');

// Offer expiry date
const expiryDays = metadata.offer_expiry_days || 14;
const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
const expiryDateStr = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD

return [{
  json: {
    ...$input.item.json,
    html_content: html,
    content_base64: contentBase64,
    filename,
    github_path: githubPath,
    vercel_url: vercelUrl,
    commit_message: `Add action plan for ${$input.item.json.full_name}`,
    new_status: metadata.status || 'Warm',
    special_offer: metadata.special_offer || '',
    offer_expiry_date: expiryDateStr,
    granola_summary: transcript  // will be posted as Monday comment
  }
}];
```

---

### Node 15 — Commit HTML to GitHub (HTTP Request)

```
URL: https://api.github.com/repos/ZacStayful/web-meeting-action-plans/contents/{{ $json.github_path }}
Method: PUT
Auth: Header Auth account 6
Headers:
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28

Body:
{
  "message": "={{ $json.commit_message }}",
  "content": "={{ $json.content_base64 }}"
}
```

Enable **Continue on Fail** on this node so the IF in Node 16 can check the status code.

See [Services/GitHub.md](../Services/GitHub.md) for SHA requirement if file already exists (422 handling).

---

### Node 16 — Branch: GitHub Success?

```
IF: {{ $json.commit?.sha }} exists (string type, not empty)
```

Or if Continue on Fail is enabled and the node emits the HTTP status:
```
IF: {{ $json.statusCode }} equals 201
```

FALSE → Node 17a (fallback to Zac)
TRUE  → Node 17b (success path)

---

### Node 17a — Fallback: Gmail Draft to Zac (GitHub failed)

Build an RFC 2822 email with the HTML attached, then POST to Gmail drafts API:

```js
// Code node
const lead = $input.item.json;
const boundary = 'boundary_' + Date.now();

const message = [
  `To: zac@stayful.co.uk`,
  `Subject: [ACTION PLAN FALLBACK] ${lead.full_name} — GitHub commit failed`,
  `MIME-Version: 1.0`,
  `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ``,
  `--${boundary}`,
  `Content-Type: text/plain`,
  ``,
  `GitHub commit failed for ${lead.full_name}'s action plan. HTML file is attached.`,
  ``,
  `--${boundary}`,
  `Content-Type: text/html; name="${lead.filename}"`,
  `Content-Disposition: attachment; filename="${lead.filename}"`,
  `Content-Transfer-Encoding: base64`,
  ``,
  lead.content_base64,
  `--${boundary}--`
].join('\r\n');

const rawBase64 = Buffer.from(message).toString('base64url');
return [{ json: { ...lead, raw_message: rawBase64 } }];
```

Then HTTP Request:
```
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
Auth: predefinedCredentialType googleOAuth2Api
Body: { "message": { "raw": "={{ $json.raw_message }}" } }
```

---

### Node 17b — (Success path continues)

No transformation needed here. Data from Node 14 flows directly to Node 18.

---

### Node 18 — Update Monday (Batch Mutation)

```graphql
mutation {
  cols: change_multiple_column_values(
    board_id: 5891626711,
    item_id: {{ $json.item_id }},
    column_values: "={{ JSON.stringify({
      status5: { label: $json.new_status },
      text_mm3aw1t8: $json.vercel_url,
      dropdown_mm0wabga: { labels: [$json.special_offer] },
      date_mm0wdvyx: { date: $json.offer_expiry_date }
    }) }}"
  ) { id }
}
```

**Column IDs used:**
- `status5` — Status ("Warm" or "Special offer applied")
- `text_mm3aw1t8` — Post meeting action plan link (Vercel URL)
- `dropdown_mm0wabga` — Special offer dropdown
- `date_mm0wdvyx` — Offer expiry date

Build the `column_values` JSON in a Code node for clarity:

```js
const columnValues = {
  status5: { label: $input.item.json.new_status },
  text_mm3aw1t8: $input.item.json.vercel_url,
  date_mm0wdvyx: { date: $input.item.json.offer_expiry_date }
};

// Only include dropdown if an offer is specified
if ($input.item.json.special_offer) {
  columnValues.dropdown_mm0wabga = { labels: [$input.item.json.special_offer] };
}

return [{ json: { ...$input.item.json, column_values_json: JSON.stringify(columnValues) } }];
```

---

### Node 19 — Post Granola Summary as Monday Comment

```graphql
mutation {
  create_update(
    item_id: {{ $json.item_id }},
    body: "{{ $json.granola_summary }}"
  ) { id }
}
```

This posts the full meeting summary to Monday as an item update (no character limit, unlike the `long_text_mm231qgr` column which caps at ~2,000 chars).

---

### Node 20 — Create Gmail Draft (Lead Follow-up)

```js
// Code node — build RFC 2822 message
const lead = $input.item.json;

const bodyHtml = [
  `<p>Hi ${lead.first_name},</p>`,
  `<p>Thank you for joining our call today. As discussed, here is your personalised Stayful action plan:</p>`,
  `<p><a href="${lead.vercel_url}" style="color:#5d8156;font-weight:bold;">View your Stayful Action Plan →</a></p>`,
  `<p>If you have any questions, please don't hesitate to get in touch.</p>`,
  `<p>Best regards,<br>Zac<br>Stayful</p>`
].join('\n');

const message = [
  `To: ${lead.email}`,
  `Subject: Your Stayful Action Plan — next steps`,
  `MIME-Version: 1.0`,
  `Content-Type: text/html`,
  ``,
  bodyHtml
].join('\r\n');

const rawBase64 = Buffer.from(message).toString('base64url');
return [{ json: { ...lead, raw_message: rawBase64 } }];
```

```
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
Auth: predefinedCredentialType googleOAuth2Api
Body: { "message": { "raw": "={{ $json.raw_message }}" } }
```

---

## Known values

| Item | Value |
|---|---|
| Board ID | `5891626711` |
| Email column | `text_mkygb5xx` |
| Status column | `status5` |
| "Web meeting booked" label ID | `108` |
| Post meeting action plan link column | `text_mm3aw1t8` |
| Special offer dropdown column | `dropdown_mm0wabga` |
| Offer expiry date column | `date_mm0wdvyx` |
| Web meeting transcript column | `long_text_mm231qgr` (capped ~2,000 chars) |
| GitHub repo | `ZacStayful/web-meeting-action-plans` |
| GitHub credential | Header Auth account 6 |
| Vercel URL base | `https://action-plans-theta.vercel.app` |
| Stayful brand colour | `#5d8156` |
| Monday GraphQL endpoint | `https://api.monday.com/v2` |
| Monday credential | Header Auth account 4 |
| Monday API version header | `API-Version: 2024-10` |

---

## Test pin data

### Pin 1 — Challenge verification

```json
{
  "type": "webhook",
  "webhookData": {
    "body": { "challenge": "test-challenge-abc123" },
    "method": "POST"
  }
}
```

### Pin 2 — Real event (status = "Web meeting booked")

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
        "value": {
          "label": { "text": "Web meeting booked", "index": 108 }
        }
      }
    },
    "method": "POST"
  }
}
```

### Pin 3 — Monday item response (Node 4)

```json
{
  "data": {
    "items": [{
      "id": "12345",
      "name": "Test Lead",
      "column_values": [
        { "id": "text_mkygb5xx", "text": "test@example.com", "value": "" },
        { "id": "phone_mm1hp0a8", "text": "+447700900123", "value": "" },
        { "id": "text_mm2qhtqa", "text": "2-bed flat", "value": "" }
      ]
    }]
  }
}
```

### Pin 4 — GitHub success response (Node 15)

```json
{
  "content": { "name": "test-lead-action-plan.html", "path": "leads/test-lead-action-plan.html", "sha": "abc123" },
  "commit": { "sha": "def456", "message": "Add action plan for Test Lead" }
}
```

---

## Post-creation checklist

- [ ] Enable MCP access in workflow settings ([Rule 13](../Core-Principles.md#rule-13))
- [ ] Re-pick credentials on all HTTP Request nodes after any `update_workflow` call ([Rule 1c](../Core-Principles.md#rule-1c))
- [ ] Create the Monday webhook automation in Integrate panel, scoped to `status5` ([Rule 9](../Core-Principles.md#rule-9))
- [ ] Test GitHub API auth first using Header Auth account 6 before building the full workflow
- [ ] Test with pin data for BOTH the challenge path and the real event path ([Rule 6](../Core-Principles.md#rule-6))
- [ ] Publish only after a successful test run ([Rule 6](../Core-Principles.md#rule-6))
- [ ] Build Node 9 (Granola) only once Granola releases an HTTP API — see [Services/Granola.md](../Services/Granola.md)

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| Webhook never fires | Challenge handler missing or Monday automation not created | Check [Recipe 02](02-Monday-Webhook-Challenge-Echo.md); create automation in Monday Integrate panel |
| Filter drops all events | Wrong label index path | Confirm `$json.body.event.value.label.index` = `108` |
| Monday item not found | `pulseId` path wrong | `$json.body.event.pulseId` |
| Wait node doesn't resume | `wait_until` not valid ISO 8601 | Log value in Code node; ensure `new Date(...).toISOString()` format |
| Anthropic 400 max_tokens | String instead of expression | `"={{ 4096 }}"` not `"4096"` |
| GitHub 422 missing SHA | File already exists at path | GET file first to retrieve SHA ([Services/GitHub.md](../Services/GitHub.md)) |
| Gmail draft fails | Wrong credential type | Use `googleOAuth2Api`, NOT `gmailOAuth2` |
| Credentials stripped after update | `update_workflow` footgun | Re-pick all credentials in UI ([Rule 1c](../Core-Principles.md#rule-1c)) |
