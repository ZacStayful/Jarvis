// lib/sales/server.ts
// Server-side helpers for the Sales Intelligence Dashboard.
// Shared between /api/sales, /api/sales/summary, /api/sales/summarise,
// and /api/sales/activity so the four chunk endpoints can each request
// only their slice without re-paginating Monday on every call.

import {
  MANAGEMENT_LEADS_BOARD,
  MANAGEMENT_LEADS_COLUMNS as COL,
  STATUS_LABELS,
  ACTIVITY_LOG_BOARD,
  ACTIVITY_LOG_COLUMNS,
} from '@/lib/monday-columns';

const MONDAY_URL = 'https://api.monday.com/v2';

export async function mondayQuery(query: string): Promise<any> {
  // Accept either env var name. The Lucy routes use MONDAY_API_KEY; the
  // sales spec calls for MONDAY_API_TOKEN. Try TOKEN first, fall back to
  // KEY so a single Monday token works regardless of which name is set
  // in Vercel.
  const token = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY;
  if (!token) {
    throw new Error(
      'Monday API token not set (expected MONDAY_API_TOKEN or MONDAY_API_KEY)',
    );
  }
  const res = await fetch(MONDAY_URL, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Monday API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

export function colVal(item: any, colId: string): string {
  const col = item?.column_values?.find((c: any) => c.id === colId);
  return col?.text || '';
}

export function isPopulated(item: any, colId: string): boolean {
  const col = item?.column_values?.find((c: any) => c.id === colId);
  if (!col) return false;
  if (col.text && col.text.trim()) return true;
  if (col.value && col.value !== '{}' && col.value !== 'null') return true;
  return false;
}

// ── Module-level cache so chunk endpoints don't each re-paginate ────────
// Single-flight: if a pagination for a given range is already in progress,
// concurrent callers await the same promise instead of starting their own.
// Without this, the four dashboard chunks firing in parallel each trigger
// their own pagination, blowing Monday's 5-req/sec rate limit.

interface LeadsCacheEntry {
  items: any[];
  fetchedAt: number;
}
const leadsCache = new Map<string, LeadsCacheEntry>();
const inflightLeads = new Map<string, Promise<any[]>>();
const LEADS_TTL_MS = 5 * 60 * 1000;

const COLUMN_IDS = [
  COL.status,
  COL.leadProfile,
  COL.presentationResponse,
  COL.callRecording,
  COL.specialOffer,
  COL.offerExpiry,
  COL.estAirbnbRent,
  COL.address,
  COL.email,
  COL.emailsSent,
  COL.wasNoShowed,
  COL.waStatus,
  COL.waMessagesSent,
  COL.waReplies,
  COL.waCompleted,
  COL.dateFirstQualified,
  COL.dateBecameCustomer,
];

async function paginateLeads({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}): Promise<any[]> {
  const columnIds = COLUMN_IDS.map((id) => `"${id}"`).join(', ');

  let allItems: any[] = [];
  let cursor: string | null = null;

  const firstQuery = `{
    boards(ids: [${MANAGEMENT_LEADS_BOARD}]) {
      items_page(limit: 200) {
        cursor
        items {
          id
          name
          created_at
          column_values(ids: [${columnIds}]) {
            id
            text
            value
          }
        }
      }
    }
  }`;

  const firstData = await mondayQuery(firstQuery);
  const firstPage = firstData.boards?.[0]?.items_page;
  if (firstPage?.items) allItems.push(...firstPage.items);
  cursor = firstPage?.cursor || null;

  while (cursor) {
    const nextQuery = `{
      next_items_page(limit: 200, cursor: "${cursor}") {
        cursor
        items {
          id
          name
          created_at
          column_values(ids: [${columnIds}]) {
            id
            text
            value
          }
        }
      }
    }`;
    const nextData = await mondayQuery(nextQuery);
    const nextPage = nextData.next_items_page;
    if (nextPage?.items) allItems.push(...nextPage.items);
    cursor = nextPage?.cursor || null;
  }

  // Date filter on created_at when supplied.
  if (from || to) {
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);
    allItems = allItems.filter((item) => {
      const created = new Date(item.created_at);
      return created >= fromDate && created <= toDate;
    });
  }

  return allItems;
}

export async function fetchAllLeads({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}): Promise<any[]> {
  const key = `${from || ''}|${to || ''}`;

  const cached = leadsCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < LEADS_TTL_MS) {
    return cached.items;
  }

  const existing = inflightLeads.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const items = await paginateLeads({ from, to });
      leadsCache.set(key, { items, fetchedAt: Date.now() });
      return items;
    } finally {
      inflightLeads.delete(key);
    }
  })();

  inflightLeads.set(key, promise);
  return promise;
}

// ── activity_logs probe ─────────────────────────────────────────────────

