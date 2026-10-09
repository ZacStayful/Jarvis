// ─── Monday: the lead-database enquiries board (server only) ─────────────────
//
// Board 18420649520 "Stayful Lead database enquiries" is the sales funnel for
// operator prospects. Read-only here — the subscription labels and customer
// dates on it are written by the lead-database app from Stripe events, the
// sales labels by hand. Never write to this board from JARVIS.
//
// Two reads, both cached 5 minutes with single-flight:
//   fetchEnquiryItems()   — every item with the columns the funnel needs
//   fetchStatusHistory()  — the Status column's activity log (transitions)
//
// ⚠️ The board has two "Customer start date" columns. date_mm5ft19y is the
// one the lead-database app writes; date_mm6fhgrn (added 17 Aug) and
// "Customer cancelled date" date_mm6f8wy are unused duplicates — never read
// them (lead-database CLAUDE.md §23.1).

import { mondayQuery } from '@/lib/monday-client';
import { cellYmd } from './dates';
import type { EnquiryItem, StatusHistory, StatusTransition } from './types';

export const LEAD_DB_ENQUIRIES_BOARD = '18420649520';

export const ENQUIRY_COLUMNS = {
  status: 'color_mm5eda07',
  enquiryDate: 'date_mm50brxt',
  customerStart: 'date_mm5ft19y',
  customerEnd: 'date_mm5fxrbn',
  cancelReason: 'color_mm7n8j39',
  cancelComment: 'long_text_mm7nz39f',
  email: 'text_mm50e3d7',
  plan: 'text_mm50w01q',
  properties: 'text_mm50mt3h',
} as const;

// Exact label casing matters: "Management Customer" (capital C) but
// "Guaranteed rent customer" (lower r, lower c).
export const ENQUIRY_STATUS = {
  newEnquiry: 'New Enquiries',
  chasingToBook: 'Chasing to book',
  chasedNoBooking: 'Chased no booking',
  booked: 'Web meeting booked',
  sat: 'Web meeting sat',
  noShow: 'Web meeting no show',
  future: 'In the future',
  futureDueToCall: 'In the future due to call',
  abandoned: 'Abandoned',
  cancelledDueToContact: 'Cancelled due to contact',
  managementCustomer: 'Management Customer',
  guaranteedRentCustomer: 'Guaranteed rent customer',
  paused: 'Paused',
  cancelling: 'Cancelling',
  cancelled: 'Cancelled',
  cardDeclined: 'Wants to pay card declined',
} as const;

/** The six labels the lead-database app owns — all mean "was a customer". */
export const CUSTOMER_LABELS: readonly string[] = [
  ENQUIRY_STATUS.managementCustomer,
  ENQUIRY_STATUS.guaranteedRentCustomer,
  ENQUIRY_STATUS.paused,
  ENQUIRY_STATUS.cancelling,
  ENQUIRY_STATUS.cancelled,
  ENQUIRY_STATUS.cardDeclined,
];

export const MONDAY_TOKEN_MISSING_ERROR =
  'MONDAY_API_KEY is not set, so the lead-database enquiries board cannot be read';

export function hasMondayToken(): boolean {
  return Boolean(process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY);
}

// ─── Cache (5 min, single-flight, inflight cleared in finally) ───────────────

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: unknown; fetchedAt: number }>();
const inflight = new Map<string, Promise<Result<unknown>>>();

