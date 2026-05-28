// lib/profile-injector.ts
// Maps a lead's emotional_profile to the single matching psychology profile
// text that gets injected into Lucy's prompt as {{psychology_profile_context}}.
// Only one profile is injected per call instead of all ten, keeping the live
// prompt lean. Falls back to DEFAULT (ANALYTICAL-EVALUATOR) when the profile
// is empty or unrecognised.

import profiles from '@/prompts/psychology-profiles.json';

const profileMap = profiles as Record<string, string>;

// Normalises input (trim, uppercase, spaces → hyphens) so "analytical evaluator"
// and "Analytical-Evaluator" both resolve to the ANALYTICAL-EVALUATOR key.
export function getProfileContext(emotionalProfile?: string | null): string {
  if (!emotionalProfile) return profileMap['DEFAULT'];
  const normalised = emotionalProfile.trim().toUpperCase().replace(/\s+/g, '-');
  return profileMap[normalised] || profileMap['DEFAULT'];
}
