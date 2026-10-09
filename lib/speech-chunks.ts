// ─── Sentence chunking for streaming speech ───────────────────────────────────
//
// Claude's reply streams in token by token; we want to start speaking the
// first sentence while the rest is still generating. These helpers decide
// which part of the text-so-far is safe to send to TTS.

/** Strip markdown so it isn't read aloud as punctuation. */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/^[ \t]*\[(JARVIS|JANET)\][ \t]*$/gim, '') // speaker tags (lib/ads/speakers.ts)
    .replace(/\[(JARVIS|JANET)\]/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')          // fenced code
    .replace(/^#{1,6}\s+/gm, '')              // headings
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')  // bold / italic
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')    // underscore emphasis
    .replace(/`([^`]+)`/g, '$1')              // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links → text
    .replace(/^\s*[-•*]\s+/gm, '')            // bullets
    .replace(/^\s*\d+\.\s+/gm, '')            // numbered lists
    .replace(/^\s*\|.*\|\s*$/gm, '')          // table rows
    .replace(/\n{2,}/g, '. ')                 // paragraph breaks
    .replace(/\n/g, ' ')                      // single newlines
    .replace(/\s{2,}/g, ' ')
    .replace(/(\.\s*){2,}/g, '. ')
    .trim();
}

/**
 * Terminal blocks that must never be spoken or rendered mid-stream. Text is
 * cut at the first one.
 */
export function speakablePortion(text: string): string {
  const cut = ['<action_request', '<handoff']
    .map(tag => text.indexOf(tag))
    .filter(i => i >= 0);
  return cut.length ? text.slice(0, Math.min(...cut)) : text;
}

interface Sentence {
  text: string;
  /** Index just past the sentence (including trailing whitespace). */
  end: number;
}

/**
 * Complete sentences in `text`: punctuation [.!?] optionally followed by a
 * closing quote/bracket, then whitespace. A decimal like "3.5%" has no
 * whitespace after the dot, so it never splits.
 */
export function completeSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[.!?]+["')\]]*(?=\s)/g;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let end = m.index + m[0].length;
    while (end < text.length && /\s/.test(text[end])) end++;
    const sentence = text.slice(start, end).trim();
    if (sentence) out.push({ text: sentence, end });
    start = end;
    re.lastIndex = end;
  }
  return out;
}

export interface ChunkResult {
  chunks: string[];
  /** New value for the caller's spokenUpTo cursor (in raw text offsets). */
  upTo: number;
}

/**
 * Decide what to speak next from a reply that is still streaming.
 *
 * - `first`: nothing of this message has been spoken yet, so the very first
 *   complete sentence goes out on its own (speech starts as early as
 *   possible). After that, sentences accumulate to about `minChars` so
 *   the TTS requests aren't tiny.
 * - `final`: the stream has finished; everything left is flushed.
 */
export function nextSpeakableChunks(
  text: string,
  spokenUpTo: number,
  opts: { first: boolean; final?: boolean; minChars?: number }
): ChunkResult {
  const minChars = opts.minChars ?? 60;
  const safe = speakablePortion(text);
  if (spokenUpTo >= safe.length) return { chunks: [], upTo: spokenUpTo };
  const pending = safe.slice(spokenUpTo);

  if (opts.final) {
    const spoken = stripMarkdownForSpeech(pending);
    return { chunks: spoken ? [spoken] : [], upTo: safe.length };
  }

  const sentences = completeSentences(pending);
  const chunks: string[] = [];
  let group = '';
  let consumed = 0; // offset within `pending` up to the last emitted group
  let first = opts.first;

  for (const s of sentences) {
    group = group ? `${group} ${s.text}` : s.text;
    if (first || group.length >= minChars) {
      const spoken = stripMarkdownForSpeech(group);
      if (spoken) chunks.push(spoken);
      group = '';
      consumed = s.end;
      first = false;
    }
  }

  // Complete sentences still in `group` haven't reached minChars; they stay
  // unconsumed for the next tick or the final flush.
  return { chunks, upTo: spokenUpTo + consumed };
}