async function cached<T>(key: string, loader: () => Promise<T>): Promise<Result<T>> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL_MS) return { ok: true, data: hit.data as T };

  const pending = inflight.get(key);
  if (pending) return pending as Promise<Result<T>>;

  const request = (async (): Promise<Result<T>> => {
    try {
      const data = await loader();
      cache.set(key, { data, fetchedAt: Date.now() });
      return { ok: true, data };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error';
      return { ok: false, error: `${key}: ${reason}` };
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request as Promise<Result<unknown>>);
  return request;
}

/** Test hook / after a write elsewhere. */
export function invalidateRetentionMondayCache(): void {
  cache.clear();
}

// ─── Items ───────────────────────────────────────────────────────────────────

interface RawColumnValue {
  id: string;
  text: string | null;
}
interface RawItem {
  id: string;
  name: string;
  created_at: string;
  column_values: RawColumnValue[];
}
interface RawItemsPage {
  cursor: string | null;
  items: RawItem[];
}

const COLUMN_IDS_GQL = JSON.stringify(Object.values(ENQUIRY_COLUMNS));
const ITEM_FIELDS = `cursor items { id name created_at column_values(ids: ${COLUMN_IDS_GQL}) { id text } }`;

const blank = (text: string | null | undefined): string | null => {
  const t = (text ?? '').trim();
  return t ? t : null;
};

export function mapEnquiryItem(raw: RawItem): EnquiryItem {
  const col = new Map(raw.column_values.map(c => [c.id, c.text]));
  const get = (id: string) => blank(col.get(id));
  return {
    id: String(raw.id),
    name: raw.name,
    createdAt: raw.created_at,
    status: get(ENQUIRY_COLUMNS.status),
    enquiryDate: cellYmd(get(ENQUIRY_COLUMNS.enquiryDate)),
    customerStart: cellYmd(get(ENQUIRY_COLUMNS.customerStart)),
    customerEnd: cellYmd(get(ENQUIRY_COLUMNS.customerEnd)),
    cancelReason: get(ENQUIRY_COLUMNS.cancelReason),
    cancelComment: get(ENQUIRY_COLUMNS.cancelComment),
    email: get(ENQUIRY_COLUMNS.email),
    plan: get(ENQUIRY_COLUMNS.plan),
    properties: get(ENQUIRY_COLUMNS.properties),
  };
}

async function loadEnquiryItems(): Promise<EnquiryItem[]> {
  const items: EnquiryItem[] = [];
  const first = await mondayQuery(
    `query { boards(ids: [${LEAD_DB_ENQUIRIES_BOARD}]) { items_page(limit: 200) { ${ITEM_FIELDS} } } }`
  );
  let page: RawItemsPage | undefined = first?.boards?.[0]?.items_page;
  if (!page) throw new Error('board not found or no items_page in the response');
  items.push(...page.items.map(mapEnquiryItem));

  let guard = 0;
  while (page?.cursor && guard < 50) {
    guard += 1;
    const next = await mondayQuery(
      `query { next_items_page(cursor: "${page.cursor}", limit: 200) { ${ITEM_FIELDS} } }`
    );
    page = next?.next_items_page;
    if (!page) break;
    items.push(...page.items.map(mapEnquiryItem));
  }
  return items;
}

export async function fetchEnquiryItems(): Promise<Result<EnquiryItem[]>> {
  if (!hasMondayToken()) return { ok: false, error: MONDAY_TOKEN_MISSING_ERROR };
  return cached('lead-db enquiries board', loadEnquiryItems);
}

// ─── Status history (activity log) ───────────────────────────────────────────

interface RawActivityLog {
  id: string;
  event: string;
  /** 17-digit integer as a string, in units of 10⁻⁷ seconds since the epoch. */
  created_at: string;
  /** JSON string. */
  data: string;
}

const ACTIVITY_PAGE_SIZE = 500;
const ACTIVITY_MAX_PAGES = 10;

/** Monday's activity-log clock → ISO. Returns null for garbage. */
export function activityTimestampToIso(createdAt: string | number): string | null {
  const n = Number(createdAt);
  if (!Number.isFinite(n) || n <= 0) return null;
  // 17 digits ≈ 10⁻⁷ s; 13 ≈ ms; 10 ≈ s. Normalise by magnitude.
  const ms = n > 1e15 ? n / 10_000 : n > 1e11 ? n : n * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseStatusTransition(log: RawActivityLog, statusColumnId = ENQUIRY_COLUMNS.status): StatusTransition | null {
  if (log.event !== 'update_column_value') return null;
  let data: any;
  try {
    data = JSON.parse(log.data);
  } catch {
    return null;
  }
  if (!data || String(data.column_id) !== statusColumnId) return null;
  const to = blank(data?.value?.label?.text);
  if (!to) return null;
  const at = activityTimestampToIso(log.created_at);
  if (!at) return null;
  return {
    itemId: String(data.pulse_id),
    from: blank(data?.previous_value?.label?.text),
    to,
    at,
  };
}

async function loadStatusHistory(): Promise<StatusHistory> {
  const transitions: StatusTransition[] = [];
  let historyFrom: string | null = null;

  for (let page = 1; page <= ACTIVITY_MAX_PAGES; page += 1) {
    const res = await mondayQuery(
      `query { boards(ids: [${LEAD_DB_ENQUIRIES_BOARD}]) { activity_logs(limit: ${ACTIVITY_PAGE_SIZE}, page: ${page}, column_ids: ["${ENQUIRY_COLUMNS.status}"]) { id event created_at data } } }`
    );
    const logs: RawActivityLog[] = res?.boards?.[0]?.activity_logs ?? [];
    for (const log of logs) {
      const iso = activityTimestampToIso(log.created_at);
      if (iso && (!historyFrom || iso < historyFrom)) historyFrom = iso;
      const t = parseStatusTransition(log);
      if (t) transitions.push(t);
    }
    if (logs.length < ACTIVITY_PAGE_SIZE) break;
  }

  transitions.sort((a, b) => a.at.localeCompare(b.at));
  return { transitions, historyFrom };
}

export async function fetchStatusHistory(): Promise<Result<StatusHistory>> {
  if (!hasMondayToken()) return { ok: false, error: MONDAY_TOKEN_MISSING_ERROR };
  return cached('lead-db enquiries status history', loadStatusHistory);
}
