# Known Values Registry

> Concrete IDs, tokens, endpoints, and credential names for the Stayful environment. **Use these values without asking** ([Rule 5](Core-Principles.md#rule-5)). If a value is missing from here, look it up via [Rule 4](Core-Principles.md#rule-4) (`search_workflows`) before asking Zac.

---

<a id="monday-management-leads"></a>
## Monday.com — Management Leads board

| Item | Value |
|---|---|
| Board ID | `5891626711` |
| GraphQL endpoint | `https://api.monday.com/v2` |
| API version header (always send) | `API-Version: 2024-10` |

### Column IDs

| Column ID | Purpose |
|---|---|
| `text_mkygb5xx` | **Email** (text type — lowercase before matching) |
| `phone_mm1hp0a8` | **Phone** |
| `status5` | **Status** |
| `text5` | **Notes / Text** |
| `date_mm1nmb17` | **Lead Last Response** date |
| `text_mm2qhtqa` | **Property Type** |
| `text_mm2qmww2` | **Pre-Qualifier Progress** |
| `date_mm2qryq5` | **Pre-Qualifier Completed** |
| `text_mm2pfnft` | **Slide Progress** (final slide value: `'8'`) |
| `long_text_mm2pse8d` | **Slide Responses** |
| `text_mm2mjdq1` | **Stayful Presentation URL** |
| `files__1` | **Deal Analyser** (file column) |
| `text_mm2dkavd` | **Stayful Net Analyser** |
| `text_mm2dc5ka` | **Annual Rent / Mortgage** |
| `date_mm2q9b8g` | **Email Sent** date |
| `date_mm2q8sc3` | **Follow-up 1 Sent** date |
| `date_mm2q6e9x` | **Follow-up 2 Sent** date |
| `long_text_mm231qgr` | **Web Meeting Transcript** (capped ~2,000 chars — use item updates as primary source) |
| `text_mm2xe380` | **Output URL** |
| `text_mm3aw1t8` | **Post meeting action plan link** (Vercel URL written after web meeting processing) |
| `dropdown_mm0wabga` | **Special offer** dropdown |
| `date_mm0wdvyx` | **Offer expiry date** |

### Group IDs

| Group ID | Purpose |
|---|---|
| `group_mm28ypgs` | Qualified Management Leads |
| `topics` | Cold Management Leads |
| `group_mksxb5m0` | Web meeting booked |

### Status labels (`status5`) — complete list

Sourced directly from the board's column settings via API. Use label ID (`index`) for mutations — more robust than label text against renames.

| Label ID | Label text |
|---|---|
| `0` | Special offer applied |
| `1` | Dead |
| `2` | Abandoned |
| `3` | **Web meeting no show** |
| `4` | Customer |
| `5` | Un Qualified Lead |
| `6` | In the Future |
| `7` | Warm |
| `8` | converted to management lead |
| `9` | Guaranteed rent |
| `10` | Abandoned Due to call |
| `11` | In the future due to call |
| `12` | Dropped customer |
| `13` | Qualified lead |
| `14` | Follow Up |
| `108` | **Web meeting booked** |

> When updating status via `change_multiple_column_values`, prefer index form: `{"index": 3}` — bulletproof against label text renames. Label form `{"label": "Web meeting no show"}` also works but breaks silently if the label is renamed in Monday.

---

<a id="anthropic"></a>
## Anthropic API

| Item | Value |
|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Version header | `anthropic-version: 2023-06-01` |
| Auth | Header Auth credential, `Authorization: Bearer <key>` |
| Recommended model | `claude-sonnet-4-6` |

See [Services/Anthropic-Claude.md](Services/Anthropic-Claude.md) for the `max_tokens` integer rule and markdown-fence stripping.

---

<a id="retell"></a>
## Retell AI

| Item | Value |
|---|---|
| Endpoint | `https://api.retellai.com/` |
| Lucy agent ID | `agent_82f187b32e8f5e7913da1c506f` |
| Auth | `httpHeaderAuth` Bearer token |

Lucy = outbound voice agent for management lead calls. Remaining items to go live: purchase a Retell phone number, verify the Vercel property API endpoint, publish the Lucy agent in Retell. See [Services/Retell-AI.md](Services/Retell-AI.md).

---

<a id="twilio"></a>
## Twilio

| Item | Value |
|---|---|
| Endpoint | `https://api.twilio.com/` |
| From number (UK mobile) | `+447426947296` |
| Auth | Native Twilio credential (Account SID + Auth Token) — but see [Rule 1b](Core-Principles.md#rule-1b) for SDK limitations |

UK numbers require an approved Ofcom regulatory bundle. Error `21649` = bundle not approved. See [Services/Twilio.md](Services/Twilio.md).

---

<a id="vercel"></a>
## Vercel

| Item | Value |
|---|---|
| Action plans URL | `https://action-plans-theta.vercel.app` |
| Action plans repo | `ZacStayful/web-meeting-action-plans` |
| Action plans file path pattern | `leads/{firstname}-{lastname}-action-plan.html` |
| Presentations URL | `https://stayful-presentations.vercel.app` |
| Presentations repo | `ZacStayful/stayful-presentations` |
| Lucy property API endpoint | `https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app/api/property-data` |

> The Lucy property API URL includes a deployment ID (`ndpemkfh7`) that changes on redeploy. Confirm this is current before publishing any Lucy-related workflow. Update this entry if it returns 404.

> **Domain standardisation:** n8n workflows writing presentation URLs to Monday.com should use `stayful-presentations.vercel.app` as the canonical domain. Audit `text_mm2mjdq1` column values and update any Code nodes using older deployment-specific subdomains.

See [Services/Vercel.md](Services/Vercel.md) for the auto-deploy chain.

---

<a id="github"></a>
## GitHub

| Item | Value |
|---|---|
| Action plans repo | `ZacStayful/web-meeting-action-plans` |
| Action plans file path | `leads/{firstname}-{lastname}-action-plan.html` |
| Presentations repo | `ZacStayful/stayful-presentations` |
| Auth credential | **Header Auth account 6** (Bearer PAT — covers both repos) |
| API base URL | `https://api.github.com` |

Header Auth account 6 is the same PAT for both repos. See [Services/GitHub.md](Services/GitHub.md) for commit patterns and base64 encoding.

---

<a id="cloudflare"></a>
## Cloudflare

| Item | Value |
|---|---|
| Account ID | `4c9752c845cae0c9442f4edd974147e4` |
| n8n proxy worker | `n8n-proxy.stayful.workers.dev` |
| KV namespace | `N8N_TUNNEL` (ID `22aef22ca7aa411e80a7345ea56fe09b`) |

> Note: current active n8n environment is `stayful.app.n8n.cloud`. The Cloudflare tunnel / proxy approach is planned as the permanent always-on host but the cloud instance is the reliable path right now. The proxy has had previous instability — use the direct cloud instance.

---

<a id="n8n-instance"></a>
## n8n instance

| Item | Value |
|---|---|
| Instance | `stayful.app.n8n.cloud` |
| REST API base | `https://stayful.app.n8n.cloud/api/v1` |
| REST API auth header | `X-N8N-API-KEY: <token>` |

### n8n credentials

| Credential name | What it is |
|---|---|
| Header Auth account 4 | Monday API Key (`Authorization` header, **no** Bearer prefix) |
| Header Auth account 6 | GitHub PAT (Bearer token — covers both `ZacStayful` repos) |

---

<a id="google-oauth"></a>
## Google OAuth

| Item | Value |
|---|---|
| OAuth client type | **Web application** (NOT Desktop — Desktop type causes OAuth failures) |
| n8n callback URL | `https://oauth.n8n.cloud/oauth2/callback` |
| Credential for Gmail HTTP Requests | `googleOAuth2Api` |
| Credential for native Gmail nodes | `gmailOAuth2` (locked to native nodes — cannot be used on HTTP Request nodes) |

> `gmailOAuth2` is locked to native Gmail nodes by n8n's hardcoded policy. HTTP Request nodes calling Gmail must use `googleOAuth2Api`. See [Services/Gmail.md](Services/Gmail.md).

---

<a id="branding"></a>
## Stayful branding

| Item | Value |
|---|---|
| Primary colour | `#5d8156` |
| Logo (embed URL) | `https://drive.google.com/uc?export=view&id=1iMvb6qZcCEtUl6IXW_pC9-qfzvQwtuP_` |

**Google Drive image link format** — always convert sharing links to embed links for use in HTML/markdown:

| Source | Format |
|---|---|
| Sharing URL | `https://drive.google.com/file/d/[ID]/view?usp=sharing` |
| Embed URL (use this) | `https://drive.google.com/uc?export=view&id=[ID]` |
