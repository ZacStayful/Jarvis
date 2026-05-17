# GitHub

> File commits via the GitHub Contents REST API. Used in the web meeting pipeline to publish HTML action plans to `ZacStayful/web-meeting-action-plans`, which Vercel auto-deploys to `action-plans-theta.vercel.app`.
>
> Native n8n node: ❌ does not exist — HTTP Request only.
> Auth: **Header Auth account 6** (Bearer PAT) — covers both Stayful GitHub repos.

---

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | `https://api.github.com` |
| Auth | Header Auth account 6 — `Authorization: Bearer <PAT>` |
| Accept header | `application/vnd.github+json` |
| API version header | `X-GitHub-Api-Version: 2022-11-28` |
| Content-Type | `application/json` |

**Header Auth account 6 covers both repos** — the same PAT is valid for `ZacStayful/stayful-presentations` and `ZacStayful/web-meeting-action-plans`.

---

## Repositories

| Repo | Purpose | Auto-deployed to |
|---|---|---|
| `ZacStayful/web-meeting-action-plans` | HTML action plans generated post-web-meeting | `action-plans-theta.vercel.app` |
| `ZacStayful/stayful-presentations` | Stayful presentation slides | `stayful-presentations.vercel.app` |

---

## Create or update a file (commit)

This is the core operation in the web meeting pipeline:

```
PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}

Headers:
  Authorization: Bearer <PAT>
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28
  Content-Type: application/json

Body:
{
  "message": "Add action plan for Test Lead",
  "content": "<base64-encoded file content>",
  "sha": "<current file SHA — required when updating existing file, omit for new>"
}
```

**File path for web meeting action plans:**
```
leads/firstname-lastname-action-plan.html
```

With middle name:
```
leads/firstname-middlename-lastname-action-plan.html
```

All lowercase, spaces replaced with hyphens, exactly matching the Vercel URL path.

---

## Base64 encoding in n8n (Code node)

GitHub requires file content as base64. Always encode in a Code node before the HTTP Request:

```js
const html = $input.item.json.html_content;

// Filename from lead name
const nameParts = [
  $input.item.json.first_name,
  $input.item.json.last_name
].filter(Boolean).map(n => n.toLowerCase().replace(/\s+/g, '-'));
const filename = nameParts.join('-') + '-action-plan.html';

const encoded = Buffer.from(html, 'utf-8').toString('base64');

return [{
  json: {
    ...$input.item.json,
    content_base64: encoded,
    filename,
    github_path: `leads/${filename}`,
    vercel_url: `https://action-plans-theta.vercel.app/leads/${filename}`
  }
}];
```

Then reference in the HTTP Request body:
```json
{
  "message": "Add action plan for Test Lead",
  "content": "={{ $json.content_base64 }}"
}
```

---

## Handling existing files (SHA requirement)

If a file already exists at the path, GitHub **rejects** the PUT without the existing file's `sha` (returns HTTP 422).

For the web meeting pipeline, action plan filenames are derived from lead names, so collisions are rare. Two options:

**Option A — Optimistic write (recommended for first builds):**
Send the PUT without `sha`. If it 422s, fall through to the error branch. The fallback email handles this edge case.

**Option B — Check first (robust):**
```
GET https://api.github.com/repos/ZacStayful/web-meeting-action-plans/contents/leads/{filename}
```
If 200: extract `.sha` from response, include in PUT body.
If 404: proceed without `sha`.

---

## Successful response

HTTP 201 (new file) or 200 (updated file):

```json
{
  "content": {
    "name": "test-lead-action-plan.html",
    "path": "leads/test-lead-action-plan.html",
    "sha": "abc123def456...",
    "html_url": "https://github.com/ZacStayful/web-meeting-action-plans/blob/main/leads/test-lead-action-plan.html"
  },
  "commit": {
    "sha": "def456...",
    "message": "Add action plan for Test Lead"
  }
}
```

After a successful commit, Vercel auto-deploys within ~30–60 seconds. No explicit Vercel API call is needed.

---

## GitHub commit fails — fallback

When the GitHub PUT fails (any non-200/201 status), the workflow falls back to emailing Zac directly with the HTML attached:

```
POST https://gmail.googleapis.com/gmail/v1/users/me/drafts
Auth: googleOAuth2Api

Body: RFC 2822 message with the HTML file as attachment (base64 encoded)
To: zac@stayful.co.uk
Subject: [Action Plan FALLBACK] Test Lead — web meeting {date}
```

See [Services/Gmail.md](Gmail.md) for the draft creation pattern.

---

## Common errors & fixes

| HTTP Status | Error | Cause | Fix |
|---|---|---|---|
| 401 | `Bad credentials` | PAT invalid or expired | Re-pick Header Auth account 6; regenerate PAT in GitHub → Settings → Developer Settings → PATs |
| 404 | `Not Found` | Repo name wrong, or branch `main` doesn't exist | Confirm `ZacStayful/web-meeting-action-plans` exists and has a `main` branch |
| 422 | `"sha" was missing` | File already exists at path | GET the file first to retrieve its `sha`, then re-PUT with it |
| 422 | `content is not valid Base64` | Raw HTML sent unencoded | Encode via `Buffer.from(html, 'utf-8').toString('base64')` in Code node |
| 409 | Conflict | Concurrent writes to same path | Rare; retry with fresh GET to get current `sha` |

---

## Test payload for HTTP Request pin data

Mock a successful GitHub response:

```json
{
  "content": {
    "name": "test-lead-action-plan.html",
    "path": "leads/test-lead-action-plan.html",
    "sha": "abc123"
  },
  "commit": {
    "sha": "def456",
    "message": "Add action plan for Test Lead"
  }
}
```

---

## Cross-links

- Recipes: [07-Web-Meeting-Processing](../Quick-Recipes/07-Web-Meeting-Processing.md)
- Rules: [Rule 1](../Core-Principles.md#rule-1) (no native GitHub node — HTTP only), [Rule 4](../Core-Principles.md#rule-4) (Header Auth account 6)
- Services: [Vercel](Vercel.md) (auto-deploy from commit), [Gmail](Gmail.md) (fallback draft)
- Known values: [Known-Values-Registry#github](../Known-Values-Registry.md#github)
