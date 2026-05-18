# Portfolio Intelligence Dashboard — Claude Code Project Guide

> **Purpose**: This guide tells Claude Code everything it needs to know to build,
> maintain, and extend the Portfolio Intelligence Dashboard. Read this file first
> before touching any other file under `portfolio/`, `lib/portfolio/`,
> `components/portfolio/`, or `hooks/portfolio/`.
>
> **Scope**: This is one feature inside the JARVIS app, not a standalone project.
> All paths in this guide that reference `/src/`, `/data/`, `/framework/` should
> be read as nested under the JARVIS repo:
>   - `framework/` → `portfolio/framework/`
>   - `data/` → `portfolio/data/`
>   - `src/lib/` → `lib/portfolio/`
>   - `src/components/` → `components/portfolio/`
>   - `src/hooks/` → `hooks/portfolio/`
>   - Routes live under `app/portfolio/...` (App Router)

---

## 1. PROJECT IDENTITY

**What this is**: A live, interactive investment intelligence dashboard for a
permanent-capital, billion-lives thesis framework. It is **not** a generic finance
app. Every design and architecture decision must serve the framework's philosophy:
disciplined, evidence-driven, 30-year horizon thinking.

**Owner**: Zac Harrison
**Framework version**: V2.0 (May 2026)
**Lives at**: a route inside JARVIS — `/portfolio` (initial) and possibly
`/portfolio/candidate`, `/portfolio/projection`, `/portfolio/holding/[ticker]`.
**Tech stack** (inherited from JARVIS): Next.js 16 + React 19 + TypeScript +
Tailwind v4 + Vercel.
**Data strategy**: Static JSON in `portfolio/data/` + manual quarterly update
cycle. No live market data APIs.

---

## 2. NON-NEGOTIABLE DESIGN PRINCIPLES

1. Every UI decision must reflect the framework's philosophy: disciplined,
   evidence-based, long-horizon. No noise. No gamification.
2. The dual probability scores — **P(1B lives)** and **P(50yr survive)** — are
   the headline metrics. Every component exists to support or explain them.
3. Framework text in `portfolio/framework/` is the source of truth. Never
   contradict it in UI copy.
4. Data in `portfolio/data/*.json` is manually updated quarterly. Never
   auto-fetch live prices.

## WHAT THIS IS NOT

- NOT a trading tool
- NOT a stock screener
- NOT a generic finance dashboard
- It is a CONVICTION TRACKER for a 30-year permanent capital framework.

---

## 3. KEY ARCHITECTURE DECISIONS

| Decision | Rationale |
|---|---|
| Static JSON, manually updated | Live data APIs introduce noise and encourage short-term thinking. Quarterly cadence IS the philosophy. |
| Routes per section | Deep-linkable from a phone — `/portfolio/candidate` reaches the evaluator directly. |
| Recharts for charts | Already in JARVIS's dep tree's TypeScript stack expectations. Do not swap without instruction. |
| Mermaid for decision trees | Client-side only to avoid SSR issues. |
| Semantic colour tokens | Custom colours defined in `globals.css` (`--color-pass`, `--color-thesis`, etc.) so they're tweakable in one place. |

---

## 4. HOW TO DO A QUARTERLY UPDATE (the primary recurring task)

When Zac says "run the Q[N] update" or "update the dashboard for Q[N] [year]":

1. Read all files in `portfolio/data/holdings/*.json` and
   `portfolio/data/risk-triggers.json`
2. Ask Zac for the new data points in this order:
   a. Tesla: P(1B lives), P(50yr), milestone statuses, risk trigger statuses
   b. Google: same
   c. SpaceX: same
   d. Portfolio-level: current allocation %, monthly contribution, last review date
   e. Developments: top 5–7 items for the quarter
3. Update ONLY the JSON files in `portfolio/data/` — never hardcode data in
   components.
4. Increment `frameworkVersion` in `portfolio-meta.json` if the framework itself
   changed.
5. Update `nextReviewDate` in `portfolio-meta.json`.
6. Commit message format: `Q[N] [year] quarterly update — [key change summary]`

DO NOT touch `portfolio/framework/` files during a quarterly update unless Zac
explicitly says the framework itself has changed.

---

## 5. DATA SCHEMAS (canonical TypeScript types live in `lib/portfolio/types.ts`)

### `portfolio/data/portfolio-meta.json`

```typescript
interface PortfolioMeta {
  frameworkVersion: string;           // "2.0"
  investorName: string;               // "Zac Harrison"
  monthlyContribution: number;        // 1666 (GBP)
  lastReviewDate: string;             // ISO date
  nextReviewDate: string;
  nextFullFrameworkReview: string;
  portfolioStructure: {
    concentratedPositions: number;
    concentratedAllocationEach: number;
    indexFloorAllocation: number;
    maxPositionSize: number;
  };
  kpis: {
    avgDualProbability: number;
    tier1TriggersActive: number;
    tier1TriggersTotal: number;
    daysToNextReview: number;
  };
}
```

### `portfolio/data/holdings/[ticker].json`

