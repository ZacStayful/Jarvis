// ─── Persona switch / address detection ───────────────────────────────────────
//
// Zac talks to a two-person team. He can switch who he's talking to with a
// bare command ("switch to Janet", "get JARVIS") or by addressing someone at
// the start of a sentence ("Janet, what angle should we run next?").
//
// Talking ABOUT the other person must not switch: "Janet mentioned the hook
// yesterday" stays with whoever is active. A leading name only counts as an
// address when it is followed by a comma/colon or by a question / request
// opener.

import type { PersonaId } from '@/types/jarvis';
import { isPersonaId } from '@/lib/personas';

export interface PersonaSwitch {
  persona: PersonaId;
  /** What was said after the address; empty for a bare switch. */
  remainder: string;
}

const NAME = '(jarvis|janet)';

const BARE_SWITCH: RegExp[] = [
  new RegExp(`^(?:(?:hey|ok|okay|right)\\s+)?(?:switch|change|swap|go|hand)(?:\\s+(?:me\\s+)?over)?\\s+to\\s+${NAME}\\b(?:\\s+please)?[.!?]*$`),
  new RegExp(`^(?:(?:hey|ok|okay|right)\\s+)?(?:get|fetch|bring\\s+in|bring|put\\s+on|pass\\s+me\\s+(?:over\\s+)?to|put\\s+me\\s+(?:through|over)\\s+to|let\\s+me\\s+(?:talk|speak)\\s+(?:to|with)|can\\s+i\\s+(?:talk|speak)\\s+(?:to|with)|i\\s+want\\s+to\\s+(?:talk|speak)\\s+(?:to|with)|i'?d\\s+like\\s+to\\s+(?:talk|speak)\\s+(?:to|with)|talk\\s+to|speak\\s+to|wake\\s+up|wake)\\s+${NAME}\\b(?:\\s+please)?[.!?]*$`),
  new RegExp(`^(?:is\\s+)?${NAME}\\s+(?:there|around|available|about|in)\\??[.!]*$`),
  new RegExp(`^${NAME}\\s+please[.!?]*$`),
  new RegExp(`^(?:over\\s+to\\s+you,?\\s+)${NAME}[.!?]*$`),
];

// "Janet, …" / "Janet: …" — punctuation makes the address unambiguous.
const ADDRESS_WITH_PUNCT = new RegExp(
  `^(?:(?:hey|hi|hello|ok|okay|right)\\s+)?${NAME}\\s*[,:;.!?-]+\\s*(.+)$`
);

// "Janet what angle…" — no punctuation (speech recognisers drop it), so the
// remainder has to open like a question or a request.
const ADDRESS_NO_PUNCT = new RegExp(
  `^(?:(?:hey|hi|hello|ok|okay|right)\\s+)?${NAME}\\s+((?:what|which|how|why|when|where|who|whose|can|could|would|will|do|does|did|is|are|was|were|should|shall|have|has|tell|give|show|draft|write|run|pull|check|look|let'?s|lets|i\\s+need|i\\s+want|we\\s+need|open|take|bring|get|help|remind|find|summarise|summarize|explain|think|any|anything)\\b.*)$`
);

export function detectPersonaSwitch(
  text: string,
  active: PersonaId
): PersonaSwitch | null {
  const lower = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!lower) return null;

  for (const re of BARE_SWITCH) {
    const m = lower.match(re);
    if (m && isPersonaId(m[1])) {
      return { persona: m[1], remainder: '' };
    }
  }

  const punct = lower.match(ADDRESS_WITH_PUNCT);
  const bare = punct ? null : lower.match(ADDRESS_NO_PUNCT);
  const m = punct ?? bare;
  if (m && isPersonaId(m[1])) {
    const persona = m[1];
    // Keep the remainder in the user's original casing/punctuation where we
    // can — the matched remainder starts at the same offset in the raw text.
    const remainder = m[2].trim();
    if (persona === active) return null; // already talking to them
    return { persona, remainder };
  }

  return null;
}
