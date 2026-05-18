// ─── Types ────────────────────────────────────────────────────────────────────

export type LucyCommandType =
  | 'navigate'      // Open the Lucy view
  | 'recommend'     // Fetch + show lead recommendations
  | 'trigger'       // Open approval card to start a campaign
  | 'calls'         // Show recent call results
  | 'analyse'       // Run deep pattern analysis
  | null;

// ─── Pattern definitions ──────────────────────────────────────────────────────

const PATTERNS: Array<{ type: LucyCommandType; tests: RegExp[] }> = [
  // Navigate — open the Lucy view
  {
    type: 'navigate',
    tests: [
      /^lucy$/i,
      /^open lucy$/i,
      /show lucy/i,
      /lucy view/i,
      /go to lucy/i,
      /lucy dashboard/i,
      /lucy centre/i,
      /lucy center/i,
      /lucy command/i,
      /open the lucy/i,
    ],
  },
  // Recommend — who should Lucy call
  {
    type: 'recommend',
    tests: [
      /who should lucy call/i,
      /lucy.{0,15}call list/i,
      /lucy.{0,15}recommend/i,
      /recommend.{0,15}lucy/i,
      /prepare.{0,20}lucy.{0,10}campaign/i,
      /lucy.{0,15}today/i,
      /which leads?.{0,10}lucy/i,
      /get lucy.{0,15}list/i,
      /lucy.{0,10}leads? today/i,
      /who.{0,10}lucy.{0,10}call/i,
      /build.{0,10}lucy.{0,10}list/i,
      /lucy.{0,10}shortlist/i,
    ],
  },
  // Trigger — start the approval flow
  {
    type: 'trigger',
    tests: [
      /trigger lucy/i,
      /run lucy/i,
      /start lucy/i,
      /launch lucy/i,
      /send lucy/i,
      /deploy lucy/i,
      /activate lucy/i,
      /lucy.{0,10}campaign/i,
      /queue.{0,10}lucy/i,
      /lucy.{0,10}go/i,
    ],
  },
  // Calls — view recent call results
  {
    type: 'calls',
    tests: [
      /lucy.{0,15}result/i,
      /lucy.{0,15}call data/i,
      /lucy.{0,15}stat/i,
      /how.{0,10}lucy.{0,10}doing/i,
      /lucy.{0,15}performance/i,
      /recent calls?/i,
      /lucy.{0,15}history/i,
      /lucy.{0,15}calls?/i,
      /call record/i,
      /who.{0,10}lucy.{0,10}called/i,
      /lucy.{0,10}numbers/i,
      /lucy.{0,10}outcomes?/i,
    ],
  },
  // Analyse — deep intelligence run
  {
    type: 'analyse',
    tests: [
      /analy[sz]e lucy/i,
      /lucy.{0,15}pattern/i,
      /lucy.{0,15}intelligence/i,
      /lucy.{0,15}insight/i,
      /call pattern/i,
      /objection pattern/i,
      /lucy.{0,10}deep/i,
      /deep.{0,10}lucy/i,
      /lucy.{0,10}report/i,
      /intelligence.{0,10}lucy/i,
      /run.{0,10}analy/i,
    ],
  },
];

// ─── Detection ────────────────────────────────────────────────────────────────

/**
 * Detect the Lucy command type from a user message.
 * Returns null if no Lucy intent is detected.
 */
export function detectLucyCommand(message: string): LucyCommandType {
  const input = message.trim();
  for (const { type, tests } of PATTERNS) {
    if (tests.some(rx => rx.test(input))) return type;
  }
  return null;
}

/**
 * Returns true if the message has any Lucy-related intent.
 */
export function hasLucyIntent(message: string): boolean {
  return detectLucyCommand(message) !== null;
}

// ─── JARVIS response text ─────────────────────────────────────────────────────
// What JARVIS says aloud/in-chat when routing to a Lucy command.

export const LUCY_BRIEFINGS: Record<NonNullable<LucyCommandType>, string> = {
  navigate:
    'Opening the Lucy Intelligence Centre.',

  recommend:
    'Scanning the pipeline. Identifying optimal targets based on profile, recency, and conversion probability.',

  trigger:
    'Loading campaign approval. Review the shortlist — nothing is queued until you confirm.',

  calls:
    'Retrieving call records from the pipeline now.',

  analyse:
    'Running deep analysis on Lucy\'s call data. I\'ll extract patterns, objection intelligence, and playbook recommendations. This will take a moment.',
};

// ─── Context for JARVIS system prompt ────────────────────────────────────────
// Injected into /api/chat when Lucy context is active.

export const LUCY_SYSTEM_CONTEXT = `
LUCY INTELLIGENCE CONTEXT

Lucy is Stayful's Retell AI cold-calling agent. JARVIS manages the Lucy loop:
- Reads lead data from Monday.com board 5891626711
- Scores leads using Stayful's profile and conversion intelligence
- Presents approval cards before any campaign is triggered
- Ingests post-call data and extracts patterns
- Updates lead intelligence in Obsidian (with Zac's approval)

Lucy command routes available:
- GET  /api/lucy/recommend → ranked lead shortlist for today's calls
- GET  /api/lucy/calls     → recent post-call records from Monday.com
- POST /api/lucy/analyse   → deep Claude Opus analysis of call patterns

When Zac asks about Lucy, always frame responses using Stayful's lead intelligence:
- Lead profiles: existing-property-stl, existing-stl-management, portfolio-landlord, purchasing-stl, selling-property, moving-abroad
- Primary objections: income consistency (certainty) and setup cost (timing)
- Framework: VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION
- Fast-path converts in 1-2 calls; slow-path leads should be qualified out by call 4-5

Never trigger Lucy without Zac's explicit approval. Always show the approval card first.
`;
