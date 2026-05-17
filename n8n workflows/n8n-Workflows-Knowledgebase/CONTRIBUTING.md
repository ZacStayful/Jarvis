# Contributing to the Knowledgebase

> How to add a new recipe, service, rule, or value to this dataset. Goal: keep cross-links healthy, keep anchors stable, keep Claude's retrieval cheap.

---

## Principles for adding content

1. **Concrete over abstract.** Every entry should have a real example — a real node JSON, a real GraphQL query, a real error message verbatim.
2. **Cross-link aggressively.** Anything that touches a Rule should link to it. Anything that touches a Service should link to it. The dataset's value compounds with link density.
3. **Anchors are forever.** Once a section has an `<a id="…">`, do not rename it without grepping for inbound links and updating them all.
4. **Don't write without Zac.** New learnings go through Zac before being committed to the knowledgebase (and to the [skill file](Known-Values-Registry.md#n8n-instance)). Drafts are fine; commits need approval.

---

## When to add what

| You discovered | Where it goes |
|---|---|
| A new workflow pattern that solves a problem in 2+ steps | New [Quick Recipe](Quick-Recipes/) |
| A new third-party service Stayful is now integrating with | New [Service file](Services/) |
| A new hard rule that should apply to every workflow | New numbered rule in [Core-Principles.md](Core-Principles.md) |
| A concrete value (board ID, column ID, agent ID, endpoint, credential) | [Known-Values-Registry.md](Known-Values-Registry.md) |
| A failure mode with a specific error message | [Troubleshooting.md](Troubleshooting.md) |
| A reusable structural pattern (not a full workflow) | [System-Patterns.md](System-Patterns.md) |

---

## Templates

### New Quick Recipe

```markdown
# NN-Short-Title

> One-sentence problem statement.
>
> Rules in play: [Rule X](../Core-Principles.md#rule-X), [Rule Y](../Core-Principles.md#rule-Y)
> Services: [Service-A](../Services/Service-A.md), [Service-B](../Services/Service-B.md)

## Use case

Plain-English description of when to reach for this.

## Node map ([Rule 3](../Core-Principles.md#rule-3))

```
[Trigger] → [Step 2] → [Step 3] → [Output]
```

Confirm each step uses a working node before writing SDK code.

## SDK code

```ts
// full SDK code, copy-pastable
```

## Known values to swap in

- Board ID: …
- Column ID: …

## Test pin data

```json
{ "type": "webhook", "webhookData": { "body": { … } } }
```

## Why this pattern works

Short explanation. What problem does the shape solve?

## Common failures

| Failure | Fix |
|---|---|
| … | … |
```

### New Service file

```markdown
# Service Name

> One-sentence purpose: what does Stayful use this for?
>
> Auth pattern: …
> Native node status: ✅ works / ❌ use HTTP workaround ([Rule 1](../Core-Principles.md#rule-1))

## Endpoint & auth

| Item | Value |
|---|---|
| Base URL | … |
| Auth | … |
| Version header | … |

## Common operations

### Operation 1
```http
…
```

## Common errors & fixes

| Error | Cause | Fix |
|---|---|---|

## Test payload

```json
…
```

## Cross-links

- Recipes: …
- Rules: …
- Known values: [Known-Values-Registry#anchor](../Known-Values-Registry.md#anchor)
```

### New Rule

In `Core-Principles.md`:

```markdown
<a id="rule-N"></a>
## Rule N — Short imperative title

Short rationale (1-3 sentences).

Concrete example, code block, or table.

Cross-links: [Recipe](Quick-Recipes/…), [Service](Services/…), [Troubleshooting](Troubleshooting.md#…).
```

Then **also** add a row to the table in [INDEX.md](INDEX.md), and a row to the summary checklist in [Core-Principles.md#summary-checklist](Core-Principles.md#summary-checklist).

### New Known Value

Pick the right section in [Known-Values-Registry.md](Known-Values-Registry.md). Add the value with the smallest possible context to disambiguate it.

If it's a new category, add a new `<a id="…">` section and a corresponding row in the INDEX.

---

## Anchor naming convention

- Rules: `rule-N` or `rule-Nb` for sub-rules (`rule-1b`, `rule-1c`)
- Status codes: bare number (`401`, `403`, `400`, …)
- Symptoms: short kebab-case noun (`wont-trigger`, `returns-empty`)
- Patterns: kebab-case (`monday-webhook-challenge`, `header-auth-structure`)
- Known-Values sections: service name in kebab-case (`monday-management-leads`, `retell`, `vercel`)

Stable anchors > prettier anchors.

---

## Linting checklist before committing

- [ ] Every claim has either a code example, a value reference, or a Rule link
- [ ] Every internal link uses a relative path (no absolute paths, no `https://docs.…`)
- [ ] Anchors used in links exist as `<a id="…">` somewhere
- [ ] New entries added to [INDEX.md](INDEX.md) if at the top level of their file
- [ ] No duplication — if a thing is already documented elsewhere, link to it instead of copying
- [ ] Zac has signed off on the content

---

## Syncing with the skill file

The `/mnt/skills/user/n8n-workflow-builder/SKILL.md` is a **compressed** version of this knowledgebase loaded into Claude's context per-session.

When you make a substantial update here:

1. Tell Zac what changed.
2. Together decide if the change is significant enough to update the skill file.
3. If yes, propose the skill file edit (it's terser — keep only the action-relevant lines).
4. Zac approves; only then write the change to the skill file.

The knowledgebase is the source of truth. The skill file is the cache.