```typescript
interface HoldingData {
  ticker: string;
  name: string;
  subtitle: string;
  allocation: number;
  isCandidate: boolean;
  decision: 'add' | 'hold' | 'hold-monitoring' | 'watch' | 'reduce';
  decisionLabel: string;
  thesis: string;
  probabilities: {
    billionLives: { value: number; trend: 'up'|'flat'|'down'; trendDelta: number; drivers: string };
    fiftyYear:    { value: number; trend: 'up'|'flat'|'down'; trendDelta: number; drivers: string };
  };
  riskTriggers: Array<{ description: string; status: 'clear'|'watch'|'triggered'; note: string }>;
  sources: string[];
  billionLivesProgressHistory: Array<{ quarter: string; score: number | null }>;
  milestones: {
    tier1: Array<{ description: string; status: 'on-time'|'late'|'modified'|'abandoned'|'pending'; expectedDate: string; notes: string }>;
    tier2: Array<{ description: string; status: string; notes: string }>;
    tier3: Array<{ description: string; status: string; notes: string }>;
  };
}
```

### `portfolio/data/developments.json`

```typescript
interface DevelopmentsData {
  quarter: string;
  items: Array<{ tag: 'TSLA'|'GOOGL'|'SPCX'|'MACRO'; text: string; isSignificant: boolean }>;
}
```

### `portfolio/data/risk-triggers.json`

```typescript
interface RiskTriggers {
  lastUpdated: string;
  holdings: { [ticker: string]: Array<{ description: string; threshold: string; currentValue: string; status: 'clear'|'watch'|'triggered' }> };
}
```

---

## 6. FRAMEWORK CONSTANTS — DO NOT DERIVE FROM UI

Live in `lib/portfolio/framework-constants.ts` (already created in the
scaffolding commit). Never hardcode in components. If the framework changes,
update that file only.

Key values:
- STAGE_2_PASS_THRESHOLD = 8
- STAGE_2_WATCHLIST_THRESHOLD = 5
- MAX_POSITION_SIZE = 0.35
- INDEX_FLOOR = 0.25
- MONTHLY_CONTRIBUTION_GBP = 1666
- MIN_DIMENSIONS_FOR_REPLACEMENT = 3
- REPLACEMENT_TIMELINE_MONTHS = [3, 6]
- MILESTONE_ABANDONED_YELLOW = 1
- MILESTONE_ABANDONED_RED = 2
- PROJECTION_SCENARIOS: { conservative: 11%, realistic: 16%, optimistic: 22% }
- STAGE_2_CHECKS: 8 checklist items
- STAGE_4_CHECKS: 5 checklist items

---

## 7. COLOUR SYSTEM

Defined in `app/globals.css` as CSS variables. Use the semantic tokens, not raw
Tailwind colours.

| Token | Hex | Usage |
|---|---|---|
| `--color-pass` | `#16a34a` | Passing filters, clear status, positive |
| `--color-watch` | `#ca8a04` | Yellow flags, monitoring, borderline |
| `--color-triggered` | `#dc2626` | Fired triggers, rejected candidates |
| `--color-thesis` | `#0f172a` | Master thesis bar, primary headings |
| `--color-surface` | `#f8fafc` | Card backgrounds |
| `--color-border` | `#e5e7eb` | Borders |
| `--color-muted` | `#64748b` | Secondary text |
| `--color-tsla` | `#dc2626` | Tesla tag |
| `--color-googl` | `#1d4ed8` | Google tag |
| `--color-spcx` | `#7c3aed` | SpaceX tag |
| `--color-macro` | `#475569` | Macro tag |

---

## 8. WHAT CLAUDE CODE MUST NEVER DO IN THIS FEATURE

- ❌ Fetch live stock prices or market data
- ❌ Add per-feature auth — relies on JARVIS's existing login
- ❌ Change framework thresholds without explicit instruction
- ❌ Use a different chart library than Recharts
- ❌ Hardcode probability values in components
- ❌ Change the dual-probability framing
- ❌ Auto-rebalance or suggest buy/sell

---

## 9. SCAFFOLD STATUS (when this guide was written)

✅ Folder structure created (`portfolio/framework/`, `portfolio/data/holdings/`,
   `lib/portfolio/`, `components/portfolio/`, `hooks/portfolio/`)
✅ `lib/portfolio/types.ts` — TypeScript interfaces
✅ `lib/portfolio/framework-constants.ts` — constants from Section 6
✅ Placeholder JSON data files (Tesla, Google, S&P 500, SpaceX, meta,
   risk-triggers, developments) — VALUES ARE PLACEHOLDERS, replace in first
   quarterly update
✅ `components/portfolio/PortfolioView.tsx` — minimal scaffold view
✅ Navigation wired (voice / text command "open portfolio" routes here)

⬜ Framework markdown content in `portfolio/framework/*.md` — currently just
   section headers; populate from the V2.0 master doc
⬜ Component groups still to build: positions/ filters/ decisions/ risks/
   charts/ projection/ sectors/ developments/ principles/
⬜ Routes: `/portfolio/candidate`, `/portfolio/projection`,
   `/portfolio/holding/[ticker]`
⬜ Recharts wire-up
⬜ Mermaid decision trees
⬜ Q[N] data values (first real update populates `portfolio/data/`)

---

## 10. CHANGELOG

```
2026-05-18 — v1.0 scaffold inside JARVIS
             Framework V2.0 encoded as source of truth (constants only;
             markdown content TBD)
             Initial data schemas in place
             PortfolioView placeholder mounted at /portfolio route
```

---

*This guide is the contract between the repo and Claude Code for the portfolio
feature. Keep it updated. If it conflicts with code, update the guide first,
then fix the code.*
