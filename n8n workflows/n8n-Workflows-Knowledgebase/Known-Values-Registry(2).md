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
| `long_text_mm231qgr` | **Web Meeting Transcript** (capped ~2000 chars — use item updates as primary source) |

### Group IDs

| Group ID | Purpose |
|---|---|
| `group_mm28ypgs` | Qualified Management Leads |
| `topics` | Cold Management Leads |
| `group_mksxb5m0` | Web meeting booked |

### Status labels (`status5`)

| Label text | Label ID |
|---|---|
| Qualified lead | `13` |
| Web meeting booked | `108` |
| Customer | `4` |
| Warm | `7` |
| Special offer applied | `0` |
| Dead | `1` |
| Abandoned | `2` |

> When updating status via `change_multiple_column_values`, you can use either `{"label": "Qualified lead"}` or `{"index": 13}`. Label form is more readable; index form is bulletproof against renames.

See [Services/Monday.com.md](Services/Monday.com.md) for query patterns.

---

<a id="anthropic"></a>
## Anthropic API

| Item | Value |
|---|---|
| Endpoint | `https://api.anthropic.com/v1/messages` |
| Version header | `anthropic-version: 2023-06-01` |
| Auth | Header Auth credential, `Authorization: Bearer <key>` |
| Models | `claude-sonnet-4-20250514`, plus newer (verify in service file) |

See [Services/Anthropic-Claude.md](Services/Anthropic-Claude.md) for the `max_tokens` integer rule and markdown-fence stripping.

---

<a id="retell"></a>
## Retell AI

| Item | Value |
|---|---|
| Endpoint | `https://api.retellai.com/` |
| Lucy agent ID | `agent_82f187b32e8f5e7913da1c506f` |
| Auth | `httpHeaderAuth` Bearer token |

Lucy = outbound voice agent for management lead calls. See [Services/Retell-AI.md](Services/Retell-AI.md).

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
| Property API endpoint | `https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app/api/property-data` |
| Purpose | Inject property context into Retell calls (Lucy reads it during the conversation) |

See [Services/Retell-AI.md](Services/Retell-AI.md) and [Quick-Recipes/05-Retell-Outbound-Call.md](Quick-Recipes/05-Retell-Outbound-Call.md).

---

<a id="github"></a>
## GitHub

| Item | Value |
|---|---|
| Repo (presentations) | `ZacStayful/stayful-presentations` |
| Auth credential | **Header Auth account 6** (Bearer PAT) |

---

<a id="cloudflare"></a>
## Cloudflare

| Item | Value |
|---|---|
| Account ID | `4c9752c845cae0c9442f4edd974147e4` |
| n8n proxy worker | `n8n-proxy.stayful.workers.dev` |
| KV namespace | `N8N_TUNNEL` (ID `22aef22ca7aa411e80a7345ea56fe09b`) |

> Note: current active n8n environment is `stayful.app.n8n.cloud`. The Mac Mini / Cloudflare tunnel approach is planned as the permanent always-on host but the cloud instance is the live environment today.

---

<a id="google-oauth"></a>
## Google OAuth

| Item | Value |
|---|---|
| Client ID | `626654609834-fqu4rrkr5f9pra0b9pufth5q9c1eth74.apps.googleusercontent.com` |
| Callback URL | `https://oauth.n8n.cloud/oauth2/callback` |
| Project | "My First Project" |
| Type | **Web application** (NOT Desktop — n8n callback requires Web app type) |

`gmailOAuth2` credential is **locked to native Gmail nodes** — HTTP Request nodes must use `predefinedCredentialType: 'googleOAuth2Api'`. These are distinct credential types.

See [Services/Gmail.md](Services/Gmail.md).

---

<a id="n8n-instance"></a>
## n8n instance

| Item | Value |
|---|---|
| URL | `https://stayful.app.n8n.cloud` |
| REST API base | `https://stayful.app.n8n.cloud/api/v1` |
| REST auth header | `X-N8N-API-KEY: <token>` |
| MCP connection | Connected to Claude.ai |
| Skill file location | `/mnt/skills/user/n8n-workflow-builder/SKILL.md` |

### Surgical edit pattern (REST API)

```
GET  /api/v1/workflows/{id}
       → mutate node in JSON
       → strip fields: availableInMCP, binaryMode
PUT  /api/v1/workflows/{id}
       → n8n:publish_workflow
```

Allowed `settings` fields on PUT:
- `executionOrder`
- `saveManualExecutions`
- `callerPolicy`
- `errorWorkflow`
- `timezone`
- `saveDataSuccessExecution`
- `saveDataErrorExecution`
- `saveExecutionProgress`
- `executionTimeout`
- `maxExecutionTimeout`

"Continue on Fail" UI toggle = `"onError": "continueRegularOutput"` on the node object.

---

<a id="n8n-credentials"></a>
## n8n credentials reference

> Names of credentials currently stored in the Stayful n8n instance. Use [Rule 4](Core-Principles.md#rule-4) (`search_workflows`) to confirm exact names before referencing in SDK code.

| Credential | Type | Purpose |
|---|---|---|
| Header Auth account 4 | `httpHeaderAuth` | Monday API Key (`Authorization` header) |
| Header Auth account 6 | `httpHeaderAuth` | GitHub PAT (Bearer token, `ZacStayful/stayful-presentations`) |
| Anthropic key (Header Auth) | `httpHeaderAuth` | Anthropic API (`Authorization: Bearer <key>`) |
| Twilio | native Twilio | Account SID + Auth Token — see [Rule 1b](Core-Principles.md#rule-1b) |
| Google OAuth (Gmail HTTP) | `googleOAuth2Api` | HTTP Request to Gmail API |
| Gmail OAuth2 | `gmailOAuth2` | Native Gmail node only — incompatible with HTTP Request |

### Credential reference in SDK code

Use the **existing credential ID** found via `search_workflows`. Example:

```ts
credentials: {
  httpHeaderAuth: { id: 'abc123', name: 'Header Auth account 4' }
}
```

**Footgun:** `newCredential('Name')` does NOT look up by name. It creates a fresh blank credential. Always reference existing credentials by ID.

After any `update_workflow` call, credentials are stripped from all credentialed nodes and the user must re-pick them in the UI ([Rule 1c](Core-Principles.md#rule-1c)).

---

## Excluded from migration

For reference — these are explicitly NOT being migrated from Zapier:

- "Management lead Workflow"
- Zapier Agents

Don't spend time building these in n8n. If a related question comes up, Zac will direct.
