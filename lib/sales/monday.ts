// Monday.com data layer for the Sales Intelligence Dashboard.
// Centralises the GraphQL fetch + in-memory caching so each chunk can be
// computed cheaply on demand. Mirrors the HTTP pattern used by
// app/api/lucy/calls/route.ts — never the native mondayCom node pattern.

const BOARD_ID = process.env.MONDAY_BOARD_ID ?? '5891626711';
const MONDAY_KEY = process.env.MONDAY_API_TOKEN ?? process.env.MONDAY_API_KEY ?? '';

// ─── Known column IDs ─────────────────────────────────────────────────────────
// IDs marked OPTIONAL may not exist yet — the dashboard handles their absence
// gracefully and shows a "Tracking from setup date" pill rather than erroring.

export const COL = {
  status:                'status5',
  profile:               'text_mm1x8cgy',
  presentationResponse:  'long_text_mm2pse8d',
  callRecording:         'file_mm1daxvv',
  specialOfferType:      'dropdown_mm0wabga',
  specialOfferExpiry:    'date_mm0wdvyx',
  estimatedRent:         'numbers_mkn25e0y',
  propertyAddress:       'text6',
  email:                 'text_mkygb5xx',

  // OPTIONAL — Session 2 will create these
  dateFirstQualified:    'date_first_qualified',
  dateBecameCustomer:    'date_became_customer',
  emailsSent:            'numbers_emails_sent',
  waMessagesSent:        'numbers_wa_messages_sent',
  waReplies:             'numbers_wa_replies',
  waConversation:        'long_text_wa_conversation',
  waStatus:              'color_wa_status',
  wasNoShowed:           'checkbox_was_noshowed',
} as const;

// ─── Status values (must match Monday exactly) ────────────────────────────────

export const STATUS = {
  cold:        'Cold',
  abandoned:   'Abandoned',
  future:      'Future',
  bookedMtg:   'Web meeting booked',
  noShow:      'Web meeting no show',
  warm:        'Warm',
  offerApplied:'Special offer applied',
  customer:    'Customer',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MondayColumnValue {
  id: string;
  title?: string;
  text: string | null;
  value: string | null;
  type?: string;
}

export interface MondayItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  column_values: MondayColumnValue[];
}

export interface BoardSnapshot {
  items: MondayItem[];
  fetchedAt: string;
  itemCount: number;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Survives within a single warm Lambda instance. With Next's 5-minute
// revalidate hint and chunked client fetches, this is enough to keep Monday
// well under its 5 req/sec, 5000 complexity/min limits.

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return e.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + TTL_MS });
}

// ─── GraphQL transport ────────────────────────────────────────────────────────

