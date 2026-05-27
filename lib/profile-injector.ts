// lib/profile-injector.ts
// Maps a lead's emotional_profile value to the matching psychology profile text
// injected into Lucy's prompt as {{psychology_profile_context}} per call.
// Falls back to DEFAULT (ANALYTICAL-EVALUATOR) when the profile is empty or unrecognised.

import profiles from '@/prompts/psychology-profiles.json';

const PROFILES: Record<string, string> = profiles;

export function getProfileContext(emotionalProfile?: string | null): string {
  if (!emotionalProfile) return PROFILES['DEFAULT'];

  const normalised = emotionalProfile.trim().toUpperCase().replace(/\s+/g, '-');

  return PROFILES[normalised] || PROFILES['DEFAULT'];
}
