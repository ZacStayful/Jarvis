// ─── Intent utilities ─────────────────────────────────────────────────────────
//
// Shared helpers for every local voice-intent matcher. The convention across
// lib/voice-*.ts, lib/jarvis-design.ts, lib/lucy-commands.ts and
// lib/portfolio/commands.ts is:
//
//   strict patterns — explicit phrases ("open lucy", "what's the latest news")
//                     always match, anywhere in the utterance.
//   loose patterns  — bare nouns ("news", "monday", "holdings") only match
//                     when the utterance is *command-shaped*: it starts with
//                     a navigation verb, or it is very short.
//
// That split is what stops "I had a conversation with a landlord about the
// pipeline" opening the pipeline, while "open the pipeline" still does.

const LEADING_FILLER =
  /^(?:(?:hey|hi|hello|ok|okay|yo|right|so|um|uh|erm)\s+)*(?:(?:jarvis|janet)[,.:]?\s+)?(?:(?:please|can you|could you|would you|will you|i want to|i'd like to|i would like to|i need you to|let's|lets|just)\s+)*/;

const TRAILING_FILLER =
  /(?:\s+(?:please|now|for me|sir|jarvis|janet|thanks|thank you|cheers|mate))*\s*$/;

export const NAV_VERB_RE =
  /^(?:open|show(?: me)?|pull up|bring up|go to|take me to|switch to|load|run|launch|start|give me|get me|let'?s see|check|read me|play)\b/;

/**
 * Lowercase, strip punctuation, collapse whitespace, and drop the wake-word /
 * politeness run at either end ("hey jarvis, can you open the news please"
 * → "open the news").
 */
export function normalise(text: string): string {
  const lower = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return lower.replace(LEADING_FILLER, '').replace(TRAILING_FILLER, '').trim();
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * True when the utterance reads like a command rather than a sentence:
 * it starts with a navigation verb, or it is at most `maxWords` long.
 */
export function isCommandShaped(text: string, maxWords = 4): boolean {
  const n = normalise(text);
  if (!n) return false;
  return NAV_VERB_RE.test(n) || wordCount(n) <= maxWords;
}

/**
 * True when the whole (normalised) utterance is exactly `core` — used for
 * presence checks and stop words so they never fire mid-sentence.
 */
export function isWholeUtterance(text: string, core: RegExp): boolean {
  const n = normalise(text);
  if (!n) return false;
  return new RegExp(`^(?:${core.source})$`, core.flags.replace('g', '')).test(n);
}

/** True when any pattern matches the raw lowercase text. */
export function matchesAny(lower: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(lower));
}
