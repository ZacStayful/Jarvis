# Stayful SEO Knowledgebase

A structured, Claude-Code-navigable extraction of the Stayful SEO Engine Master Instructions v2.0 (15 May 2026), split so the universal SEO playbook can be applied to any website, with Stayful's Airbnb-management overlay layered on top.

---

## What this folder is for

This knowledgebase has two jobs:

1. **Build new pages or optimise existing pages** for any Stayful website (Airbnb management, short-term rental estimates, contractor accommodation) — and any other website in the future.
2. **Serve as Stayful's second-brain SEO reference** — every rule, framework, checklist, HTML pattern and decision tree from the v2.0 master doc, broken into focused files that Claude Code (or a person) can navigate with grep/glob.

The folder structure separates **what is universal SEO practice that Google rewards on any website** from **what is specific to Stayful's Airbnb-management business**. Apply `CORE__*` to any site. Layer `STAYFUL__*` on top only when the site is the Stayful Airbnb-management business.

---

## How to navigate

Files are flat (Google Drive doesn't store nested folders well via API) but the **prefix is the folder**. Read prefixes left to right:

```
LAYER__SECTION__TOPIC.md
```

| Prefix | Layer | Applies to |
|---|---|---|
| `CORE__` | Universal SEO playbook | Any website, any industry |
| `STAYFUL__` | Airbnb-management business overlay | Stayful's Airbnb-management site only |
| `TEMPLATE__` | Fill-in-the-blanks for new businesses | When creating an overlay for a new business |
| `HTML__` | Reusable HTML/CSS/SVG snippets | Stayful-styled (overlay-specific); structure is universal |
| `_INDEX.md` | Full file listing with one-line description of each | Quick lookup |

Within `CORE__`, the second segment is the section in the v2.0 master doc that the file maps to:

| Section prefix | What it covers |
|---|---|
| `00_quickstart` | "I need to do X" task walkthroughs |
| `01_strategic` | Strategic gates that govern whether work should happen at all |
| `02_phase-0` | "Should this page exist?" gate |
| `02_phase-1` | Audit and research |
| `02_phase-2` | HTML fixes and additions |
| `02_phase-3` | Cluster supporting pages |
| `03_content` | Content principles (immediate answer, AI citation, Discover, paragraph formatting) |
| `03_reader-momentum` | Engagement architecture (forward pull, H2 hooks, escalating stakes, curiosity gap) |
| `03_meta` | Meta title and description rules |
| `04_frameworks` | Reusable patterns (lead profiles, objections, FAQ language, worst-case framing, proof points) — frameworks live in CORE, specific instances live in STAYFUL |
| `05_technical` | Core Web Vitals, schema, internal linking, AEO/GEO |
| `06_measurement` | GSC baselines, pruning audits, indexation health, cadences |
| `07_indexation` | Indexation decision tree, pruning framework, the mental model |
| `99_never-do` | Hard-stop rules |

---

## Three common tasks → which files to read

### Task 1 — "Build a new sales/service page"

1. **Start here:** `CORE__00_quickstart__build-new-page.md`
2. **Gate check:** `CORE__02_phase-0__should-this-page-exist.md` — must pass before any HTML is written
3. **Strategic principles:** all `CORE__01_strategic__*` files (8 minutes to read)
4. **Page structure:** `CORE__02_phase-2__canonical-section-order-and-html-additions.md`
5. **Content rules:** all `CORE__03_content__*` and `CORE__03_reader-momentum__*` files
6. **Meta:** `CORE__03_meta__title-and-description-rules.md`
7. **Frameworks:** `CORE__04_frameworks__*` — pick the relevant ones for the page
8. **Technical:** `CORE__05_technical__*` files
9. **QA before publishing:** `CORE__02_phase-2__content-quality-qa-checklist.md` then `CORE__02_phase-2__post-publication-indexation-checklist.md`
10. **If building for Stayful Airbnb-mgmt site:** add the `STAYFUL__*` overlay — start with `STAYFUL__brand__*`, `STAYFUL__lead-profiles__A-to-F.md`, `STAYFUL__objections__*`, `STAYFUL__phase-2-sections__stayful-specific-html.md`
11. **For HTML scaffolding:** copy from `HTML__*` files

### Task 2 — "Audit and optimise an existing page"

1. **Start here:** `CORE__00_quickstart__audit-existing-page.md`
2. **Run Phase 1:** `CORE__02_phase-1__audit-methodology.md` → `CORE__02_phase-1__competitor-and-keyword-research.md` → `CORE__02_phase-1__audit-report-format.md`
3. **If page is not indexed:** stop and run `CORE__07_indexation__decision-tree.md` first — the fix-list for a non-indexed page is different from a low-ranking indexed page
4. **Phase 2 fixes:** `CORE__02_phase-2__*` files in order
5. **Final checks:** `CORE__02_phase-2__content-quality-qa-checklist.md` + `CORE__02_phase-2__geo-ai-overview-checklist.md`

### Task 3 — "Clean up a site / quarterly pruning"

1. **Start here:** `CORE__00_quickstart__prune-and-consolidate.md`
2. **Mental model:** `CORE__07_indexation__vs-ranking-mental-model.md`
3. **Decision tree:** `CORE__07_indexation__decision-tree.md`
4. **Four-bucket classification:** `CORE__07_indexation__pruning-framework.md`
5. **Report template:** `TEMPLATE__pruning-report.md`
6. **Cadence:** `CORE__06_measurement__pruning-and-indexation-audits.md`

---

## Applying this to a non-Stayful website

The `CORE__*` files are the playbook. They contain no Stayful-specific facts, brand colours, lead profile instances or business assumptions. Read them as the universal "what Google rewards" rulebook.

To apply to a new business:

1. Read `CORE__*` end to end. The strategic gates (Part 1 of the doc) and the indexation decision tree (Part 5) are the highest-leverage sections.
2. Open `TEMPLATE__new-business-overlay-guide.md` — this is the master walk-through for creating a new business's overlay.
3. Fill in the blank templates: `TEMPLATE__brand-overlay-blank.md`, `TEMPLATE__lead-profiles-blank.md`, `TEMPLATE__objections-blank.md`, `TEMPLATE__use-and-never-language-blank.md`.
4. Save the completed files with a new prefix — e.g. `[NEW-BUSINESS]__brand__visual-identity.md`. The `CORE__` files do not change.

For other Stayful sites in the same niche (short-term rental estimates, contractor accommodation), most of the `STAYFUL__*` business facts, postcode data, and Airbnb-management-specific content does NOT carry over directly — those sites have different audiences, different messages, different proof points. Treat each as a new overlay using the templates.

---

## Source of truth

This knowledgebase is derived from **STAYFUL SEO ENGINE — MASTER INSTRUCTIONS v2.0 (15 May 2026)**. The master doc supersedes all prior versions. If a contradiction is found between any file here and the master doc, the master doc wins and the file should be corrected.

The cluster planner skill at `/mnt/skills/user/seo/SKILL.md` requires the amendments listed in Section 2.14 of the master doc — those amendments are reflected in this knowledgebase under `CORE__02_phase-0__should-this-page-exist.md` and the relevant Phase 1/Phase 2 files.

---

## What's NOT in this folder (yet)

- Overlay files for the rental-estimates site and contractor-accommodation site. When details are supplied, create them using `TEMPLATE__new-business-overlay-guide.md` and save with new prefixes.
- Backlink, competitor and keyword data exports — those are live datasets, not playbook content.
- The HTML pages themselves — only the components, schemas and patterns used to build them.

---

## Maintenance

- Update `CORE__*` only when Google's rules or general best practice changes.
- Update `STAYFUL__*` when business facts, competitor set, regional data, or current priorities change. Quarterly review recommended.
- Update `HTML__*` whenever the component library evolves.
- Re-run a full Phase 1 audit of every priority page annually (per Section 2.12 of the master doc).
