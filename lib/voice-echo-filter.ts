// Echo filter for voice barge-in.
//
// When JARVIS speaks via the speakers, the microphone picks up its own
// voice and the Web Speech recogniser emits partial transcripts of
// what JARVIS is saying. Without filtering, those partials trigger
// barge-in and JARVIS self-interrupts instantly.
//
// This filter compares a partial transcript against the text JARVIS is
// currently speaking. If they overlap enough, the partial is treated
// as echo and ignored. Otherwise it's treated as real user speech and
// the caller should stop TTS.
//
// Tuned for the trade-off:
// - Generous about flagging echo (false positives = JARVIS doesn't
//   stop when you want it to — recoverable by pressing Escape or
//   speaking longer/unique content).
// - Strict about flagging real speech (false negatives = JARVIS
//   self-interrupts — annoying and breaks the conversation).

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isLikelyEcho(partial: string, spoken: string): boolean {
  if (!spoken) return false;

  const p = normalise(partial);
  const s = normalise(spoken);

  // Too short to judge — treat as echo to avoid spurious interrupts
  // from one- or two-character noise blips.
  if (p.length < 3) return true;

  // Strong signal: partial appears verbatim inside the spoken text.
  if (s.includes(p)) return true;

  // Word-overlap fallback: if 60%+ of partial words appear anywhere in
  // the spoken text and there are at least 2 partial words, treat as
  // echo. Catches recogniser mis-hearings of JARVIS's own voice where
  // the substring check fails because of one or two transcribed words
  // being wrong.
  const pWords = p.split(' ').filter((w) => w.length > 1);
  if (pWords.length < 2) return false;
  const matches = pWords.filter((w) => s.includes(w)).length;
  return matches / pWords.length >= 0.6;
}
