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
