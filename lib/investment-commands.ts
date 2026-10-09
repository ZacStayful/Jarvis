// ─── Investment dashboard — client-side command detection ─────────────────────
//
// The live Investment Dashboard view used to be routed from the server
// (lib/commandRouter.ts) with patterns broad enough that "can you share the
// doc" flipped the model to Opus and opened the dashboard. Routing now lives
// with the other views in app/page.tsx, and only explicit phrases open it.

const STRICT: RegExp[] = [
  /\binvestment dashboard\b/i,
  /\b(?:open|show(?: me)?|pull up|bring up|go to|take me to|load)\s+(?:the\s+)?(?:investments?|markets?|stock market)\b/i,
  /\bmarket analysis\b/i,
  /\bfinancial (?:analysis|briefing|review)\b/i,
  /\bsector analysis\b/i,
  /\banaly[sz]e\s+(?:the\s+)?(?:stock|ticker|share price)\b/i,
  /\banaly[sz]e\s+\$?[A-Z]{2,5}\b/,
  /\bwhat should i (?:buy|sell|hold)\b/i,
  /\bBRRR\b/,
];

export interface InvestmentCommand {
  /** The original utterance, passed to the dashboard as its initial query. */
  query: string;
}

export function detectInvestmentCommand(text: string): InvestmentCommand | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return STRICT.some(re => re.test(trimmed)) ? { query: trimmed } : null;
}
