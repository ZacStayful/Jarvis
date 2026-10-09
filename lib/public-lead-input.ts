// lib/public-lead-input.ts
// Input checks for the routes leads' browsers call directly (pre-qualifier
// and presentation pages). These can't be locked with a secret — anything in
// page JavaScript is public — so they only accept a numeric Monday item ID,
// known fields and bounded sizes. The Monday writes are already scoped to
// the management leads board.

const MAX_BODY_BYTES = 64 * 1024;

/** True when the declared body is larger than these pages ever send. */
export function bodyTooLarge(req: Request): boolean {
  const length = Number(req.headers.get('content-length') ?? 0);
  return Number.isFinite(length) && length > MAX_BODY_BYTES;
}

/** Monday item IDs are plain integers. */
export function isMondayItemId(value: unknown): boolean {
  return (typeof value === 'string' || typeof value === 'number') && /^\d{1,20}$/.test(String(value));
}

/** A string, number or boolean whose text is at most `max` characters.
 *  (The pages are generated outside this repo, so accept any scalar.) */
export function isShortValue(value: unknown, max: number): boolean {
  return (
    (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
    String(value).length <= max
  );
}

/** One presentation answer: a short scalar, null (unanswered), or a short
 *  list of scalars (multi-choice). */
export function isShortAnswer(value: unknown): boolean {
  if (value === null) return true;
  if (Array.isArray(value)) return value.length <= 20 && value.every((v) => isShortValue(v, 500));
  return isShortValue(value, 2000);
}

/** An optional whole number within [min, max]; digit strings count. */
export function isOptionalInt(value: unknown, min: number, max: number): boolean {
  if (value === undefined || value === null) return true;
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isInteger(n) && (n as number) >= min && (n as number) <= max;
}
