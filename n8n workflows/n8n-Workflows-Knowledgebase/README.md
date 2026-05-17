# n8n Workflows Knowledgebase

> A second-brain knowledge dataset for building, debugging, and publishing n8n workflows at Stayful. Designed to be read by Claude (Code, Desktop, MCP) and humans equally — every rule, value, and recipe is anchored so it can be linked to from anywhere in the dataset.

---

## Who this is for

- **Zac** (zac@stayful.co.uk) — director of Stayful, owner of the migration from Zapier → n8n.
- **Claude** — any Claude instance with this folder synced (via Drive MCP or local clone). Read [INDEX.md](INDEX.md) first when picking up a new task.
- **Future contributors** — see [CONTRIBUTING.md](CONTRIBUTING.md) before adding new recipes/services/rules.

## What it covers

Live, working patterns for the Stayful n8n cloud instance (`stayful.app.n8n.cloud`), MCP-connected to Claude. Every integration that has been built or attempted is documented as a **Service** file (one per third-party API). Every multi-node pattern that has shipped is documented as a **Quick Recipe**. Every hard-won rule is in **Core-Principles**.

> **Scope exclusions:** "Management lead Workflow" and Zapier Agents are explicitly out of scope for migration. CircleLoop has no native n8n node — it lives in [Services/CircleLoop.md](Services/CircleLoop.md) as webhook-only.

---

## How to use this knowledgebase

### Starting a new workflow task
1. Read [Core-Principles.md](Core-Principles.md) once if you haven't this session — every rule applies to every task.
2. Open [INDEX.md](INDEX.md) and skim for the closest **Recipe** to what you're building.
3. Look up each external service in [Services/](Services/) — they have credential patterns, current API endpoints, and known errors.
4. Pull any concrete IDs (board, column, agent, from-number) from [Known-Values-Registry.md](Known-Values-Registry.md). **Do not ask Zac for values that are in the registry.**
5. Map every step to a working node ([Rule 3](Core-Principles.md#rule-3)) **before** writing SDK code.
6. Run the workflow through the [Validation → Create → Test → Publish](System-Patterns.md#validation-create-test-publish) sequence ([Rule 6](Core-Principles.md#rule-6)).

### When something breaks
Open [Troubleshooting.md](Troubleshooting.md). It is sorted by HTTP status code first and by symptom second, with a final diagnosis flowchart. Almost every recurring failure mode is already captured there with a Rule cross-reference.

### When you discover something new
See [CONTRIBUTING.md](CONTRIBUTING.md). New learnings go through Zac before being committed.

---

## File map

```
n8n-Workflows-Knowledgebase/
├── README.md                  ← you are here
├── INDEX.md                   ← anchor index, optimised for Claude retrieval
├── Core-Principles.md         ← the 16 rules + summary checklist
├── System-Patterns.md         ← reusable structural patterns
├── Known-Values-Registry.md   ← all concrete IDs, tokens, endpoints
├── Troubleshooting.md         ← by status code, by symptom, diagnosis flowchart
├── CONTRIBUTING.md            ← how to extend this dataset
│
├── Quick-Recipes/
│   ├── 01-Gmail-to-Monday-Search-and-Update.md
│   ├── 02-Monday-Webhook-Challenge-Echo.md
│   ├── 03-Anthropic-API-Call.md
│   ├── 04-Twilio-SMS.md
│   ├── 05-Retell-Outbound-Call.md
│   └── 06-Calendly-Webhook-Booking.md
│
└── Services/
    ├── Monday.com.md
    ├── Gmail.md
    ├── Anthropic-Claude.md
    ├── Twilio.md
    ├── Retell-AI.md
    ├── Calendly.md
    ├── CircleLoop.md
    └── Slack.md
```

---

## Cross-link conventions

This dataset uses relative-path markdown links so it works from a local clone, a GitHub mirror, or Obsidian. Three link styles are in use:

| Style | Example | Use for |
|---|---|---|
| **File link** | `[Services/Monday.com.md](Services/Monday.com.md)` | Pointing at a whole service or recipe |
| **Anchor link** | `[Rule 8](Core-Principles.md#rule-8)` | Pointing at a specific rule, status code, or column ID |
| **Inline reference** | `([Rule 1](Core-Principles.md#rule-1))` | Citing the rule that justifies a decision |

Every Rule, every HTTP status code in Troubleshooting, and every value in the Registry has a stable anchor. **Do not rename anchors** without grepping for inbound links first.

---

## Stayful-specific shorthand

- **The board** = Monday.com Management Leads board `5891626711`. Anything that says "the email column", "the status column" etc. refers to this board.
- **Lucy** = Retell AI outbound voice agent `agent_82f187b32e8f5e7913da1c506f`.
- **The instance** = `stayful.app.n8n.cloud`. MCP-connected to Claude.ai.
- **The skill file** = `/mnt/skills/user/n8n-workflow-builder/SKILL.md`. The compressed version of this knowledgebase that gets loaded into Claude's context.
- **Steve** = colleague involved in infrastructure (Mac Mini, Cloudflare tunnel).

---

## Status & last updated

- Created: 2026-05-14
- Owner: zac@stayful.co.uk
- Drive root: [n8n-Workflows-Knowledgebase](https://drive.google.com/drive/folders/1q6EfB1u2cVbyqAzeo70bJrisqQ58gIyF)
- Source folder (parent): [n8n workflows](https://drive.google.com/drive/folders/19CS9wQWO7_V3Se-4vGs_twIVNA81B_CI)