interface ProbeCache {
  available: boolean;
  checkedAt: number;
}
let activityProbe: ProbeCache | null = null;
let activityProbeInflight: Promise<boolean> | null = null;
const PROBE_TTL_MS = 10 * 60 * 1000;

export async function probeActivityLogs(): Promise<boolean> {
  if (activityProbe && Date.now() - activityProbe.checkedAt < PROBE_TTL_MS) {
    return activityProbe.available;
  }
  if (activityProbeInflight) return activityProbeInflight;

  activityProbeInflight = (async () => {
    try {
      const probeQuery = `{
        boards(ids: [${MANAGEMENT_LEADS_BOARD}]) {
          activity_logs(limit: 1) { id }
        }
      }`;
      const data = await mondayQuery(probeQuery);
      const logs = data?.boards?.[0]?.activity_logs;
      const available = Array.isArray(logs);
      activityProbe = { available, checkedAt: Date.now() };
      return available;
    } catch {
      activityProbe = { available: false, checkedAt: Date.now() };
      return false;
    } finally {
      activityProbeInflight = null;
    }
  })();

  return activityProbeInflight;
}

// ── Activity Log board (custom-populated, works on any plan) ────────────

export interface ActivityEvent {
  id: string;
  leadName: string;
  leadId: string;
  eventType: string;
  from: string;
  to: string;
  timestamp: string;
  source: string;
  notes: string;
}

export async function fetchActivityLogEvents({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}): Promise<{ events: ActivityEvent[]; activityLogsAvailable: boolean }> {
  // Try the dedicated Activity Log board first (works on any plan).
  try {
    const columnIds = [
      ACTIVITY_LOG_COLUMNS.leadName,
      ACTIVITY_LOG_COLUMNS.leadId,
      ACTIVITY_LOG_COLUMNS.eventType,
      ACTIVITY_LOG_COLUMNS.from,
      ACTIVITY_LOG_COLUMNS.to,
      ACTIVITY_LOG_COLUMNS.timestamp,
      ACTIVITY_LOG_COLUMNS.source,
      ACTIVITY_LOG_COLUMNS.notes,
    ]
      .map((id) => `"${id}"`)
      .join(', ');

    const query = `{
      boards(ids: [${ACTIVITY_LOG_BOARD}]) {
        items_page(limit: 200) {
          cursor
          items {
            id
            name
            created_at
            column_values(ids: [${columnIds}]) {
              id
              text
              value
            }
          }
        }
      }
    }`;

    const data = await mondayQuery(query);
    const items: any[] = data?.boards?.[0]?.items_page?.items ?? [];
    if (items.length > 0) {
      const fromDate = from ? new Date(from) : new Date(0);
      const toDate = to ? new Date(to) : new Date();
      toDate.setHours(23, 59, 59, 999);
      const events: ActivityEvent[] = items
        .map((it) => ({
          id: it.id,
          leadName: colVal(it, ACTIVITY_LOG_COLUMNS.leadName),
          leadId: colVal(it, ACTIVITY_LOG_COLUMNS.leadId),
          eventType: colVal(it, ACTIVITY_LOG_COLUMNS.eventType),
          from: colVal(it, ACTIVITY_LOG_COLUMNS.from),
          to: colVal(it, ACTIVITY_LOG_COLUMNS.to),
          timestamp:
            colVal(it, ACTIVITY_LOG_COLUMNS.timestamp) || it.created_at || '',
          source: colVal(it, ACTIVITY_LOG_COLUMNS.source),
          notes: colVal(it, ACTIVITY_LOG_COLUMNS.notes),
        }))
        .filter((e) => {
          if (!e.timestamp) return true;
          const t = new Date(e.timestamp);
          return t >= fromDate && t <= toDate;
        })
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      return { events, activityLogsAvailable: true };
    }
  } catch (err) {
    console.warn('[sales/activity] ACTIVITY_LOG_BOARD query failed:', err);
  }

  // Fall back to board-level activity_logs API.
  try {
    const fromIso = from ? new Date(from).toISOString() : undefined;
    const toIso = to
      ? new Date(`${to}T23:59:59.999Z`).toISOString()
      : undefined;
    const args = [
      'limit: 200',
      fromIso ? `from: "${fromIso}"` : null,
      toIso ? `to: "${toIso}"` : null,
    ]
      .filter(Boolean)
      .join(', ');
    const query = `{
      boards(ids: [${MANAGEMENT_LEADS_BOARD}]) {
        activity_logs(${args}) {
          id
          event
          entity
          data
          created_at
          user_id
        }
      }
    }`;
    const data = await mondayQuery(query);
    const logs: any[] = data?.boards?.[0]?.activity_logs ?? [];
    if (!Array.isArray(logs)) {
      return { events: [], activityLogsAvailable: false };
    }
    const events: ActivityEvent[] = logs.map((l) => {
      let parsed: any = {};
      try {
        parsed = typeof l.data === 'string' ? JSON.parse(l.data) : l.data || {};
      } catch {
        parsed = {};
      }
      return {
        id: String(l.id),
        leadName: parsed?.pulse_name || parsed?.name || '',
        leadId: String(parsed?.pulse_id || ''),
        eventType: l.event || '',
        from: parsed?.previous_value?.label?.text || parsed?.previous_value?.value || '',
        to: parsed?.value?.label?.text || parsed?.value?.value || '',
        timestamp: l.created_at,
        source: 'monday',
        notes: '',
      };
    });
    return { events, activityLogsAvailable: events.length > 0 };
  } catch (err) {
    console.warn('[sales/activity] boards.activity_logs failed:', err);
    return { events: [], activityLogsAvailable: false };
  }
}

