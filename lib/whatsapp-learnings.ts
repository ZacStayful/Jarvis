// lib/whatsapp-learnings.ts
// Stub for future learnings storage. Session 5 will replace this with
// a real read against an external store. For now, returns null always
// so callers fall back to template defaults.

export interface LeadLearnings {
  best_opening_message: string
  best_followup_message: string
  conversion_rate: number
}

// TODO Session 5: replace with real storage read.
export async function getLearningsForProfile(
  _profileType: string,
): Promise<LeadLearnings | null> {
  return null
}
