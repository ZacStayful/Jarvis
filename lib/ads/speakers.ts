// lib/ads/speakers.ts
// Client-safe helpers for the two marketing directors.
//
// Department replies tag each director's part with [JARVIS] or [JANET] on
// its own line (see the MARKETING DEPARTMENT section of the system prompt).
// The raw tags stay in message history so the model keeps the format on
// follow-ups; the UI and voice use splitBySpeaker() to label and voice each
// part. Untagged text is Jarvis.

import { C } from '@/lib/jarvis-design';
import type { Director } from '@/lib/ads/types';

export const DIRECTORS: Record<Director, { label: string; colour: string }> = {
  jarvis: { label: 'JARVIS', colour: C.primary },
  janet: { label: 'JANET', colour: '#d98cb3' },
};

export interface SpeakerPart {
  speaker: Director;
  text: string;
}

const TAG_AT_LINE_START = /^[ \t]*\[(JARVIS|JANET)\][ \t]*/gim;
// A tag still streaming in at the very end, e.g. "…\n[JAN"
const PARTIAL_TAG_AT_END = /(^|\n)[ \t]*\[[A-Z]{0,6}$/;

export function hasSpeakerTags(text: string): boolean {
  return /^[ \t]*\[(JARVIS|JANET)\]/im.test(text);
}

/** Splits a reply into director parts. Text before the first tag belongs to
 *  Jarvis; consecutive parts by the same director are merged; empty parts
 *  are dropped. An untagged reply comes back as a single Jarvis part. */
export function splitBySpeaker(text: string): SpeakerPart[] {
  const source = text.replace(PARTIAL_TAG_AT_END, '$1');
  const parts: SpeakerPart[] = [];
  const push = (speaker: Director, chunk: string) => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    const last = parts[parts.length - 1];
    if (last && last.speaker === speaker) last.text = `${last.text}\n\n${trimmed}`;
    else parts.push({ speaker, text: trimmed });
  };

  let speaker: Director = 'jarvis';
  let cursor = 0;
  for (const match of source.matchAll(TAG_AT_LINE_START)) {
    push(speaker, source.slice(cursor, match.index));
    speaker = match[1].toLowerCase() as Director;
    cursor = (match.index ?? 0) + match[0].length;
  }
  push(speaker, source.slice(cursor));
  return parts;
}

/** Janet's ElevenLabs voice. Undefined when NEXT_PUBLIC_JANET_VOICE_ID isn't
 *  set, in which case /api/speak falls back to Jarvis's voice. The env var
 *  is referenced literally so Next inlines it at build time. */
export function janetVoiceId(): string | undefined {
  return process.env.NEXT_PUBLIC_JANET_VOICE_ID || undefined;
}