export async function mondayQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data: T | null; errors: Array<{ message: string }> | null }> {
  if (!MONDAY_KEY) {
    throw new Error('MONDAY_API_TOKEN / MONDAY_API_KEY not set');
  }
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: MONDAY_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Monday API ${res.status}`);
  const json = await res.json();
  return { data: json.data ?? null, errors: json.errors ?? null };
}

// ─── Board snapshot ───────────────────────────────────────────────────────────
// One paginated fetch covers every chunk. We deliberately fetch column_values
// without filtering — Monday returns only columns that exist, so optional
// Session-2 columns appear or are silently absent.

export async function loadBoardSnapshot(): Promise<BoardSnapshot> {
  const cached = getCached<BoardSnapshot>('snapshot');
  if (cached) return cached;

  const all: MondayItem[] = [];
  let cursor: string | null = null;
  let pages = 0;

  // First page uses items_page with a cursor; subsequent pages use next_items_page.
  do {
    const query: string = cursor
      ? `query ($cursor: String!) {
           next_items_page(cursor: $cursor, limit: 100) {
             cursor
             items {
               id name created_at updated_at
               column_values { id title text value type }
             }
           }
         }`
      : `query {
           boards(ids: [${BOARD_ID}]) {
             items_page(limit: 100) {
               cursor
               items {
                 id name created_at updated_at
                 column_values { id title text value type }
               }
             }
           }
         }`;

    type PaginatedResponse = {
      boards?: Array<{ items_page: { cursor: string | null; items: MondayItem[] } }>;
      next_items_page?: { cursor: string | null; items: MondayItem[] };
    };
    const { data, errors }: { data: PaginatedResponse | null; errors: Array<{ message: string }> | null } =
      await mondayQuery<PaginatedResponse>(query, cursor ? { cursor } : {});

    if (errors?.length) throw new Error(errors.map(e => e.message).join('; '));

    const page: { cursor: string | null; items: MondayItem[] } | undefined = cursor
      ? data?.next_items_page
      : data?.boards?.[0]?.items_page;

    if (!page) break;
    all.push(...page.items);
    cursor = page.cursor;
    pages += 1;
    if (pages > 30) break; // safety: 3000 items max
  } while (cursor);

  const snapshot: BoardSnapshot = {
    items: all,
    fetchedAt: new Date().toISOString(),
    itemCount: all.length,
  };
  setCached('snapshot', snapshot);
  return snapshot;
}

// ─── Activity logs ────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  event: string;
  data: string;
  entity: string;
  user_id: string;
  created_at: string;
}

export interface ActivityResult {
  available: boolean;
  entries: ActivityLogEntry[];
  reason?: string;
}

export async function loadActivityLogs(
  fromISO: string,
  toISO: string
): Promise<ActivityResult> {
  const cacheKey = `activity:${fromISO}:${toISO}`;
  const cached = getCached<ActivityResult>(cacheKey);
  if (cached) return cached;

  try {
    const query = `
      query ($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
        boards(ids: [${BOARD_ID}]) {
          activity_logs(from: $from, to: $to, limit: 1000) {
            id event data entity user_id created_at
          }
        }
      }
    `;
    const { data, errors } = await mondayQuery<{
      boards?: Array<{ activity_logs: ActivityLogEntry[] | null }>;
    }>(query, { from: fromISO, to: toISO });

    if (errors?.length) {
      const result: ActivityResult = {
        available: false,
        entries: [],
        reason: errors.map(e => e.message).join('; '),
      };
      setCached(cacheKey, result);
      return result;
    }
    const entries = data?.boards?.[0]?.activity_logs ?? [];
    const result: ActivityResult = { available: true, entries };
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    const result: ActivityResult = {
      available: false,
      entries: [],
      reason: err instanceof Error ? err.message : 'activity_logs unavailable',
    };
    setCached(cacheKey, result);
    return result;
  }
}

// ─── Column helpers ───────────────────────────────────────────────────────────

export function getCol(item: MondayItem, id: string): MondayColumnValue | undefined {
  return item.column_values.find(c => c.id === id);
}

export function getColText(item: MondayItem, id: string): string {
  return getCol(item, id)?.text ?? '';
}

export function getColNumber(item: MondayItem, id: string): number | null {
  const txt = getColText(item, id);
  if (!txt) return null;
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
}

export function getColDate(item: MondayItem, id: string): Date | null {
  const txt = getColText(item, id);
  if (!txt) return null;
  const d = new Date(txt);
  return Number.isFinite(d.getTime()) ? d : null;
}

export function getColBoolean(item: MondayItem, id: string): boolean {
  const raw = getCol(item, id)?.value;
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.checked);
  } catch {
    return false;
  }
}

export function hasColumn(item: MondayItem, id: string): boolean {
  return !!getCol(item, id);
}

// ─── Date-range filter ────────────────────────────────────────────────────────

export function withinRange(date: Date | null, from: Date, to: Date): boolean {
  if (!date) return false;
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function parseRange(
  fromParam: string | null,
  toParam: string | null
): { from: Date; to: Date } {
  const now = new Date();
  const to = toParam ? new Date(toParam) : now;
  const from = fromParam
    ? new Date(fromParam)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}
