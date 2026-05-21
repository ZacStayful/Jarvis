// Echo filter for voice barge-in.
//
// When JARVIS speaks via the speakers, the microphone picks up its own
// voice and the Web Speech recogniser emits partial transcripts of
// what JARVIS is saying. Without filtering, those partials trigger
// barge-in and JARVIS self-interrupts instantly.
//
// This filter compares a partial transcript against the text JARVIS is
// currently speaking. If they overlap enough, the partial is treated
// as echo. The caller decides what to do with the verdict.
//
// CRITICAL DESIGN RULE: the filter is intentionally CONSERVATIVE about
// flagging echo — it would rather let a real echo through than block a
// legitimate user response. A blocked response (false positive) is a
// total UX failure: JARVIS appears to ignore the user. An unblocked
// echo (false negative) is a minor glitch: JARVIS may self-interrupt
// or respond to its own voice once, then continue.
//
// Specifically this filter MUST NOT flag short user responses that
// happen to share words with JARVIS's spoken text (e.g., answering
// "political news" to "what type of news would you like, sir? AI,
// political, regulatory…"). The caller should additionally gate the
// filter on `isSpeaking` for final transcripts — see app/page.tsx.

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isLikelyEcho(partial: string, spoken: string): boolean {
  if (!spoken) return false;

  const p = normalise(partial);
  const s = normalise(spoken);

  // Too short to judge — treat as noise (and echo, so the caller skips
  // it). Tiny < 3-char partials from the recogniser are usually fleeting
  // and will be replaced by longer partials within milliseconds.
  if (p.length < 3) return true;

  // Strong signal: partial appears as a whole word/phrase inside the
  // spoken text. We use word-boundary matching so "wait" doesn't match
  // inside "awaiting" — that was previously blocking legitimate
  // interrupts.
  const phraseBoundary = new RegExp(`\\b${escapeRegex(p)}\\b`);
  if (phraseBoundary.test(s)) return true;

  // Word-overlap fallback with CONTIGUITY requirement: at least one
  // adjacent two-word phrase from the partial must appear contiguously
  // in the spoken text. Without this, a 2-word user response like
  // "political news" gets flagged as echo of "…AI, political,
  // regulatory…" simply because both words appear somewhere.
  const pWords = p.split(' ').filter((w) => w.length > 1);
  if (pWords.length < 2) return false;

  let hasContiguousBigram = false;
  for (let i = 0; i < pWords.length - 1; i++) {
    const bigram = `${pWords[i]} ${pWords[i + 1]}`;
    const bigramBoundary = new RegExp(`\\b${escapeRegex(bigram)}\\b`);
    if (bigramBoundary.test(s)) {
      hasContiguousBigram = true;
      break;
    }
  }
  if (!hasContiguousBigram) return false;

  // Contiguous match confirmed AND word overlap is high (≥70%) → echo.
  const matches = pWords.filter((w) => {
    const wb = new RegExp(`\\b${escapeRegex(w)}\\b`);
    return wb.test(s);
  }).length;
  return matches / pWords.length >= 0.7;
}
