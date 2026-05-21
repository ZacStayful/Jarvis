// Pure metric calculations for the Sales Intelligence Dashboard.
// Each function takes the cached snapshot + date window and returns the
// shape expected by a chunk. No fetching here — that's lib/sales/monday.ts.

import {
  COL,
  STATUS,
  getColText,
  getColDate,
  getColNumber,
  getColBoolean,
  hasColumn,
  withinRange,
  type MondayItem,
  type ActivityResult,
} from './monday';

// ─── Common helpers ───────────────────────────────────────────────────────────

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function itemCreatedInRange(item: MondayItem, from: Date, to: Date): boolean {
  return withinRange(new Date(item.created_at), from, to);
}

function statusOf(item: MondayItem): string {
  return getColText(item, COL.status);
}

// True if any item on the board has a populated value for this column id —
// our proxy for "this column exists".
function columnPopulatedAnywhere(items: MondayItem[], id: string): boolean {
  return items.some(i => {
    const c = i.column_values.find(cv => cv.id === id);
    return !!(c && c.text && c.text.trim());
  });
}

function columnExists(items: MondayItem[], id: string): boolean {
  return items.some(i => hasColumn(i, id));
}

// ─── Pipeline funnel (Chunk 01) ───────────────────────────────────────────────

export interface PipelineMetrics {
  coldLeads: number;
  abandoned: number;
  future: number;
  webMeetingBooked: number;
  webMeetingNoShow: number;
  warm: number;
  specialOfferApplied: number;
  customers: number;

  qualificationDropoffPct: number;
  futureRatePct: number;
  attendanceRatePct: number;
  noShowRatePct: number;
  reEngagementRatePct: number;
  postMeetingConversionPct: number;
  overallConversionPct: number;

  reEngagementSource: 'activity_logs' | 'checkbox' | 'none';
  reEngagementCount: number;

  funnel: Array<{ stage: string; count: number; dropoffFromPrev: number | null }>;
}

export function computePipeline(
  items: MondayItem[],
  from: Date,
  to: Date,
  activity: ActivityResult
): PipelineMetrics {
  // Volume by status — date-filtered where it makes sense.
  // For "cold leads in range" we filter by created_at (lead arrived in window).
  // For pipeline-stage counts we use current status; once Session 2 adds
  // milestone date columns we'll switch those to historical filtering.
  const coldLeads     = items.filter(i => statusOf(i) === STATUS.cold && itemCreatedInRange(i, from, to)).length;
  const abandoned     = items.filter(i => statusOf(i) === STATUS.abandoned).length;
  const future        = items.filter(i => statusOf(i) === STATUS.future).length;
  const webBooked     = items.filter(i => statusOf(i) === STATUS.bookedMtg).length;
  const noShow        = items.filter(i => statusOf(i) === STATUS.noShow).length;
  const warm          = items.filter(i => statusOf(i) === STATUS.warm).length;
  const offerApplied  = items.filter(i => statusOf(i) === STATUS.offerApplied).length;
  const customers     = items.filter(i => statusOf(i) === STATUS.customer).length;

  // Total cold-pipeline volume = anyone who entered the funnel in range.
  // If date_first_qualified exists, use that; otherwise fall back to created_at.
  const coldTotalEverInRange = coldLeads + abandoned + future + webBooked + noShow + warm + offerApplied + customers;

  // Web meeting attendance = (warm + offer + customer) / web booked
  const meetingAttended = warm + offerApplied + customers;

  // Re-engagement: prefer activity_logs, fall back to checkbox.
  let reEngagementCount = 0;
  let reEngagementSource: PipelineMetrics['reEngagementSource'] = 'none';

  if (activity.available && activity.entries.length) {
    // Walk per-item event histories. Anyone whose status transitioned through
    // "Web meeting no show" and later back to "Web meeting booked" counts.
    const perItem = new Map<string, string[]>();
    for (const log of activity.entries) {
      // status change events typically have event === 'update_column_value'
      // and data containing the new value text. Without strict schema we look
      // for status names appearing in the data blob in chronological order.
      try {
        const parsed = JSON.parse(log.data || '{}');
        const itemId = parsed.pulse_id?.toString() ?? parsed.item_id?.toString();
        const value =
          parsed.value?.label?.text ??
          parsed.value?.label ??
          parsed.column_title ??
          parsed.text;
        if (!itemId || typeof value !== 'string') continue;
        const list = perItem.get(itemId) ?? [];
        list.push(value);
        perItem.set(itemId, list);
      } catch {
        /* ignore malformed entry */
      }
    }
    for (const events of perItem.values()) {
      const sawNoShow = events.findIndex(e => e === STATUS.noShow);
      const reBooked  = events.findIndex((e, i) => i > sawNoShow && e === STATUS.bookedMtg);
      if (sawNoShow >= 0 && reBooked > sawNoShow) reEngagementCount += 1;
    }
    reEngagementSource = 'activity_logs';
  } else if (columnExists(items, COL.wasNoShowed)) {
    // Anyone with checkbox ticked who is now back in a downstream stage.
    const downstream: string[] = [STATUS.bookedMtg, STATUS.warm, STATUS.offerApplied, STATUS.customer];
    reEngagementCount = items.filter(i =>
      getColBoolean(i, COL.wasNoShowed) && downstream.includes(statusOf(i))
    ).length;
    reEngagementSource = 'checkbox';
  }

  return {
    coldLeads,
    abandoned,
    future,
    webMeetingBooked: webBooked,
    webMeetingNoShow: noShow,
    warm,
    specialOfferApplied: offerApplied,
    customers,

    qualificationDropoffPct: pct(abandoned, coldLeads || coldTotalEverInRange),
    futureRatePct:           pct(future,    coldLeads || coldTotalEverInRange),
    attendanceRatePct:       pct(meetingAttended, webBooked),
    noShowRatePct:           pct(noShow, webBooked),
    reEngagementRatePct:     pct(reEngagementCount, noShow),
    postMeetingConversionPct:pct(customers, warm + offerApplied),
    overallConversionPct:    pct(customers, coldTotalEverInRange),

    reEngagementSource,
    reEngagementCount,

    funnel: [
      { stage: 'Cold',                  count: coldLeads,        dropoffFromPrev: null },
      { stage: 'Web meeting booked',    count: webBooked,        dropoffFromPrev: pct(coldLeads - webBooked, coldLeads) },
      { stage: 'Attended',              count: meetingAttended,  dropoffFromPrev: pct(webBooked - meetingAttended, webBooked) },
      { stage: 'Warm / Offer',          count: warm + offerApplied, dropoffFromPrev: pct(meetingAttended - (warm + offerApplied), meetingAttended) },
      { stage: 'Customer',              count: customers,        dropoffFromPrev: pct((warm + offerApplied) - customers, (warm + offerApplied)) },
    ],
  };
}

