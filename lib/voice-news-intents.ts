// Voice-news-conversation phrase matchers.
//
// Used by app/page.tsx to intercept transcripts around the news briefing
// view. Regex-only — no fuzzy matching, no LLM.
//
// Convention (see lib/intent-utils.ts): explicit phrases match anywhere;
// bare nouns only match when the utterance is command-shaped. That is what
// keeps "any news from the landlord?" and "what does this mean for our
// business?" going to Claude while "open the news" and "political" (when
// just asked which category) still route locally.

import { isCommandShaped, normalise, wordCount } from '@/lib/intent-utils';

const STOP_CORE =
  /(?:ok |okay |right |jarvis |janet )?(?:stop|wait|pause|hold on|hold up|hang on|enough|quiet|silence|shut up|shh|interrupt)(?: (?:a )?(?:second|sec|moment|minute|there|please))?/;

const NO_MORE_CORE =
  /no|nope|nothing|no more|no further|nothing else|that'?s all|that is all|that'?s it|that'?ll do|no thank you|no thanks|all good|i'?m good|i am good|i'?m done|done|we'?re done|that'?s enough|leave it|close it|close the news|close the briefing/;

function wholeShort(text: string, core: RegExp, maxWords: number): boolean {
  const n = normalise(text);
  if (!n || wordCount(n) > maxWords) return false;
  return new RegExp(`^(?:${core.source})$`).test(n);
}

/** "stop" / "wait" — only as a short utterance, never mid-sentence. */
export function isStopPhrase(text: string): boolean {
  return wholeShort(text, STOP_CORE, 4);
}

/** "no thanks" / "that's all" — only as a short utterance. */
export function isNoMorePhrase(text: string): boolean {
  return wholeShort(text, NO_MORE_CORE, 4);
}

// Ordering matters — first match wins. Put more specific patterns first.
const CATEGORY_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'ai-tech', pattern: /\b(ai|a\.i\.|artificial intelligence|machine learning|tech|technology)\b/ },
  { id: 'uk-politics', pattern: /\b(politic|politics|political|government|parliament|labour|tory|tories|conservative|downing street)\b/ },
  { id: 'regulatory', pattern: /\b(regulat|regulation|regulatory|compliance|legal|licens|licensing|enforcement)\b/ },
  { id: 'interest-rates', pattern: /\b(interest rate|interest rates|rate cut|rate hike|rates|monetary|inflation|boe|bank of england)\b/ },
  { id: 'str-property', pattern: /\b(short[- ]?term rental|str|property|rental|airbnb|housing|lettings?)\b/ },
  { id: 'competitor', pattern: /\b(competitor|competitors|competition|rival|rivals|sykes|sojo|holidu)\b/ },
  { id: 'international', pattern: /\b(international|global|world|overseas|abroad)\b/ },
  { id: 'uk-business', pattern: /\b(business|market|markets|economy|economic|uk economy)\b/ },
];

export function detectCategoryFocus(lower: string): string | null {
  for (const { id, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(lower)) return id;
  }
  return null;
}

const NEWS_NOUN = /\b(news|briefing|headlines?|intelligence feed|bulletin)\b/;

// Explicit asks that are unmistakably about the news feed, in any sentence.
const NEWS_STRICT: RegExp[] = [
  /^(?:what'?s|whats|what is|what are)\s+(?:the\s+)?(?:latest|news|headlines)\b/,
  /\blatest\b.{0,20}\bnews\b/,
  /\bnews\s+(?:today|this morning|this afternoon|tonight|this evening)\b/,
  /\b(?:morning|daily|evening)\s+briefing\b/,
  /\bintelligence feed\b/,
  /\bwhat'?s happening (?:today|in the world|in the news|out there)\b/,
  /\b(?:catch me up|fill me in) on the news\b/,
];

/**
 * An explicit request for the news briefing. A bare news noun only counts
 * when the utterance is command-shaped ("open the news", "news please").
 */
export function isNewsRequest(text: string): boolean {
  const n = normalise(text);
  if (!n) return false;
  if (NEWS_STRICT.some(p => p.test(n))) return true;
  return NEWS_NOUN.test(n) && isCommandShaped(n, 5);
}

const SWITCH_VERB = /^(?:switch to|go to|change to|show me|show|now|what about|how about|and|try|just|only|do)\b/;

/**
 * While the briefing is open (or right after "what type?"), a category word
 * switches the feed — but only when it reads like a switch, not when it
 * happens to appear in a question ("what does this mean for our business?").
 */
export function isCategorySwitch(text: string, awaiting: boolean): string | null {
  const n = normalise(text);
  if (!n) return null;
  const category = detectCategoryFocus(n);
  if (!category) return null;
  if (awaiting) return category; // JARVIS just asked which category
  if (NEWS_NOUN.test(n)) return category;
  if (SWITCH_VERB.test(n) || isCommandShaped(n, 3)) return category;
  return null;
}

// Matches an explicit "summarise / recap" intent while the briefing is open,
// so "summarise the news" re-speaks what's on screen instead of asking
// "what type?". Short utterances or ones that name the news.
const SUMMARISE_PATTERNS: RegExp[] = [
  /\bsummari[sz]e\b/,
  /\bsummary\b/,
  /\brecap\b/,
  /\bgo (through|over)\b/,
  /\brun (through|me through)\b/,
  /\bread (it|this|them|through|out|to me|me the)\b/,
  /\btell me about (it|this|these|the news)\b/,
  /\bwalk me through\b/,
];

export function isSummariseRequest(text: string): boolean {
  const n = normalise(text);
  if (!n) return false;
  if (!SUMMARISE_PATTERNS.some(p => p.test(n))) return false;
  return wordCount(n) <= 8 || NEWS_NOUN.test(n);
}

// Natural spoken name for each category — avoids reading the full
// "AI & Technology" label through TTS (the ampersand stumbles).
const CATEGORY_VOICE_NAMES: Record<string, string> = {
  'ai-tech': 'AI news',
  'uk-politics': 'political news',
  'regulatory': 'regulatory news',
  'interest-rates': 'rates and monetary policy news',
  'str-property': 'property and short-term rental news',
  'competitor': 'competitor intelligence',
  'international': 'international news',
  'uk-business': 'UK business news',
};

export function categoryVoiceName(id: string): string {
  return CATEGORY_VOICE_NAMES[id] ?? 'news';
}
