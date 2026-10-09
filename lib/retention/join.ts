// ─── The stitch: Monday item ↔ lead-database lifecycle row, by email (pure) ──
//
// The lead-database app links a customer to their board item internally, but
// its retention feed deliberately exposes no ids. Email is on 105/105 board
// items and on every lifecycle row, so it is the join key. A customer on both
// products has two lifecycle rows and gets two CustomerRows.

import { CUSTOMER_LABELS, ENQUIRY_STATUS } from './monday';
import type { CustomerRow, EnquiryItem, LeadDbLifecycleRow } from './types';

export const normaliseEmail = (email: string | null | undefined): string | null => {
  const e = (email ?? '').trim().toLowerCase();
  return e ? e : null;
};

/** An item that is, or has been, a customer according to the board. */
export function isMondayCustomer(item: EnquiryItem): boolean {
  return !!item.customerStart || (item.status !== null && CUSTOMER_LABELS.includes(item.status));
}

const STATE_RANK: Record<string, number> = {
  cancelled: 0,
  lapsed: 0,
  cancelling: 1,
  paused: 2,
  active: 3,
};

const MONDAY_RANK: Record<string, number> = {
  [ENQUIRY_STATUS.cancelled]: 0,
  [ENQUIRY_STATUS.cancelling]: 1,
  [ENQUIRY_STATUS.paused]: 2,
  [ENQUIRY_STATUS.cardDeclined]: 2,
};

function rank(row: CustomerRow): number {
  if (row.leadDbState) return STATE_RANK[row.leadDbState] ?? 3;
  if (row.mondayStatus && row.mondayStatus in MONDAY_RANK) return MONDAY_RANK[row.mondayStatus];
  return 3;
}

export function joinCustomers(items: EnquiryItem[], lifecycle: LeadDbLifecycleRow[] | null): CustomerRow[] {
  const itemsByEmail = new Map<string, EnquiryItem>();
  for (const item of items) {
    const key = normaliseEmail(item.email);
    // Prefer the item that is a customer when an email appears twice.
    if (key && (!itemsByEmail.has(key) || isMondayCustomer(item))) itemsByEmail.set(key, item);
  }

  const rows: CustomerRow[] = [];
  const matched = new Set<string>();

  for (const lr of lifecycle ?? []) {
    const key = normaliseEmail(lr.email);
    const item = key ? itemsByEmail.get(key) : undefined;
    if (item) matched.add(item.id);
    rows.push({
      name: lr.businessName || item?.name || lr.email,
      email: lr.email || item?.email || null,
      product: lr.leadType,
      mondayStatus: item?.status ?? null,
      mondayStart: item?.customerStart ?? null,
      mondayEnd: item?.customerEnd ?? null,
      mondayCancelReason: item?.cancelReason ?? null,
      leadDbState: lr.state,
      leadDbStateLabel: lr.stateLabel,
      firstPaidAt: lr.firstPaidAt,
      endedAt: lr.endedAt,
      tenureMonths: lr.tenureMonths,
      tenureBasis: lr.tenureBasis,
      invoicesPaid: lr.invoicesPaid,
      mrrPence: lr.mrrPence,
      reasonLabels: lr.reasonLabels ?? [],
      reasonNote: lr.reasonNote ?? null,
    });
  }

  for (const item of items) {
    if (matched.has(item.id) || !isMondayCustomer(item)) continue;
    rows.push({
      name: item.name,
      email: item.email,
      product: item.status === ENQUIRY_STATUS.guaranteedRentCustomer ? 'guaranteed_rent' : null,
      mondayStatus: item.status,
      mondayStart: item.customerStart,
      mondayEnd: item.customerEnd,
      mondayCancelReason: item.cancelReason,
      leadDbState: null,
      leadDbStateLabel: null,
      firstPaidAt: null,
      endedAt: null,
      tenureMonths: null,
      tenureBasis: null,
      invoicesPaid: null,
      mrrPence: null,
      reasonLabels: item.cancelReason ? [item.cancelReason] : [],
      reasonNote: item.cancelComment,
    });
  }

  return rows.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (b.tenureMonths ?? -1) - (a.tenureMonths ?? -1) ||
      a.name.localeCompare(b.name)
  );
}