// ─── Outreach (Chunk 02) ──────────────────────────────────────────────────────

export interface OutreachMetrics {
  calls: {
    made: number;
    leadsCalled: number;
    meetingRatePct: number;
  };
  email: {
    leadsEngaged: number;
    totalLeads: number;
    engagementRatePct: number;
    meetingRatePct: number;
  };
  whatsapp: {
    available: boolean;
    sent: number;
    replies: number;
    replyRatePct: number;
    meetingRatePct: number;
  };
}

export function computeOutreach(items: MondayItem[], from: Date, to: Date): OutreachMetrics {
  const inRange = items.filter(i => itemCreatedInRange(i, from, to));
  const totalLeads = inRange.length || items.length; // fall back to full board

  // Calls
  const calledItems = items.filter(i => !!getColText(i, COL.callRecording).trim());
  const calledAndBooked = calledItems.filter(i => statusOf(i) === STATUS.bookedMtg).length;

  // Email engagement (a populated presentation response = lead engaged)
  const engaged = items.filter(i => !!getColText(i, COL.presentationResponse).trim());
  const engagedAndBooked = engaged.filter(i => statusOf(i) === STATUS.bookedMtg).length;

  // WhatsApp
  const waPresent =
    columnExists(items, COL.waMessagesSent) ||
    columnExists(items, COL.waStatus) ||
    columnExists(items, COL.waConversation);

  let waSent = 0;
  let waReplies = 0;
  let waBooked = 0;
  if (waPresent) {
    for (const i of items) {
      waSent    += getColNumber(i, COL.waMessagesSent) ?? 0;
      waReplies += getColNumber(i, COL.waReplies) ?? 0;
      if ((getColText(i, COL.waStatus) || '').toLowerCase() === 'booked') waBooked += 1;
    }
  }

  return {
    calls: {
      made: calledItems.length,
      leadsCalled: calledItems.length,
      meetingRatePct: pct(calledAndBooked, calledItems.length),
    },
    email: {
      leadsEngaged: engaged.length,
      totalLeads,
      engagementRatePct: pct(engaged.length, totalLeads),
      meetingRatePct:    pct(engagedAndBooked, engaged.length),
    },
    whatsapp: {
      available: waPresent,
      sent: waSent,
      replies: waReplies,
      replyRatePct: pct(waReplies, waSent),
      meetingRatePct: pct(waBooked, waSent ? items.filter(i => (getColNumber(i, COL.waMessagesSent) ?? 0) > 0).length : 0),
    },
  };
}

// ─── Web meetings (Chunk 03) ──────────────────────────────────────────────────

export interface WebMeetingMetrics {
  attendanceRatePct: number;
  noShowRatePct: number;
  reEngagementRatePct: number;
  postMeetingClosePct: number;

  warmCount: number;
  offerCount: number;
  customerCount: number;
  warmToCustomerPct: number;
  offerToCustomerPct: number;

