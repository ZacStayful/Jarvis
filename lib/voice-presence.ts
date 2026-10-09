// Presence-check matcher — "are you there?", "Jarvis?", "Janet?".
// Intercepted locally so the active member of staff answers in <500ms
// instead of waiting for a Claude round-trip. Used by app/page.tsx before
// any other routing.
//
// Whole-utterance only. "Are you ready to go through the leads?" is a real
// question and must reach Claude; "are you ready?" on its own is a
// presence check.

import { isWholeUtterance } from '@/lib/intent-utils';
import { presenceLine } from '@/lib/jarvis-lines';
import type { PersonaId } from '@/types/jarvis';

const PRESENCE_CORE =
  /are you (?:there|listening|online|ready|awake|with me|about|around)|can you hear me|still (?:there|with me)|you there|do you (?:read|copy|hear) me|anyone there|hello|hi|hey|yo/;

// A bare wake word ("Jarvis?", "hey Janet") is a presence check too. It has
// to be matched on the raw text because normalise() strips wake words.
const BARE_WAKE_WORD = /^\s*(?:(?:hey|hi|hello|ok|okay|yo|right)[,\s]+)?(?:jarvis|janet)\s*[?.!,]*\s*$/i;

export function isPresenceCheck(text: string): boolean {
  if (BARE_WAKE_WORD.test(text)) return true;
  return isWholeUtterance(text, PRESENCE_CORE);
}

/** A short acknowledgement in the active speaker's own words. */
export function presenceResponse(persona: PersonaId = 'jarvis'): string {
  return presenceLine(persona);
}
