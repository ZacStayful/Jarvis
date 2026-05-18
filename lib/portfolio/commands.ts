// Portfolio Intelligence Dashboard — voice/text command detection.
// Mirrors the lib/lucy-commands.ts pattern so the chat layer can detect
// "open portfolio" / "show my conviction" / etc. and switch views.

export type PortfolioCommandType =
  | 'navigate'   // open the dashboard
  | 'candidate'  // open the candidate evaluator (route TBD)
  | 'projection' // open the 50-year projection tool (route TBD)
  | null;

const PATTERNS: Array<{ type: PortfolioCommandType; tests: RegExp[] }> = [
  {
    type: 'navigate',
    // Naming: "Portfolio Dashboard" or "Conviction Tracker" — distinct from
    // Phase 5's live Investment Dashboard. Trigger phrases avoid the
    // overlap (no plain "investment").
    tests: [
      /portfolio dashboard/i,
      /portfolio intelligence/i,
      /portfolio tracker/i,
      /conviction tracker/i,
      /\bconviction\b/i,
      /billion lives/i,
      /\bholdings?\b/i,
      /\bmy positions?\b/i,
      /open portfolio/i,
      /show portfolio/i,
      /go to portfolio/i,
      /\bopen.{0,5}holdings?\b/i,
      /framework v2/i,
    ],
  },
  {
    type: 'candidate',
    tests: [
      /candidate evaluator/i,
      /evaluate.{0,10}(stock|company|candidate)/i,
      /run.{0,10}filter/i,
      /apply.{0,10}framework/i,
    ],
  },
  {
    type: 'projection',
    tests: [
      /projection/i,
      /50.?year/i,
      /fifty.?year/i,
      /wealth projection/i,
      /retirement projection/i,
    ],
  },
];

export function detectPortfolioCommand(message: string): PortfolioCommandType {
  for (const { type, tests } of PATTERNS) {
    if (tests.some(p => p.test(message))) return type;
  }
  return null;
}

export function hasPortfolioIntent(message: string): boolean {
  return detectPortfolioCommand(message) !== null;
}

// ─── System-prompt context block ──────────────────────────────────────────────
// Appended to the JARVIS system prompt when portfolio intent is detected, so
// Claude can speak about the dashboard with the framework's terminology and
// rules baked in. Mirrors the LUCY_SYSTEM_CONTEXT pattern in lucy-commands.ts.

export const PORTFOLIO_SYSTEM_CONTEXT = `
=== PORTFOLIO INTELLIGENCE DASHBOARD ===

You are also Zac's analyst for the Portfolio Intelligence Dashboard (Framework V2.0).
This is NOT a trading tool — it is a 30-year permanent-capital conviction tracker.

CORE FRAMEWORK
- Dual probability gate: every position is scored on
    P(1B lives transformed) × P(50yr corporate survival).
- A position holds only as long as both probabilities remain materially above
  the framework's thresholds.
- The framework uses three concentrated positions (~25% each) + a 25% S&P 500
  index floor (never reduced below). One candidate slot tracked separately.

CURRENT POSITIONS (per portfolio/data/holdings/*.json)
- TSLA — Tesla — "Physical-World AI" thesis, decision: hold w/ monitoring
- GOOGL — Alphabet — "Information Infrastructure" thesis, decision: hold
- VUSA — S&P 500 — index floor, never reduce below 25%
- SPCX — SpaceX — candidate watch (pre-IPO, not yet eligible per Stage 2
  revenue-IPQ check)

CRITICAL DATA STATE (read carefully)
The probability values in portfolio/data/holdings/*.json are currently
PLACEHOLDER ZEROS. The first quarterly update has not yet been run. When
Zac asks about specific probabilities, milestone statuses, risk triggers, or
trend deltas, do not invent numbers. Tell him plainly that the dashboard is
scaffolded but the Q[N] data has not been populated, and ask which quarter
he wants to populate.

ABSOLUTE RULES
- NEVER fetch live stock prices or auto-suggest buy/sell. This is a manual
  quarterly-cadence framework by design.
- NEVER recommend rebalancing without referencing the framework's rules
  (Section 5: MAX_POSITION_SIZE 35%, INDEX_FLOOR 25%, MIN_DIMENSIONS_FOR_REPLACEMENT 3).
- When discussing a position, frame against its dual-probability scores and
  any active Tier 1 risk triggers. If you don't have the data, ask.
- The view component is currently a minimal scaffold (KPI strip, position grid,
  developments feed). Deeper components (candidate evaluator, projection,
  per-holding deep-dives, charts, decision trees) are planned but not built.

When Zac opens this view, give him: one sentence acknowledgement, a concise
summary of what's on screen (positions + decision labels + flag that values
are placeholders if so), and a probing question — e.g. which holding he
wants to focus on, or whether he wants to run the first quarterly update.
=== END PORTFOLIO CONTEXT ===
`.trim();