// ── Metric builders ─────────────────────────────────────────────────────

export function buildPipeline(items: any[]) {
  const statusCount = (label: string) =>
    items.filter((i) => colVal(i, COL.status) === label).length;

  const total = items.length;
  const cold = statusCount(STATUS_LABELS.cold);
  const abandoned = statusCount(STATUS_LABELS.abandoned);
  const future = statusCount(STATUS_LABELS.future);
  const webMeetingBooked = statusCount(STATUS_LABELS.webMeetingBooked);
  const webMeetingNoShow = statusCount(STATUS_LABELS.webMeetingNoShow);
  const warm = statusCount(STATUS_LABELS.warm);
  const specialOffer = statusCount(STATUS_LABELS.specialOfferApplied);
  const customer = statusCount(STATUS_LABELS.customer);
  const attended = warm + specialOffer + customer;

  const wasNoShowedCount = items.filter((i) => {
    const raw = colVal(i, COL.wasNoShowed);
    return raw === 'true' || raw === 'Yes' || raw === 'v';
  }).length;

  return {
    cold,
    abandoned,
    future,
    webMeetingBooked,
    webMeetingNoShow,
    warm,
    specialOffer,
    customer,
    attended,
    qualificationDropoff:
      total > 0 ? Math.round((abandoned / total) * 100) : 0,
    futureRate: total > 0 ? Math.round((future / total) * 100) : 0,
    attendanceRate:
      attended + webMeetingNoShow > 0
        ? Math.round((attended / (attended + webMeetingNoShow)) * 100)
        : 0,
    noShowRate:
      attended + webMeetingNoShow > 0
        ? Math.round((webMeetingNoShow / (attended + webMeetingNoShow)) * 100)
        : 0,
    postMeetingConversion:
      warm + specialOffer + customer > 0
        ? Math.round((customer / (warm + specialOffer + customer)) * 100)
        : 0,
    overallConversion: total > 0 ? Math.round((customer / total) * 100) : 0,
    wasNoShowedCount,
  };
}

export function buildOutreach(items: any[]) {
  const total = items.length;
  const callsMade = items.filter((i) => isPopulated(i, COL.callRecording)).length;
  const emailsEngaged = items.filter((i) =>
    isPopulated(i, COL.presentationResponse),
  ).length;
  const totalEmailsSent = items.reduce((sum, i) => {
    const v = parseInt(colVal(i, COL.emailsSent) || '0', 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const waMessagesSent = items.reduce((sum, i) => {
    const v = parseInt(colVal(i, COL.waMessagesSent) || '0', 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const waReplies = items.reduce((sum, i) => {
    const v = parseInt(colVal(i, COL.waReplies) || '0', 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const waContacted = items.filter(
    (i) => parseInt(colVal(i, COL.waMessagesSent) || '0', 10) > 0,
  ).length;

  return {
    callsMade,
    emailsEngaged,
    totalEmailsSent,
    emailEngagementRate:
      total > 0 ? Math.round((emailsEngaged / total) * 100) : 0,
    waMessagesSent,
    waReplies,
    waContacted,
    waReplyRate:
      waContacted > 0 ? Math.round((waReplies / waContacted) * 100) : 0,
    waActive: waMessagesSent > 0,
  };
}

export function buildOffers(items: any[]) {
  const offersActive = items.filter((i) => isPopulated(i, COL.specialOffer));
  const now = new Date();
  const offers = offersActive.map((item) => {
    const expiryStr = colVal(item, COL.offerExpiry);
    const expiry = expiryStr ? new Date(expiryStr) : null;
    const daysLeft = expiry
      ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return {
      id: item.id,
      name: item.name,
      profile: colVal(item, COL.leadProfile),
      offerType: colVal(item, COL.specialOffer),
      expiry: expiryStr,
      daysLeft,
      status: colVal(item, COL.status),
      address: colVal(item, COL.address),
    };
  });

  const expiringThisWeek = offers.filter(
    (o) => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7,
  ).length;
  const expiringThisMonth = offers.filter(
    (o) => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 30,
  ).length;

  return {
    active: offers.length,
    expiringThisWeek,
    expiringThisMonth,
    items: offers.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
  };
}