  avgDaysToConvert: number | null;
  hasMilestoneDates: boolean;
  trackingFromNote: string | null;
}

export function computeWebMeetings(
  items: MondayItem[],
  pipeline: PipelineMetrics
): WebMeetingMetrics {
  const warm     = pipeline.warm;
  const offer    = pipeline.specialOfferApplied;
  const customer = pipeline.customers;

  // Avg days to convert: requires date_became_customer (and ideally a booking
  // date). If either is absent we surface the "tracking from setup" note.
  const hasCustomerDate = columnExists(items, COL.dateBecameCustomer);
  const hasQualifyDate  = columnExists(items, COL.dateFirstQualified);

  let avgDays: number | null = null;
  if (hasCustomerDate && hasQualifyDate) {
    const diffs: number[] = [];
    for (const i of items) {
      if (statusOf(i) !== STATUS.customer) continue;
      const c = getColDate(i, COL.dateBecameCustomer);
      const q = getColDate(i, COL.dateFirstQualified);
      if (c && q) diffs.push((c.getTime() - q.getTime()) / (1000 * 60 * 60 * 24));
    }
    if (diffs.length) avgDays = Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10;
  }

  return {
    attendanceRatePct:    pipeline.attendanceRatePct,
    noShowRatePct:        pipeline.noShowRatePct,
    reEngagementRatePct:  pipeline.reEngagementRatePct,
    postMeetingClosePct:  pipeline.postMeetingConversionPct,

    warmCount: warm,
    offerCount: offer,
    customerCount: customer,
    warmToCustomerPct:  pct(customer, warm),
    offerToCustomerPct: pct(customer, offer),

    avgDaysToConvert: avgDays,
    hasMilestoneDates: hasCustomerDate && hasQualifyDate,
    trackingFromNote: (hasCustomerDate && hasQualifyDate)
      ? null
      : `Tracking from ${new Date().toLocaleDateString('en-GB')}`,
  };
}

// ─── Special offers (Chunk 04) ────────────────────────────────────────────────

export interface OfferRow {
  id: string;
  name: string;
  profile: string;
  offerType: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: string;
  urgency: 'red' | 'amber' | 'normal';
}

export interface OffersMetrics {
  active: number;
  expiringWeek: number;
  expiringMonth: number;
  closeRatePct: number;
  rows: OfferRow[];
}

export function computeOffers(items: MondayItem[]): OffersMetrics {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now).getTime();

  const offerItems = items.filter(i => !!getColText(i, COL.specialOfferType).trim());
  const totalWithOffer = offerItems.length;
  const becameCustomerWithOffer = offerItems.filter(i => statusOf(i) === STATUS.customer).length;

  const rows: OfferRow[] = offerItems
    .filter(i => statusOf(i) !== STATUS.customer) // customers are already closed
    .map(i => {
      const expiry = getColDate(i, COL.specialOfferExpiry);
      const days = expiry ? Math.ceil((startOfDay(expiry).getTime() - today) / (1000 * 60 * 60 * 24)) : null;
      const urgency: OfferRow['urgency'] =
        days === null ? 'normal'
        : days <= 7   ? 'red'
        : days <= 30  ? 'amber'
        : 'normal';
      return {
        id: i.id,
        name: i.name,
        profile: getColText(i, COL.profile),
        offerType: getColText(i, COL.specialOfferType),
        expiryDate: expiry ? expiry.toISOString().slice(0, 10) : null,
        daysRemaining: days,
        status: statusOf(i),
        urgency,
      };
    })
    .sort((a, b) => {
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

  const expiringWeek  = rows.filter(r => r.daysRemaining !== null && r.daysRemaining <= 7  && r.daysRemaining >= 0).length;
  const expiringMonth = rows.filter(r => r.daysRemaining !== null && r.daysRemaining <= 30 && r.daysRemaining >= 0).length;

  return {
    active: rows.length,
    expiringWeek,
    expiringMonth,
    closeRatePct: pct(becameCustomerWithOffer, totalWithOffer),
    rows,
  };
}

// ─── Diagnostics that travel with the response ────────────────────────────────

export interface SnapshotDiagnostics {
  itemCount: number;
  fetchedAt: string;
  hasMilestoneDates: boolean;
  hasWaColumns: boolean;
  activityLogsAvailable: boolean;
}

export function buildDiagnostics(
  items: MondayItem[],
  activity: ActivityResult,
  fetchedAt: string
): SnapshotDiagnostics {
  return {
    itemCount: items.length,
    fetchedAt,
    hasMilestoneDates: columnExists(items, COL.dateBecameCustomer) && columnExists(items, COL.dateFirstQualified),
    hasWaColumns:      columnExists(items, COL.waMessagesSent) || columnExists(items, COL.waStatus),
    activityLogsAvailable: activity.available,
  };
}
