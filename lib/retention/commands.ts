// ─── Voice/text intent for the lead-database retention dashboard ─────────────
//
// Strict / loose per lib/intent-utils.ts. Kept narrow on purpose: Lucy owns
// bare "leads" / "pipeline" / "monday", the sales dashboard owns "conversion
// rate" and "web meeting stats" (the landlord pipeline), so this only fires
// on the lead database by name, "retention", "churn" or "subscribers".

import { isCommandShaped, normalise } from '@/lib/intent-utils';

const STRICT = [
  /\blead[\s-]?(?:database|db)\b/,
  /\bcustomer retention\b/,
  /\bretention (?:dashboard|numbers|figures|stats|view|report)\b/,
  /\bchurn rate\b/,
  /\bsubscriber (?:retention|churn|numbers|count|figures)\b/,
];

// Bare nouns — only when the utterance is command-shaped ("retention",
// "show me churn"), never mid-sentence ("the landlord asked about retention").
const LOOSE = [/\bretention\b/, /\bchurn\b/, /\bsubscribers\b/];

export type RetentionCommand = 'navigate' | null;

export function detectRetentionCommand(text: string): RetentionCommand {
  const n = normalise(text);
  if (!n) return null;
  if (STRICT.some(r => r.test(n))) return 'navigate';
  if (isCommandShaped(text) && LOOSE.some(r => r.test(n))) return 'navigate';
  return null;
}

// While the dashboard is open, a question about its numbers goes to Claude
// with the live data attached rather than to another view's detector —
// "what's the conversion rate" must not open the landlord sales dashboard.
const QUESTION_RE =
  /\b(leads?|enquir(?:y|ies)|meetings?|booked|bookings?|sat|no[- ]?shows?|conversion|convert(?:ing|ed)?|churn(?:ed)?|retention|customers?|subscribers?|cancel(?:led|ling|lations?)?|paused?|rates?|mrr|revenue|numbers?|metrics?|figures?|funnel|totals?|how many|percent(?:age)?|tenure|renew(?:ed|al|als)?|reasons?)\b/i;

export function isRetentionQuestion(text: string): boolean {
  return QUESTION_RE.test(text);
}

/** Explicit words for another view — these still navigate away. */
export const OTHER_VIEW_RE =
  /\b(news|briefing|lucy|portfolio|holdings|sales (?:dashboard|intelligence)|open sales|show sales|tasks?|command cent(?:re|er)|investments?|marketing|ads|department)\b/i;

export const CLOSE_RE = /\b(close|back|home|exit)\b/i;
