// ─── Date helpers for the retention dashboard (pure) ─────────────────────────
//
// Everything is compared on the London calendar day, YYYY-MM-DD. Monday's
// date cells come back as "YYYY-MM-DD" or "YYYY-MM-DD HH:MM" (the board's own
// local time); the activity log and created_at are ISO UTC.

import type { DateRange, RangePreset } from './types';

/** The board's first enquiry is 12 May 2026; "all" starts a little before. */
export const DATA_FLOOR = '2026-05-01';

const LONDON = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** ISO (or Date) → London YYYY-MM-DD. Returns null for an unparseable value. */
export function londonYmd(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const parts = LONDON.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** A Monday date cell ("2026-10-05 13:38" or "2026-10-05") → "2026-10-05". */
export function cellYmd(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function isYmd(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetweenYmd(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function inRange(ymd: string | null, range: DateRange): boolean {
  return !!ymd && ymd >= range.from && ymd <= range.to;
}

export function rangeForPreset(preset: RangePreset, now: Date = new Date()): DateRange {
  const to = londonYmd(now) ?? now.toISOString().slice(0, 10);
  switch (preset) {
    case '7d':
      return { from: addDaysYmd(to, -6), to };
    case '90d':
      return { from: addDaysYmd(to, -89), to };
    case 'all':
      return { from: DATA_FLOOR, to };
    case '30d':
    default:
      return { from: addDaysYmd(to, -29), to };
  }
}

/** Query-string bounds → a sane range (defaults to the last 30 days). */
export function parseRange(
  from: string | null | undefined,
  to: string | null | undefined,
  now: Date = new Date()
): DateRange {
  const fallback = rangeForPreset('30d', now);
  const f = isYmd(from) ? from : fallback.from;
  const t = isYmd(to) ? to : fallback.to;
  return f <= t ? { from: f, to: t } : { from: t, to: f };
}

/** "the last 30 days" / "since 12 May" — for speech. */
export function rangeLabel(range: DateRange, now: Date = new Date()): string {
  const today = londonYmd(now) ?? range.to;
  const days = daysBetweenYmd(range.from, range.to) + 1;
  if (range.to === today && range.from <= DATA_FLOOR) return 'since the board began';
  if (range.to === today && (days === 7 || days === 30 || days === 90)) return `the last ${days} days`;
  return `${speakDate(range.from)} to ${speakDate(range.to)}`;
}

/** "2026-05-12" → "12 May". */
export function speakDate(ymd: string | null | undefined): string {
  if (!isYmd(ymd)) return 'an unknown date';
  const d = new Date(`${ymd}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
}

/** "2026-05" → "May 2026". */
export function monthLabel(month: string): string {
  const d = new Date(`${month}-15T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
