# 07 — Web Meeting Processing

> After a lead's web meeting, wait for the Granola transcript, generate a branded HTML action plan, commit it to GitHub (auto-deployed via Vercel), update Monday, and create a Gmail draft. If there is no transcript, set status to no-show. If GitHub fails, email the HTML to Zac as a fallback.
>
> Rules in play: [Rule 8](../Core-Principles.md#rule-8) (Monday challenge), [Rule 9](../Core-Principles.md#rule-9) (scoped webhook), [Rule 10](../Core-Principles.md#rule-10) (empty array filter), [Rule 11](../Core-Principles.md#rule-11) (current Monday GraphQL), [Rule 16](../Core-Principles.md#rule-16) (single trigger = single workflow).
> Services: [Monday.com](../Services/Monday.com.md), [Granola](../Services/Granola.md), [Anthropic-Claude](../Services/Anthropic-Claude.md), [GitHub](../Services/GitHub.md), [Vercel](../Services/Vercel.md), [Gmail](../Services/Gmail.md).

---

## Use case

A lead's web meeting is booked (status = "Web meeting booked" on the Management Leads board). Once the meeting occurs, this workflow:

1. Waits 45 minutes after the scheduled meeting start time.
2. Queries Granola for a transcript.
3. **If no transcript** → marks lead as "Web meeting no show" on Monday.
4. **If transcript found** → Claude generates a branded HTML action plan → committed to GitHub → Vercel auto-deploys → Monday updated (status, offer fields, action plan link) → Granola summary posted as Monday comment → Gmail draft created.
5. **If GitHub commit fails** → fallback email to `zac@stayful.co.uk` with HTML attached.

---

## Monday automation setup (before workflow)

Create **one** webhook automation in Monday's Integrate panel:

- **Recipe:** "When a specific column changes, send a webhook"
- **Column:** `status5` (Status)
- **Condition:** when status changes to **"Web meeting booked"** (label ID 108)
- **URL:** the n8n production webhook URL for this workflow

This is a scoped webhook ([Rule 9](../Core-Principles.md#rule-9)) — it only fires on the specific column change, not on every edit.

---

## Node map ([Rule 3](../Core-Principles.md#rule-3))

| # | Step | Node | Notes |
|---|---|---|---|
| 1 | Receive Monday webhook | `n8n-nodes-base.webhook` ✅ | `responseMode: 'responseNode'` required |
| 2 | Monday challenge echo | `n8n-nodes-base.if` + `n8n-nodes-base.code` + `n8n-nodes-base.respondToWebhook` ✅ | Rule 8 — must be first |
| 3 | Filter: status = "Web meeting booked" | `n8n-nodes-base.if` ✅ | Filter in n8n, not Monday |
| 4 | Get full lead record from Monday | `n8n-nodes-base.httpRequest` ✅ | GraphQL — items by ID |
| 5 | Extract lead fields | `n8n-nodes-base.code` ✅ | name, email, meeting time |
| 6 | Query Google Calendar for meeting | `n8n-nodes-base.httpRequest` ✅ | Find scheduled event, get start time |
| 7 | Calculate wait time | `n8n-nodes-base.code` ✅ | start_time + 45 min |
| 8 | Wait until T+45 | `n8n-nodes-base.wait` ✅ | `resumeAt` = ISO datetime |
| 9 | Query Granola for transcript | `n8n-nodes-base.httpRequest` ✅ | Search by attendee email |
| 10 | Branch: transcript found? | `n8n-nodes-base.if` ✅ | |
| **NO-SHOW BRANCH** | | | |
| 11a | Update Monday: "Web meeting no show" | `n8n-nodes-base.httpRequest` ✅ | GraphQL mutation |
| **TRANSCRIPT BRANCH** | | | |
| 11b | Get full Granola transcript | `n8n-nodes-base.httpRequest` ✅ | |
| 12 | Build Anthropic prompt | `n8n-nodes-base.code` ✅ | Include transcript + lead data |
| 13 | Call Anthropic Claude | `n8n-nodes-base.httpRequest` ✅ | Generate branded HTML |
| 14 | Parse response + build filename | `n8n-nodes-base.code` ✅ | Strip fences, base64 encode |
| 15 | Commit HTML to GitHub | `n8n-nodes-base.httpRequest` ✅ | PUT to web-meeting-action-plans |
| 16 | Branch: GitHub success? | `n8n-nodes-base.if` ✅ | Check HTTP status 200/201 |
| **GITHUB FAIL BRANCH** | | | |
| 17a | Create Gmail draft (fallback) | `n8n-nodes-base.httpRequest` ✅ | HTML attached, to zac@stayful.co.uk |
| **GITHUB SUCCESS BRANCH** | | | |
| 17b | Build Vercel URL | `n8n-nodes-base.code` ✅ | action-plans-theta.vercel.app/leads/FILE |
| 18 | Update Monday (status + offer + link) | `n8n-nodes-base.httpRequest` ✅ | Batch GraphQL mutation |
| 19 | Post Granola summary as Monday comment | `n8n-nodes-base.httpRequest` ✅ | create_update mutation |
| 20 | Create Gmail draft (action plan link) | `n8n-nodes-base.httpRequest` ✅ | Draft to lead |

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

**IF node (check challenge):**
```
Condition: {{ $json.body.challenge }}
Operation: exists (or "is not empty", string type)
```

**Code node (TRUE branch):**
```js
return { challenge: $input.item.json.body.challenge };
```

**Respond to Webhook node:**
```ts
{ parameters: { respondWith: 'firstIncomingItem', options: {} } }
```

---

### Node 3 — Filter: Status = "Web meeting booked"

Monday sends a webhook for every status5 change. Filter inside n8n:

```
IF: {{ $json.body.event.value.label.text }} equals "Web meeting booked"
```

Or using label index (more robust against renames):
```
IF: {{ $json.body.event.value.label.index }} equals 108
```

FALSE branch → stop (no output, workflow ends silently).

---

### Node 4 — Get Full Lead Record from Monday

The webhook payload contains `pulseId` (the Monday item ID). Query the full record:

```graphql
{
  items(ids: [PULSE_ID]) {
    id
    name
    column_values {
      id
      text
      value
    }
  }
}
```

HTTP Request config:
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

Find the meeting event by searching for the lead's email as an attendee around the expected meeting time. Use `googleOAuth2Api` credential ([Gmail.md](../Services/Gmail.md) — same credential type).

```
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
  ?q={lead_email}
  &timeMin={today_iso}
  &timeMax={today_plus_7_days_iso}
  &singleEvents=true
  &orderBy=startTime
Auth: predefinedCredentialType googleOAuth2Api
```

Extract the first result's `start.dateTime` as the meeting start time.

**Code to build query params:**
```js
const now = new Date();
const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
return [{
  json: {
    ...$input.item.json,
    timeMin: now.toISOString(),
    timeMax: weekLater.toISOString()
  }
}];
```

> **Note:** If the meeting time is already stored on the Monday item (from Calendly booking), you can skip this Google Calendar query and use the Monday column value directly. Verify against the actual workflow.

---

### Node 7 — Calculate Wait Time (Code node)

```js
const meetingStart = new Date($input.item.json.meeting_start_iso);
// Wait until 45 minutes after meeting start
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

The workflow pauses here. When `wait_until` is reached, execution resumes automatically.

---

### Node 9 — Query Granola (HTTP Request)

Search for the lead's meeting by email. See [Services/Granola.md](../Services/Granola.md) for the exact endpoint — confirm from working workflow via `n8n:search_workflows({ query: "granola" })`.

```
URL: <Granola base URL>/v1/meetings?attendee_email={{ $json.email }}&after={{ $json.meeting_start_iso }}
Method: GET
Auth: Granola Header Auth Bearer credential
```

---

### Node 10 — Branch: Transcript Found?

```
IF: {{ $json.meetings[0].id }} exists (string type, not empty)
```

**FALSE (no meetings array or empty)** → No-show branch (Node 11a)
**TRUE** → Transcript branch (Node 11b onward)

---

### Node 11a — No-Show: Update Monday Status

```graphql
mutation {
  change_multiple_column_values(
    board_id: 5891626711,
    item_id: ITEM_ID,
    column_values: "{\"status5\": {\"label\": \"Web meeting no show\"}}"
  ) { id }
}
```

> Confirm the exact label text for "no show" — add it to [Known-Values-Registry](../Known-Values-Registry.md#monday-management-leads) once confirmed.

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
const transcript = $input.item.json.transcript || $input.item.json.content || '';

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

Output ONLY the HTML document. Start with <!DOCTYPE html> and end with </html>. No markdown fences.`;

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
  Content-Type: application/json

Body:
{
  "model": "claude-sonnet-4-6",
  "max_tokens": "={{ 4096 }}",
  "messages": "={{ JSON.parse($json.messagesJson) }}"
}
```

`max_tokens` must be an integer expression, not a string ([Services/Anthropic-Claude.md](../Services/Anthropic-Claude.md)).

---

### Node 14 — Parse Response + Prepare for GitHub (Code node)

```js
const raw = $input.item.json.content[0].text;

// Strip markdown fences if Claude added them (Rule — see Anthropic-Claude.md)
const html = raw
  .replace(/```html\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

const firstName = $input.item.json.first_name.toLowerCase().replace(/\s+/g, '-');
const lastName = $input.item.json.last_name.toLowerCase().replace(/\s+/g, '-');
const filename = `${firstName}-${lastName}-action-plan.html`;
const githubPath = `leads/${filename}`;
const vercelUrl = `https://action-plans-theta.vercel.app/leads/${filename}`;

const contentBase64 = Buffer.from(html, 'utf-8').toString('base64');
const commitMessage = `Add action plan for ${$input.item.json.full_name}`;

return [{
  json: {
    ...$input.item.json,
    html_content: html,
    content_base64: contentBase64,
    filename,
    github_path: githubPath,
    vercel_url: vercelUrl,
    commit_message: commitMessage
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
  Authorization: Bearer <PAT>
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28
  Content-Type: application/json

Body:
{
  "message": "={{ $json.commit_message }}",
  "content": "={{ $json.content_base64 }}"
}
```

See [Services/GitHub.md](../Services/GitHub.md) for the SHA requirement when updating existing files.

---

### Node 16 — Branch: GitHub Success?

```
IF: {{ $json.commit.sha }} exists (string type, not empty)
```

OR check by HTTP status code (set "Continue on Fail" on the GitHub node, then IF on `$json.statusCode`):

```
IF: {{ $json.statusCode }} equals 200 OR 201
```

**FALSE** → Node 17a (fallback email to Zac)
**TRUE** → Node 17b (success path)

---

### Node 17a — Fallback: Gmail Draft to Zac (GitHub failed)

Create a Gmail draft with the HTML file attached. Use `googleOAuth2Api` credential.

```
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
Auth: predefinedCredentialType googleOAuth2Api

Body:
{
  "message": {
    "raw": "<base64-encoded RFC 2822 message>"
  }
}
```

Build the RFC 2822 message in a Code node:

```js
const lead = $input.item.json;
const htmlBase64 = lead.content_base64;
const filename = lead.filename;
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
  `GitHub commit failed for ${lead.full_name}'s action plan. HTML is attached.`,
  ``,
  `--${boundary}`,
  `Content-Type: text/html; name="${filename}"`,
  `Content-Disposition: attachment; filename="${filename}"`,
  `Content-Transfer-Encoding: base64`,
  ``,
  htmlBase64,
  `--${boundary}--`
].join('\r\n');

const rawBase64 = Buffer.from(message).toString('base64url');
return [{ json: { ...lead, raw_message: rawBase64 } }];
```

---

### Node 17b — Build Vercel URL (Code node — success path)

The URL is already set in Node 14 as `vercel_url`. This node is optional — use a Set node to pass data through if no transformation is needed.

---

### Node 18 — Update Monday (Batch Mutation)

Combine all Monday column updates in a single GraphQL aliases call:

```graphql
mutation {
  status: change_multiple_column_values(
    board_id: 5891626711,
    item_id: ITEM_ID,
    column_values: "{\"status5\": {\"label\": \"Warm\"}, \"text_mm3aw1t8\": \"VERCEL_URL\", \"dropdown_mm0wabga\": {\"labels\": [\"OFFER_TYPE\"]}, \"date_mm0wdvyx\": {\"date\": \"EXPIRY_DATE\"}}"
  ) { id }
}
```

**Column IDs used:**
- `status5` — Status (set to "Warm" or "Special offer applied" based on meeting outcome)
- `text_mm3aw1t8` — Post meeting action plan link (Vercel URL)
- `dropdown_mm0wabga` — Special offer dropdown
- `date_mm0wdvyx` — Offer expiry date

The status and offer values are determined by Claude's analysis of the meeting in Node 13. Include them in the structured JSON output from Claude:

```json
{
  "summary": "...",
  "next_steps": ["..."],
  "status": "Warm",
  "special_offer": "...",
  "offer_expiry_days": 14
}
```

Then the HTML generation is a separate step, or Claude outputs both JSON metadata + HTML.

> **Pattern:** Ask Claude to output JSON first, then the HTML. Parse the JSON for Monday updates; use the HTML for GitHub.

---

### Node 19 — Post Granola Summary as Monday Comment

```graphql
mutation {
  create_update(
    item_id: ITEM_ID,
    body: "GRANOLA_SUMMARY_TEXT"
  ) { id }
}
```

Write the full Granola summary here — no character limit on item updates (unlike the `long_text_mm231qgr` column which caps at ~2,000 chars).

---

### Node 20 — Create Gmail Draft (Lead Follow-up)

Create a draft email to the lead with the action plan link:

```
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
Auth: predefinedCredentialType googleOAuth2Api
```

Build the RFC 2822 message:

```js
const lead = $input.item.json;
const message = [
  `To: ${lead.email}`,
  `Subject: Your Stayful Action Plan — ${lead.full_name}`,
  `MIME-Version: 1.0`,
  `Content-Type: text/html`,
  ``,
  `<p>Hi ${lead.first_name},</p>`,
  `<p>Thank you for joining our web meeting. Here is your personalised action plan:</p>`,
  `<p><a href="${lead.vercel_url}">View your Stayful Action Plan</a></p>`,
  `<p>Best regards,<br>The Stayful Team</p>`
].join('\r\n');

const rawBase64 = Buffer.from(message).toString('base64url');
return [{ json: { ...lead, raw_message: rawBase64 } }];
```

---

## Known values

| Item | Value | Column ID / Registry |
|---|---|---|
| Board ID | `5891626711` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Email column | `text_mkygb5xx` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Status column | `status5` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Post meeting action plan link | `text_mm3aw1t8` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Special offer dropdown | `dropdown_mm0wabga` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Offer expiry date | `date_mm0wdvyx` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Web meeting transcript | `long_text_mm231qgr` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Output URL | `text_mm2xe380` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| "Web meeting booked" label ID | `108` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| GitHub repo | `ZacStayful/web-meeting-action-plans` | [Registry](../Known-Values-Registry.md#github) |
| GitHub credential | Header Auth account 6 | [Registry](../Known-Values-Registry.md#github) |
| Vercel URL | `https://action-plans-theta.vercel.app` | [Registry](../Known-Values-Registry.md#vercel) |
| Stayful brand colour | `#5d8156` | [Registry](../Known-Values-Registry.md#branding) |
| Stayful logo | `https://drive.google.com/uc?export=view&id=1iMvb6qZcCEtUl6IXW_pC9-qfzvQwtuP_` | [Registry](../Known-Values-Registry.md#branding) |
| Monday GraphQL endpoint | `https://api.monday.com/v2` | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Monday credential | Header Auth account 4 | [Registry](../Known-Values-Registry.md#monday-management-leads) |
| Monday API version header | `API-Version: 2024-10` | [Registry](../Known-Values-Registry.md#monday-management-leads) |

---

## Test pin data

### Pin 1 — Challenge verification (webhook trigger)

```json
{
  "type": "webhook",
  "webhookData": {
    "body": { "challenge": "test-challenge-abc123" },
    "method": "POST"
  }
}
```

Expected: Respond to Webhook node returns `{"challenge":"test-challenge-abc123"}`.

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

### Pin 4 — Granola response (meeting found)

```json
{
  "meetings": [{
    "id": "meeting-abc123",
    "title": "Stayful Web Meeting — Test Lead",
    "start_time": "2026-05-14T14:00:00Z"
  }]
}
```

### Pin 5 — Granola response (no meeting = no-show)

```json
{ "meetings": [] }
```

### Pin 6 — GitHub success response

```json
{
  "content": {
    "name": "test-lead-action-plan.html",
    "path": "leads/test-lead-action-plan.html",
    "sha": "abc123"
  },
  "commit": { "sha": "def456", "message": "Add action plan for Test Lead" }
}
```

---

## Post-creation checklist

- [ ] Enable MCP access in workflow settings ([Rule 13](../Core-Principles.md#rule-13))
- [ ] Re-pick credentials on all HTTP Request nodes (if `update_workflow` was used — [Rule 1c](../Core-Principles.md#rule-1c))
- [ ] Create the Monday webhook automation in Integrate panel (scoped to status5 column — [Rule 9](../Core-Principles.md#rule-9))
- [ ] Test with pin data for BOTH the challenge path and the real event path ([Rule 6](../Core-Principles.md#rule-6))
- [ ] Verify Granola base URL against working workflows (`n8n:search_workflows({ query: "granola" })`)
- [ ] Publish only after a successful test run ([Rule 6](../Core-Principles.md#rule-6))

---

## Common failures

| Failure | Cause | Fix |
|---|---|---|
| Webhook never fires | Challenge handler missing or Monday webhook not created | Check [Recipe 02](02-Monday-Webhook-Challenge-Echo.md); create webhook in Monday Integrate panel |
| Filter drops all events | Wrong path for status label | Check `$json.body.event.value.label.text` vs `$json.body.event.value.label.index` |
| Monday item not found | `pulseId` path wrong in GraphQL | Confirm event payload path: `$json.body.event.pulseId` |
| Wait node doesn't resume | Meeting start time parsing failed | Log `wait_until` value in Code node; ensure ISO 8601 format |
| Granola returns empty at T+45 | Meeting was a no-show | Correct behaviour → status = "Web meeting no show" |
| Anthropic 400 `max_tokens must be integer` | String instead of expression | Use `"={{ 4096 }}"` not `"4096"` |
| GitHub 422 missing SHA | File already exists at path | GET file first to retrieve SHA (see [Services/GitHub.md](../Services/GitHub.md)) |
| Vercel URL 404 | Deploy still in progress | Wait 60 seconds; deploy is async after GitHub commit |
| Gmail draft fails | Wrong credential type | Use `googleOAuth2Api`, NOT `gmailOAuth2` ([Services/Gmail.md](../Services/Gmail.md)) |
| `update_workflow` strips credentials | SDK footgun | Re-pick all credentials in UI after any update ([Rule 1c](../Core-Principles.md#rule-1c)) |
