// lib/ads/speakers.ts
// Client-safe helpers for the two marketing directors: display labels and
// accent colours. Jarvis keeps the JARVIS green; Janet gets a soft rose so
// her parts are distinguishable in the chat and the department view.

import { C } from '@/lib/jarvis-design';
import type { Director } from '@/lib/ads/types';

export const DIRECTORS: Record<Director, { label: string; colour: string }> = {
  jarvis: { label: 'JARVIS', colour: C.primary },
  janet: { label: 'JANET', colour: '#d98cb3' },
};
