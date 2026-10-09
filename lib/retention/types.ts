// ─── Lead-database retention: shared types ────────────────────────────────────
//
// Client-safe (types only). Two sources feed the retention dashboard:
//
//   • Monday board 18420649520 "Stayful Lead database enquiries" — the sales
//     funnel for operator prospects (every enquiry lands here; the status
//     column's activity log gives us transitions).
//   • The lead-database app (leads.stayful.co.uk) — churn, tenure, MRR and
//     cancel reasons, served by its read-only /api/internal/retention.
//
// Every optional figure is nullable on purpose so the view renders "—"
// instead of a confident zero.

export type LeadProduct = 'management' | 'guaranteed_rent';

/** Inclusive YYYY-MM-DD bounds, Europe/London. */
export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = '7d' | '30d' | '90d' | 'all';

// ─── Monday ───────────────────────────────────────────────────────────────────

export interface EnquiryItem {
  id: string;
  name: string;
  /** Monday's own created_at (ISO, UTC). */
  createdAt: string;
  status: string | null;
  /** "Enquiry date" cell, YYYY-MM-DD (time dropped). */
  enquiryDate: string | null;
  /** "Customer start date" (date_mm5ft19y) — written by the lead-database app. */
  customerStart: string | null;
  /** "Customer end date" (date_mm5fxrbn) — written by the lead-database app. */
  customerEnd: string | null;
  cancelReason: string | null;
  cancelComment: string | null;
  email: string | null;
  plan: string | null;
  properties: string | null;
}

/** One status-column change from the board's activity log. */
export interface StatusTransition {
  itemId: string;
  from: string | null;
  to: string;
  /** ISO, UTC. */
  at: string;
}

export interface StatusHistory {
  transitions: StatusTransition[];
  /** Earliest log entry we could read — nothing before it is known. */
  historyFrom: string | null;
}

// ─── Funnel (computed from Monday) ────────────────────────────────────────────

export interface FunnelPeriod {
  newLeads: number;
  meetingsBooked: number;
  meetingsSat: number;
  noShows: number;
  newCustomers: number;
}

export interface FunnelTotals {
  totalLeads: number;
  everBooked: number;
  everSat: number;
  everNoShow: number;
  customersEver: number;
  /** Customers older than the log horizon assumed to have sat a meeting. */
  assumedSatCount: number;
  /** Items with complete status history (created after the log horizon). */
  historyCompleteCount: number;
  statusCounts: Record<string, number>;
  enquiriesByMonth: Array<{ month: string; count: number }>;
}

/** Percentages 0–100 (1 dp), or null when the denominator is zero. */
export interface FunnelRates {
  enquiryToMeeting: number | null;
  attendance: number | null;
  meetingToCustomer: number | null;
  enquiryToCustomer: number | null;
}

/** What the board itself says about customers — the fallback when the
 *  lead-database feed is down. Always marked approximate. */
export interface MondayCustomerSnapshot {
  activeManagement: number;
  activeGuaranteedRent: number;
  active: number;
  paused: number;
  cancelling: number;
  cancelled: number;
  cardDeclined: number;
  approxChurnPct: number | null;
  approximate: true;
}

export interface FunnelMetrics {
  period: FunnelPeriod;
  totals: FunnelTotals;
  rates: FunnelRates;
  customers: MondayCustomerSnapshot;
}

// ─── Lead-database feed (contract with /api/internal/retention) ───────────────

export type LeadDbLifecycleState = 'active' | 'paused' | 'cancelling' | 'cancelled' | 'lapsed';
export type LeadDbTenureBasis = 'invoice' | 'signup_estimated' | 'never_paid';

export interface LeadDbRetentionCheckpoint {
  months: number;
  label: string;
  eligible: number;
  renewed: number;
  churned: number;
  unclear: number;
  paused: number;
  /** 0–1 share, or null when suppressed / nothing eligible. */
  pct: number | null;
  suppressed: boolean;
  measurableFrom: string | null;
}

export interface LeadDbMrrBand {
  band: string;
  label: string;
  customers: number;
  pence: number;
}

export interface LeadDbReason {
  theme: string;
  label: string;
  count: number;
}

export interface LeadDbProduct {
  leadType: LeadProduct;
  label: string;
  /** Lifecycle rows for this product (customer × product). */
  customers: number;
  active: number;
  paused: number;
  cancelling: number;
  /** Ever paid an invoice. The churn denominator. */
  payingEver: number;
  /** Paid at least once, then left (cancelled or written off). */
  churned: number;
  /** Left having never paid — reported apart, never in the rate. */
  churnedNeverPaid: number;
  /** churned / payingEver, 0–100, or null when nobody has paid. */
  churnRatePct: number | null;
  mrr: {
    totalPence: number;
    stablePence: number;
    stableSharePct: number | null;
    pausedPence: number;
    pausedCustomers: number;
    bands: LeadDbMrrBand[];
  };
  retention: LeadDbRetentionCheckpoint[];
  reasons: LeadDbReason[];
}

export interface LeadDbLifecycleRow {
  businessName: string;
  email: string;
  leadType: LeadProduct;
  state: LeadDbLifecycleState;
  stateLabel: string;
  tenureBasis: LeadDbTenureBasis;
  firstPaidAt: string | null;
  endedAt: string | null;
  endKind: 'cancelled' | 'lapsed' | null;
  cancelEffectiveAt: string | null;
  pausedAt: string | null;
  tenureMonths: number;
  band: string;
  invoicesPaid: number;
  mrrPence: number;
  reasonThemes: string[];
  reasonLabels: string[];
  reasonNote: string | null;
}

export interface LeadDbRetention {
  asOf: string;
  unavailable: boolean;
  partial: string[];
  quality: {
    invoiceBacked: number;
    signupEstimated: number;
    neverPaid: number;
    cohorts: number;
    earliestFirstPaid: string | null;
    maxTenureMonths: number;
  };
  products: LeadDbProduct[];
  lifecycle: LeadDbLifecycleRow[];
}

export type LeadDbStatus = 'ok' | 'unavailable' | 'not_configured';

// ─── The stitch: one row per customer (× product) across both systems ────────

export interface CustomerRow {
  name: string;
  email: string | null;
  product: LeadProduct | null;
  mondayStatus: string | null;
  mondayStart: string | null;
  mondayEnd: string | null;
  mondayCancelReason: string | null;
  leadDbState: LeadDbLifecycleState | null;
  leadDbStateLabel: string | null;
  firstPaidAt: string | null;
  endedAt: string | null;
  tenureMonths: number | null;
  tenureBasis: LeadDbTenureBasis | null;
  invoicesPaid: number | null;
  mrrPence: number | null;
  reasonLabels: string[];
  reasonNote: string | null;
}

// ─── /api/retention response ──────────────────────────────────────────────────

export interface RetentionDashboardData {
  /** False only when the Monday board itself could not be read. */
  ok: boolean;
  errors: string[];
  generatedAt: string;
  range: DateRange;
  history: { from: string | null; events: number };
  funnel: FunnelMetrics | null;
  customers: CustomerRow[];
  leadDb: LeadDbRetention | null;
  leadDbStatus: LeadDbStatus;
}
