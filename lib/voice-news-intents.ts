// Voice-news-conversation phrase matchers.
//
// Used by app/page.tsx to intercept transcripts while the news briefing
// view is mounted. Returns either a category id (matches lib/newsCategories)
// or one of the conversational verbs ("stop", "no-more").
//
// Regex-only — no fuzzy matching, no LLM. Patterns are tight enough to
// avoid false positives in normal chat (e.g. "the rate of progress" won't
// match the interest-rates pattern because we look for "rate" as a noun
// in context with money words; see CATEGORY_PATTERNS ordering).

const STOP_PHRASES: RegExp[] = [
  /\b(stop|wait|pause|hold on|hold up|enough|quiet|silence|shut up)\b/,
  /\binterrupt\b/,
];

const NO_MORE_PHRASES: RegExp[] = [
  /\b(nothing|no more|no further|nothing else|that'?s all|that is all)\b/,
  /\b(no thank you|no thanks|all good|i'?m good|i am good|i'?m done|done)\b/,
  /^\s*no\.?\s*$/,
];

// Ordering matters — first match wins. Put more specific patterns first.
const CATEGORY_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: 'ai-tech', pattern: /\b(ai|a\.i\.|artificial intelligence|machine learning|tech|technology)\b/ },
  { id: 'uk-politics', pattern: /\b(politic|political|government|parliament|labour|tory|tories|conservative|downing street)\b/ },
  { id: 'regulatory', pattern: /\b(regulat|compliance|legal|licens|enforcement)\b/ },
  { id: 'interest-rates', pattern: /\b(interest rate|rate cut|rate hike|rates|monetary|inflation|boe|bank of england)\b/ },
  { id: 'str-property', pattern: /\b(short[- ]?term rental|str\b|property|rental|airbnb|housing|lettings?)\b/ },
  { id: 'competitor', pattern: /\b(competitor|competition|rival|sykes|sojo|holidu)\b/ },
  { id: 'international', pattern: /\b(international|global|world|overseas|abroad)\b/ },
  { id: 'uk-business', pattern: /\b(business|market|economy|economic|uk economy)\b/ },
];

export function isStopPhrase(lower: string): boolean {
  return STOP_PHRASES.some((p) => p.test(lower));
}

export function isNoMorePhrase(lower: string): boolean {
  return NO_MORE_PHRASES.some((p) => p.test(lower));
}

export function detectCategoryFocus(lower: string): string | null {
  for (const { id, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(lower)) return id;
  }
  return null;
}
