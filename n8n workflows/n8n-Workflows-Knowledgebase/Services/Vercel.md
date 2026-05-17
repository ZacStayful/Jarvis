# Vercel

> Deployment platform. Stayful uses Vercel to auto-deploy HTML action plans from GitHub and to host Lucy's property data API. The web meeting pipeline writes to GitHub and Vercel picks up the deploy automatically — no direct Vercel API call required.
>
> Native n8n node: ❌ does not exist — HTTP Request if needed, but the main pipeline uses GitHub-triggered auto-deploy.

---

## Projects

| Project name | Public URL | Source repo | Purpose |
|---|---|---|---|
| `web-meeting-action-plans` | `https://action-plans-theta.vercel.app` | `ZacStayful/web-meeting-action-plans` | HTML action plans generated after web meetings |
| `stayful-presentations` | `https://stayful-presentations.vercel.app` | `ZacStayful/stayful-presentations` | Stayful slide presentations |
| `stayful-voice` | `https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app` | — | Lucy property data API endpoint |

---

## How auto-deploy works (web meeting pipeline)

n8n **does not call Vercel directly** in the web meeting workflow. The deploy chain is:

```
[n8n: PUT file to GitHub → ZacStayful/web-meeting-action-plans]
    ↓  (~30–60 seconds)
[GitHub pushes to Vercel via webhook]
    ↓
[Vercel builds and publishes the file]
    ↓
[File is live at action-plans-theta.vercel.app/leads/FILENAME]
```

The n8n workflow constructs the final URL from the filename **immediately after the GitHub commit succeeds** and writes it to Monday — before Vercel finishes deploying. By the time a human opens the link (~1–2 minutes later), the file is live.

---

## URL construction — action plans

```js
// Build in Code node after base64 encoding
const firstName = $input.item.json.first_name.toLowerCase().replace(/\s+/g, '-');
const lastName = $input.item.json.last_name.toLowerCase().replace(/\s+/g, '-');
// Include middle name if present:
// const middle = $input.item.json.middle_name?.toLowerCase().replace(/\s+/g, '-');
// const filename = middle ? `${firstName}-${middle}-${lastName}-action-plan.html`
//                         : `${firstName}-${lastName}-action-plan.html`;
const filename = `${firstName}-${lastName}-action-plan.html`;
const vercelUrl = `https://action-plans-theta.vercel.app/leads/${filename}`;
```

The filename must **exactly match** the GitHub file path under `leads/` — case-sensitive.

---

## Writing the URL to Monday

After building `vercelUrl`, write it to Monday column `text_mm3aw1t8` (Post meeting action plan link):

```graphql
mutation {
  change_multiple_column_values(
    board_id: 5891626711,
    item_id: ITEM_ID,
    column_values: "{\"text_mm3aw1t8\": \"https://action-plans-theta.vercel.app/leads/test-lead-action-plan.html\"}"
  ) { id }
}
```

---

## Domain standardisation note — presentations

Older n8n workflows may write presentation URLs using a deployment-specific subdomain (e.g. `stayful-presentations-abc123.vercel.app`) rather than `stayful-presentations.vercel.app`. When updating or auditing presentation-delivery workflows:

1. Check values in the `text_mm2mjdq1` (Stayful Presentation URL) column for inconsistency.
2. Update any URL-building Code nodes to use `https://stayful-presentations.vercel.app` as the canonical domain.

---

## Lucy property data API endpoint

Used by Retell AI to inject property context into outbound calls:

```
POST https://stayful-voice-ndpemkfh7-zacs-projects-bcdb6016.vercel.app/api/property-data
{ "monday_item_id": 12345 }
```

> **Important:** This URL includes a deployment ID (`ndpemkfh7`) that changes when the Vercel project is redeployed. Confirm against [Known-Values-Registry#vercel](../Known-Values-Registry.md#vercel) before publishing a Lucy-related workflow. If it returns 404, the deployment has changed — update the Registry.

---

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|
| URL returns 404 immediately after GitHub commit | Vercel deploy not finished | Wait 30–60 seconds; deploy is asynchronous |
| URL returns 404 permanently | Filename mismatch or wrong path | Verify the GitHub file path under `leads/` matches the URL path exactly (case-sensitive) |
| Lucy API endpoint 404 | Deployment ID in URL is stale | Confirm in Registry; update URL in workflow Code node and Registry |
| Presentation URL inconsistency | Old workflows using non-canonical domain | Audit `text_mm2mjdq1` column; update Code nodes to use `stayful-presentations.vercel.app` |

---

## Cross-links

- Recipes: [07-Web-Meeting-Processing](../Quick-Recipes/07-Web-Meeting-Processing.md), [05-Retell-Outbound-Call](../Quick-Recipes/05-Retell-Outbound-Call.md)
- Services: [GitHub](GitHub.md) (the commit that triggers deploy), [Retell-AI](Retell-AI.md) (Lucy property endpoint)
- Known values: [Known-Values-Registry#vercel](../Known-Values-Registry.md#vercel)
