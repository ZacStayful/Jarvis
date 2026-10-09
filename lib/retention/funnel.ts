// ─── Funnel maths over the enquiries board (pure) ────────────────────────────
//
// Every figure the view or the voice reports is computed here from plain
// data, so vitest can reach it (no network, no React).
//
// Per item we work out what it has EVER been, not just what it is now: a
// prospect who sat a meeting and became a customer shows "Management
// Customer" today, and one who was booked then gave up shows "Abandoned".
// The status column's activity log supplies the transitions; where the log
// does not reach (items older than its horizon) we fall back to the current
// label, the start-date cell, and one stated assumption — a customer we have
// no history for is taken to have sat a web meeting, and the count of such
// assumptions is reported so the view can say so.

import { CUSTOMER_LABELS, ENQUIRY_STATUS } from './monday';
import { inRange, londonYmd } from './dates';
import type {
  DateRange,
  EnquiryItem,
  FunnelMetrics,
  FunnelRates,
  MondayCustomerSnapshot,
  StatusTransition,
} from './types';

const MEETING_LABELS: readonly string[] = [ENQUIRY_STATUS.booked, ENQUIRY_STATUS.sat, ENQUIRY_STATUS.noShow];

export interface ItemHistory {
  item: EnquiryItem;
  /** True when the log covers the item's whole life. */
  historyComplete: boolean;
  everBooked: boolean;
  everSat: boolean;
  everNoShow: boolean;
  everCustomer: boolean;
  /** everSat rests on the "customer ⇒ sat" assumption, not evidence. */
  satAssumed: boolean;
  bookedAt: string | null;
  satAt: string | null;
  noShowAt: string | null;
  customerAt: string | null;
}

export const pct = (num: number, den: number): number | null =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : null;

function firstEntry(transitions: StatusTransition[], label: string): string | null {
  const t = transitions.find(x => x.to === label);
  return t ? t.at : null;
}

export function deriveItemHistory(
  item: EnquiryItem,
  transitions: StatusTransition[],
  historyFrom: string | null
): ItemHistory {
  const seen = new Set<string>();
  for (const t of transitions) {
    seen.add(t.to);
    if (t.from) seen.add(t.from);
  }
  const status = item.status;
  const was = (label: string) => status === label || seen.has(label);

  // The log covers this item from birth when the board's earliest readable
  // entry predates the item.
  const historyComplete = !!historyFrom && item.createdAt >= historyFrom;

  const everCustomer =
    !!item.customerStart || (status !== null && CUSTOMER_LABELS.includes(status)) || CUSTOMER_LABELS.some(l => seen.has(l));

  const everNoShow = was(ENQUIRY_STATUS.noShow);
  let everSat = was(ENQUIRY_STATUS.sat);
  let satAssumed = false;
  if (!everSat && everCustomer && !historyComplete) {
    everSat = true;
    satAssumed = true;
  }
  const everBooked = MEETING_LABELS.some(was) || everSat || everNoShow;

  const bookedAt =
    firstEntry(transitions, ENQUIRY_STATUS.booked) ??
    (status === ENQUIRY_STATUS.booked ? item.createdAt : null);
  const satAt = firstEntry(transitions, ENQUIRY_STATUS.sat) ?? (status === ENQUIRY_STATUS.sat ? item.createdAt : null);
  const noShowAt =
    firstEntry(transitions, ENQUIRY_STATUS.noShow) ?? (status === ENQUIRY_STATUS.noShow ? item.createdAt : null);

  let customerAt: string | null = item.customerStart ? `${item.customerStart}T12:00:00Z` : null;
  if (!customerAt) {
    const entry = transitions.find(t => CUSTOMER_LABELS.includes(t.to));
    customerAt = entry ? entry.at : null;
  }

  return {
    item,
    historyComplete,
    everBooked,
    everSat,
    everNoShow,
    everCustomer,
    satAssumed,
    bookedAt,
    satAt,
    noShowAt,
    customerAt,
  };
}

export function buildFunnel(
  items: EnquiryItem[],
  transitions: StatusTransition[],
  historyFrom: string | null,
  range: DateRange
): FunnelMetrics {
  const byItem = new Map<string, StatusTransition[]>();
  for (const t of transitions) {
    const list = byItem.get(t.itemId);
    if (list) list.push(t);
    else byItem.set(t.itemId, [t]);
  }

  const histories = items.map(item => deriveItemHistory(item, byItem.get(item.id) ?? [], historyFrom));

  const statusCounts: Record<string, number> = {};
  const months = new Map<string, number>();
  const period = { newLeads: 0, meetingsBooked: 0, meetingsSat: 0, noShows: 0, newCustomers: 0 };
  let everBooked = 0;
  let everSat = 0;
  let everNoShow = 0;
  let customersEver = 0;
  let satAndCustomer = 0;
  let assumedSatCount = 0;
  let historyCompleteCount = 0;

  for (const h of histories) {
    const label = h.item.status ?? '(no status)';
    statusCounts[label] = (statusCounts[label] ?? 0) + 1;

    if (h.item.enquiryDate) {
      const month = h.item.enquiryDate.slice(0, 7);
      months.set(month, (months.get(month) ?? 0) + 1);
      if (inRange(h.item.enquiryDate, range)) period.newLeads += 1;
    }
    if (inRange(londonYmd(h.bookedAt), range)) period.meetingsBooked += 1;
    if (inRange(londonYmd(h.satAt), range)) period.meetingsSat += 1;
    if (inRange(londonYmd(h.noShowAt), range)) period.noShows += 1;
    if (inRange(londonYmd(h.customerAt), range)) period.newCustomers += 1;

    if (h.everBooked) everBooked += 1;
    if (h.everSat) everSat += 1;
    if (h.everNoShow) everNoShow += 1;
    if (h.everCustomer) customersEver += 1;
    if (h.everSat && h.everCustomer) satAndCustomer += 1;
    if (h.satAssumed) assumedSatCount += 1;
    if (h.historyComplete) historyCompleteCount += 1;
  }

  const totalLeads = items.length;
  const rates: FunnelRates = {
    enquiryToMeeting: pct(everBooked, totalLeads),
    attendance: pct(everSat, everSat + everNoShow),
    meetingToCustomer: pct(satAndCustomer, everSat),
    enquiryToCustomer: pct(customersEver, totalLeads),
  };

  const count = (label: string) => statusCounts[label] ?? 0;
  const activeManagement = count(ENQUIRY_STATUS.managementCustomer);
  const activeGuaranteedRent = count(ENQUIRY_STATUS.guaranteedRentCustomer);
  const cancelled = count(ENQUIRY_STATUS.cancelled);
  const customers: MondayCustomerSnapshot = {
    activeManagement,
    activeGuaranteedRent,
    active: activeManagement + activeGuaranteedRent,
    paused: count(ENQUIRY_STATUS.paused),
    cancelling: count(ENQUIRY_STATUS.cancelling),
    cancelled,
    cardDeclined: count(ENQUIRY_STATUS.cardDeclined),
    approxChurnPct: pct(cancelled, customersEver),
    approximate: true,
  };

  return {
    period,
    totals: {
      totalLeads,
      everBooked,
      everSat,
      everNoShow,
      customersEver,
      assumedSatCount,
      historyCompleteCount,
      statusCounts,
      enquiriesByMonth: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, c]) => ({ month, count: c })),
    },
    rates,
    customers,
  };
}
