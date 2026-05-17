# Pruning Framework — Four Buckets

**Scope: Universal.** Domain-level quality is a real ranking factor. Removing weak pages can lift strong pages. For sites at scale, pruning is often higher-leverage than building.

This file defines the four-bucket classification and execution priority. The quarterly pruning audit (`CORE__06_measurement__pruning-and-indexation-audits.md`) uses this framework.

---

## The principle

Helpful Content systems evaluate sites holistically — what proportion of the site's content is high-utility for searchers. If the proportion is poor, every page receives a small negative adjustment.

**Strategic implication: forty strong indexed pages typically outperform two hundred pages of which only forty are indexed.**

The 160 non-indexed pages are not neutral. They pull down domain-quality signals while contributing zero ranking value. Pruning recovers indexation budget AND lifts the quality signal of remaining pages.

For sites at Stayful's scale (~580 URLs), pruning is often higher-leverage than building.

---

## The four-bucket classification

For every URL not indexed AND live for 90+ days, classify into one bucket.

### Bucket 1 — Keep and fix

**Criteria:**
- Targets a unique, high-impression query
- AND has fewer than 3 cluster siblings

**Action:**
- Escalate to Phase 1 audit
- Apply the Indexation Decision Tree (`CORE__07_indexation__decision-tree.md`)

These pages have genuine demand and clean cluster status — the indexation failure is a structural issue at Layer 1, 2, or 3 of the Decision Tree, fixable without consolidation.

### Bucket 2 — Consolidate via 301

**Criteria:**
- Has 3+ cluster siblings
- OR targets a query already served by another page

**Action:**
- 301 redirect into the canonical page
- No content rebuild

This is the highest-volume, lowest-effort, highest-impact category. Most pruning audits find that 40–60% of flagged URLs fall here.

Typical Bucket 2 candidates:

- `airbnb-management-[city]` and `holiday-let-management-[city]` and `short-let-management-[city]` — same intent, three URLs. Two of them 301 into the third (the canonical choice).
- `[city]` and `[city]-cost` — cost content belongs on the primary city page or a national cost hub.
- `cohost-[city]` and `setup-[city]` and `yield-[city]` — almost never earn their place. Consolidate.
- `[city]` and `in-[city]` — pure slug variants. One 301s into the other.

### Bucket 3 — Repurpose

**Criteria:**
- Has genuine topical interest
- BUT its current shape is wrong (wrong primary keyword, wrong page type, wrong audience)

**Action:**
- Rewrite to target a different query
- OR pivot to a different angle (different lead profile, different format)

Bucket 3 is the smallest category. Most pages flagged for indexation failure either have demand (Bucket 1) or duplicate intent (Bucket 2). Pages that genuinely have a different valid angle but were built wrong are rarer.

Typical Bucket 3 examples:

- A city page that was built as a service page but actually has demand for buyer-intent queries (Profile C, not B) — rewrite to match the actual intent
- A guide page targeting a low-volume query when a higher-volume query is uncontested — re-target

### Bucket 4 — Delete (or leave Squarespace-aliased)

**Criteria:**
- Tag archives
- Individual property case studies
- File downloads
- System aliases (e.g. `/airbnb-management-2`)
- Abandoned drafts

**Action:**
- noindex
- OR simply ignore — these are not significantly damaging if Google has correctly excluded them

Bucket 4 is the "leave alone" category. The pages don't need to exist but their continued presence is mostly harmless. Only address Bucket 4 if it's cluttering reports or confusing the workflow.

---

## Execution priority

Run buckets in this order:

### 1. Bucket 2 first

**Highest volume, lowest effort, highest domain-quality impact.**

