// Sales Intelligence Dashboard — voice/text command detection.
// Mirrors the lib/lucy-commands.ts pattern. Navigation routes to /sales,
// chunk-focus phrases are handled on the dashboard page itself.

export type SalesCommandType =
  | 'navigate'         // open the dashboard
  | 'focus-pipeline'   // chunk 01
  | 'focus-outreach'   // chunk 02
  | 'focus-meetings'   // chunk 03
  | 'focus-offers'     // chunk 04
  | 'summarise'        // AI briefing for the focused chunk
  | 'next-section'
  | 'previous-section'
  | 'close'            // leave the dashboard
  | null;

const PATTERNS: Array<{ type: NonNullable<SalesCommandType>; tests: RegExp[] }> = [
  // Close — must run before navigate so "close sales" wins over "sales"
  {
    type: 'close',
    tests: [
      /\bclose\s+sales\b/i,
      /\bexit\s+sales\b/i,
      /\bback\s+to\s+jarvis\b/i,
      /\bleave\s+sales\b/i,
    ],
  },
  // Navigate to /sales
  {
    type: 'navigate',
    tests: [
      /\bopen\s+sales\b/i,
      /\bsales\s+dashboard\b/i,
      /\bsales\s+intelligence\b/i,
      /\bshow\s+sales\b/i,
      /\bgo\s+to\s+sales\b/i,
      /\bshow\s+me\s+the\s+pipeline\b/i,
      /\bhow\s+are\s+we\s+doing\b/i,
      /\bwhat'?s\s+our\s+conversion\s+rate\b/i,
      /\bhow'?s\s+the\s+pipeline\b/i,
    ],
  },
  // Chunk focus — pipeline (01)
  {
    type: 'focus-pipeline',
    tests: [
      /\bfocus\s+on\s+pipeline\b/i,
      /\bshow\s+me\s+the\s+funnel\b/i,
      /\bshow\s+the\s+funnel\b/i,
      /\bopen\s+the\s+funnel\b/i,
      /^pipeline$/i,
      /\bfocus\s+pipeline\b/i,
    ],
  },
  // Chunk focus — outreach (02)
  {
    type: 'focus-outreach',
    tests: [
      /\bfocus\s+on\s+outreach\b/i,
      /\bshow\s+outreach\b/i,
      /\bcalls\s+and\s+emails?\b/i,
      /\boutreach\s+metrics?\b/i,
      /\bfocus\s+outreach\b/i,
    ],
  },
  // Chunk focus — web meetings (03)
  {
    type: 'focus-meetings',
    tests: [
      /\bfocus\s+on\s+meetings?\b/i,
      /\bweb\s+meetings?\b/i,
      /\bshow\s+meetings?\b/i,
      /\bmeeting\s+metrics?\b/i,
      /\bfocus\s+meetings?\b/i,
    ],
  },
  // Chunk focus — special offers (04)
  {
    type: 'focus-offers',
    tests: [
      /\bshow\s+me\s+offers?\b/i,
      /\bspecial\s+offers?\b/i,
      /\boffers?\s+expiring\b/i,
      /\bfocus\s+(on\s+)?offers?\b/i,
    ],
  },
  // Summarise the focused chunk
  {
    type: 'summarise',
    tests: [
      /^summari[sz]e$/i,
      /\bsummari[sz]e\s+this\b/i,
      /\bgive\s+me\s+the\s+briefing\b/i,
      /\bbrief\s+me\b/i,
      /\bai\s+summary\b/i,
    ],
  },
  // Next / previous chunk
  {
    type: 'next-section',
    tests: [
      /\bnext\s+section\b/i,
      /\bnext\s+chunk\b/i,
      /\bmove\s+on\b/i,
    ],
  },
  {
    type: 'previous-section',
    tests: [
      /\bprevious\s+section\b/i,
      /\bprevious\s+chunk\b/i,
      /\bgo\s+back\s+one\b/i,
      /\bback\s+one\b/i,
    ],
  },
];

export function detectSalesCommand(message: string): SalesCommandType {
  const input = message.trim();
  for (const { type, tests } of PATTERNS) {
    if (tests.some(rx => rx.test(input))) return type;
  }
  return null;
}

export function hasSalesIntent(message: string): boolean {
  return detectSalesCommand(message) !== null;
}

// ─── Chunk metadata used by the dashboard ────────────────────────────────────

export const CHUNK_ORDER = ['pipeline', 'outreach', 'meetings', 'offers'] as const;
export type ChunkId = (typeof CHUNK_ORDER)[number];

export const CHUNK_META: Record<ChunkId, {
  index: string;
  name: string;
  voiceHint: string;
}> = {
  pipeline: { index: '01', name: 'Pipeline Funnel',  voiceHint: 'say "focus on pipeline"' },
  outreach: { index: '02', name: 'Outreach Channels', voiceHint: 'say "focus on outreach"' },
  meetings: { index: '03', name: 'Web Meetings',      voiceHint: 'say "focus on meetings"' },
  offers:   { index: '04', name: 'Special Offers',    voiceHint: 'say "show me offers"' },
};

export function commandToChunk(cmd: SalesCommandType): ChunkId | null {
  switch (cmd) {
    case 'focus-pipeline': return 'pipeline';
    case 'focus-outreach': return 'outreach';
    case 'focus-meetings': return 'meetings';
    case 'focus-offers':   return 'offers';
    default: return null;
  }
}
