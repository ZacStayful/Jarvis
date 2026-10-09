// ─── Spoken lines: greetings, fillers, handovers, presence ────────────────────
//
// Everything here is instant and local — no Claude round-trip — so the app
// can speak the moment it opens or the moment Zac asks "are you there?".
// The banks live in lib/personas.ts; this file picks from them with time
// and weekday awareness. `pick` makes selection deterministic for tests.

import type { PersonaId } from '@/types/jarvis';
import { getPersona, type Persona, type TimeBand } from '@/lib/personas';

export const LONDON = 'Europe/London';

export interface LocalTimeParts {
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday … 6 = Saturday
  weekdayName: string;
  dateLabel: string; // "Thursday 9 October 2026"
  timeLabel: string; // "14:05"
  band: TimeBand;
  partOfDay: string; // "afternoon"
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function timeBandForHour(hour: number): TimeBand {
  if (hour < 6) return 'lateNight';
  if (hour < 9) return 'earlyMorning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'lateNight';
}

const PART_OF_DAY: Record<TimeBand, string> = {
  earlyMorning: 'early morning',
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  lateNight: 'late night',
};

/** Local time parts in a given zone (defaults to London; the server runs in UTC). */
export function localTimeParts(now: Date = new Date(), timeZone: string = LONDON): LocalTimeParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const weekdayName = get('weekday');
  const weekday = Math.max(0, WEEKDAYS.indexOf(weekdayName));
  const band = timeBandForHour(hour);
  return {
    hour,
    minute,
    weekday,
    weekdayName,
    dateLabel: `${weekdayName} ${get('day')} ${get('month')} ${get('year')}`,
    timeLabel: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    band,
    partOfDay: PART_OF_DAY[band],
  };
}

export function pickFrom<T>(items: T[], pick?: number): T {
  if (items.length === 0) throw new Error('pickFrom: empty list');
  const index =
    pick === undefined
      ? Math.floor(Math.random() * items.length)
      : ((pick % items.length) + items.length) % items.length;
  return items[index];
}

function resolve(p: PersonaId | Persona): Persona {
  return typeof p === 'string' ? getPersona(p) : p;
}

/**
 * Time-of-day greeting with weekday flavour (Monday / Friday / weekend),
 * in the persona's own words.
 */
export function buildGreeting(
  persona: PersonaId | Persona,
  now: Date = new Date(),
  pick?: number,
  timeZone: string = LONDON
): string {
  const p = resolve(persona);
  const t = localTimeParts(now, timeZone);
  const base = pickFrom(p.greetings[t.band], pick);

  const flavourBank =
    t.weekday === 1 ? p.weekday.monday :
    t.weekday === 5 ? p.weekday.friday :
    t.weekday === 0 || t.weekday === 6 ? p.weekday.weekend :
    null;

  // Add the weekday line roughly half the time so it doesn't become a tic.
  const useFlavour = flavourBank && flavourBank.length > 0 &&
    (pick === undefined ? Math.random() < 0.5 : pick % 2 === 0);

  return useFlavour ? `${base} ${pickFrom(flavourBank!, pick)}` : base;
}

export function thinkingLine(persona: PersonaId | Persona, pick?: number): string {
  return pickFrom(resolve(persona).thinkingLines, pick);
}

export function handoverLine(persona: PersonaId | Persona, pick?: number): string {
  return pickFrom(resolve(persona).handoverLines, pick);
}

export function presenceLine(persona: PersonaId | Persona, pick?: number): string {
  return pickFrom(resolve(persona).presenceResponses, pick);
}

export const NEWS_FEED_DOWN_LINE = "The news feed isn't responding, sir. I'll try again when you ask.";