A 301 is a one-line change in the CMS that:
- Recovers indexation budget immediately
- Removes a domain-quality drag
- Often improves the canonical page (it now receives the redirected page's link equity)

Most quarterly pruning audits should execute the Bucket 2 work entirely in a single session.

### 2. Bucket 1 second

Apply the Indexation Decision Tree to each. Time-consuming because each page needs its own diagnosis, but targeted and effective.

Schedule Bucket 1 work after Bucket 2 — the domain-quality lift from Bucket 2 work often improves Bucket 1 page indexation without further intervention.

### 3. Bucket 3 third

Selective rewrites only where the topical opportunity is real. Bucket 3 work is the most resource-intensive (it's essentially building a new page on the old URL). Reserve for cases where the topical opportunity is clear and uncontested.

### 4. Bucket 4 last

Only if cluttering reports. Often safe to ignore — Google has typically excluded these correctly.

If addressing Bucket 4, use `noindex` rather than deletion (preserves the URL history; cleaner if the URL later becomes useful).

---

## Mandatory: pruning is non-negotiable for new content verticals

If a new vertical is being built (e.g. holiday let cities alongside Airbnb management cities), the duplicate-intent pages in the older vertical **must be reviewed for consolidation or 301**:

- Either before the new vertical goes live
- OR no later than the new vertical going live

Skipping this guarantees cannibalisation at scale. The new vertical will compete with the old for the same intent, and Google's indexation system will choose one of the two — sometimes the wrong one.

---

## Pruning report output

Use `TEMPLATE__pruning-report.md` for the format:

```
PRUNING REPORT — Q[X] [YEAR]

Bucket 1 — Keep and fix (count: N)
  [URL] — [primary keyword] — [first failing layer from Decision Tree]

Bucket 2 — Consolidate via 301 (count: N)
  [URL] — 301 to [target URL] — reason

Bucket 3 — Repurpose (count: N)
  [URL] — current angle / proposed angle

Bucket 4 — Delete or ignore (count: N)
  [URL] — reason
```

---

## When the framework recommends inaction

Sometimes the right answer is "leave it alone":

- Bucket 4 with no business reason to clean up
- A Bucket 1 page with too few impressions to justify Phase 1 audit effort
- A Bucket 3 page where the alternative angle has no demand
- Any page that's been pruning-flagged for two consecutive quarters with no diagnostic progress

Inaction is a valid pruning outcome. The framework's job is to surface candidates; not every candidate needs intervention.

---

## Common failures

### Failure 1 — Treating every non-indexed page as Bucket 1

Running the Decision Tree on Bucket 2 candidates is wasted effort. The diagnosis is right (the page won't index) but the action is wrong (the page shouldn't index — it should 301).

### Failure 2 — Skipping Bucket 2 because it's "boring"

Bucket 2 work is the highest-leverage SEO work most weeks. Skipping it for more interesting Bucket 1 or Phase 2 work is the most common allocation mistake.

### Failure 3 — 301ing without choosing a canonical first

Three duplicate-intent pages exist; the audit recommends consolidation. The team 301s the two newer ones into the oldest one — but the oldest one is the weakest. The wrong page survives.

The correct sequence: identify the strongest page in the cluster (best content, most links, highest impressions). 301 the others into it. Optionally, rename the URL of the strongest page for clarity, but only after the 301s settle.

### Failure 4 — Bucket 3 work without query data

Re-purposing a page to target a different query, where the new query has no demand. The newly-shaped page also fails to index. Time wasted.

Bucket 3 work should always be paired with query data: GSC impressions on the alternative query, or PAA evidence that the alternative query has demand.

### Failure 5 — Adding pages while pruning audit is pending

Running a pruning audit but pausing the 301 work to launch a new cluster. The new cluster inherits the cannibalisation pressure. The audit's recommendations become harder to execute.

---

## How this applies to non-Stayful websites

The four-bucket framework is universal.

For an e-commerce site: SKU pages with overlapping intent are Bucket 2 candidates; deprecated product pages are Bucket 4; underperforming category pages with unique demand are Bucket 1.

For SaaS: redundant feature pages are Bucket 2; old pricing pages are Bucket 4; under-converting use-case pages with traffic are Bucket 1.

For publishers: redundant articles on the same topic are Bucket 2; old date-stamped news articles past relevance are Bucket 4; under-trafficked tutorials with demand are Bucket 1.

The execution priority (Bucket 2 first) applies equally.

---

## Related files

- `CORE__06_measurement__pruning-and-indexation-audits.md` — quarterly process and timing
- `CORE__07_indexation__decision-tree.md` — what to fix for Bucket 1 pages
- `CORE__01_strategic__pages-earn-their-place.md` — the criteria a page must pass to exist
- `CORE__01_strategic__navigation-and-internal-linking.md` — graded link value (affects which 301 source recovers most equity)
- `TEMPLATE__pruning-report.md` — pruning report template
