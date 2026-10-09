import { describe, it, expect } from 'vitest';
import { buildFunnel, deriveItemHistory } from '@/lib/retention/funnel';
import { joinCustomers } from '@/lib/retention/join';
import { buildRetentionBriefing, buildRetentionContextLine } from '@/lib/retention/context';
import { activityTimestampToIso, parseStatusTransition, ENQUIRY_STATUS, mapEnquiryItem } from '@/lib/retention/monday';
import { cellYmd, londonYmd, parseRange, rangeForPreset, rangeLabel } from '@/lib/retention/dates';
import type {
  EnquiryItem,
  LeadDbLifecycleRow,
  LeadDbRetention,
  RetentionDashboardData,
  StatusTransition,
} from '@/lib/retention/types';

// ─── Fixture shaped like the live board ──────────────────────────────────────
// Status history is readable from 1 July; item A predates it.

const HISTORY_FROM = '2026-07-01T00:00:00Z';
const S = ENQUIRY_STATUS;

function item(over: Partial<EnquiryItem> & { id: string }): EnquiryItem {
  return {
    name: `Lead ${over.id}`,
    createdAt: '2026-08-01T09:00:00Z',
    status: S.newEnquiry,
    enquiryDate: '2026-08-01',
    customerStart: null,
    customerEnd: null,
    cancelReason: null,
    cancelComment: null,
    email: `${over.id.toLowerCase()}@example.com`,
    plan: null,
    properties: null,
    ...over,
  };
}

const t = (itemId: string, from: string | null, to: string, at: string): StatusTransition => ({ itemId, from, to, at });

const ITEMS: EnquiryItem[] = [
  // A — older than the log: a customer we have no history for.
  item({ id: 'A', createdAt: '2026-05-15T10:00:00Z', enquiryDate: '2026-05-15', status: S.managementCustomer, customerStart: '2026-07-24' }),
  // B — booked, then gave up.
  item({ id: 'B', createdAt: '2026-08-01T09:00:00Z', enquiryDate: '2026-08-01', status: S.abandoned }),
  // C — sat a meeting, undecided.
  item({ id: 'C', createdAt: '2026-08-05T09:00:00Z', enquiryDate: '2026-08-05', status: S.sat }),
  // D — the full journey, then churned with a reason.
  item({ id: 'D', createdAt: '2026-08-07T09:00:00Z', enquiryDate: '2026-08-07', status: S.cancelled, customerStart: '2026-08-20', customerEnd: '2026-09-20', cancelReason: 'Lead quality' }),
  // E — fresh enquiry.
  item({ id: 'E', createdAt: '2026-09-01T09:00:00Z', enquiryDate: '2026-09-01' }),
  // F — booked, no-showed.
  item({ id: 'F', createdAt: '2026-09-02T09:00:00Z', enquiryDate: '2026-09-02', status: S.noShow }),
  // G — signed up without a meeting (history complete, no booked label ever).
  item({ id: 'G', createdAt: '2026-09-10T09:00:00Z', enquiryDate: '2026-09-10', status: S.managementCustomer, customerStart: '2026-09-12' }),
];

const TRANSITIONS: StatusTransition[] = [
  t('B', S.newEnquiry, S.booked, '2026-08-03T10:00:00Z'),
  t('B', S.booked, S.abandoned, '2026-08-10T10:00:00Z'),
  t('C', S.newEnquiry, S.booked, '2026-08-06T10:00:00Z'),
  t('C', S.booked, S.sat, '2026-08-12T10:00:00Z'),
  t('D', S.newEnquiry, S.booked, '2026-08-08T10:00:00Z'),
  t('D', S.booked, S.sat, '2026-08-14T10:00:00Z'),
  t('D', S.sat, S.managementCustomer, '2026-08-20T10:00:00Z'),
  t('D', S.managementCustomer, S.cancelled, '2026-09-20T10:00:00Z'),
  t('F', S.newEnquiry, S.booked, '2026-09-03T10:00:00Z'),
  t('F', S.booked, S.noShow, '2026-09-05T10:00:00Z'),
  t('G', S.newEnquiry, S.managementCustomer, '2026-09-12T10:00:00Z'),
];

const AUGUST = { from: '2026-08-01', to: '2026-08-31' };

const funnel = () => buildFunnel(ITEMS, TRANSITIONS, HISTORY_FROM, AUGUST);

describe('funnel maths', () => {
  it('counts the period on the London day of each event', () => {
    const f = funnel();
    expect(f.period).toEqual({ newLeads: 3, meetingsBooked: 3, meetingsSat: 2, noShows: 0, newCustomers: 1 });
  });

  it('knows what each item has ever been, not just what it is now', () => {
    const f = funnel();
    expect(f.totals.totalLeads).toBe(7);
    expect(f.totals.everBooked).toBe(5); // A (assumed), B, C, D, F — not G
    expect(f.totals.everSat).toBe(3); // A (assumed), C, D
    expect(f.totals.everNoShow).toBe(1);
    expect(f.totals.customersEver).toBe(3); // A, D, G
    expect(f.totals.assumedSatCount).toBe(1);
    expect(f.totals.historyCompleteCount).toBe(6);
  });

  it('a customer with complete history and no meeting label is not counted as having sat one', () => {
    const g = deriveItemHistory(ITEMS[6], TRANSITIONS.filter(x => x.itemId === 'G'), HISTORY_FROM);
    expect(g.historyComplete).toBe(true);
    expect(g.everCustomer).toBe(true);
    expect(g.everSat).toBe(false);
    expect(g.everBooked).toBe(false);
    expect(g.satAssumed).toBe(false);
  });

  it('a customer older than the log is assumed to have sat, and says so', () => {
    const a = deriveItemHistory(ITEMS[0], [], HISTORY_FROM);
    expect(a.historyComplete).toBe(false);
    expect(a.everSat).toBe(true);
    expect(a.satAssumed).toBe(true);
    expect(a.customerAt).toBe('2026-07-24T12:00:00Z');
  });

  it('rates are percentages with a null when nothing is in the denominator', () => {
    const f = funnel();
    expect(f.rates.enquiryToMeeting).toBe(71.4);
    expect(f.rates.attendance).toBe(75);
    expect(f.rates.meetingToCustomer).toBe(66.7); // A and D of the 3 who sat
    expect(f.rates.enquiryToCustomer).toBe(42.9);
    const empty = buildFunnel([], [], null, AUGUST);
    expect(empty.rates.enquiryToMeeting).toBeNull();
    expect(empty.customers.approxChurnPct).toBeNull();
  });

  it('reports the board-side customer snapshot as approximate', () => {
    const f = funnel();
    expect(f.customers).toEqual({
      activeManagement: 2,
      activeGuaranteedRent: 0,
      active: 2,
      paused: 0,
      cancelling: 0,
      cancelled: 1,
      cardDeclined: 0,
      approxChurnPct: 33.3,
      approximate: true,
    });
    expect(f.totals.statusCounts[S.managementCustomer]).toBe(2);
    expect(f.totals.enquiriesByMonth).toEqual([
      { month: '2026-05', count: 1 },
      { month: '2026-08', count: 3 },
      { month: '2026-09', count: 3 },
    ]);
  });

  it('with no activity log at all, current labels still give a funnel', () => {
    const f = buildFunnel(ITEMS, [], null, AUGUST);
    expect(f.totals.everBooked).toBe(5); // A, C, D, F via labels/start date; B lost without the log
    expect(f.period.meetingsBooked).toBe(0);
    expect(f.totals.customersEver).toBe(3);
  });
});

describe('Monday parsing', () => {
  it('reads the 17-digit activity clock', () => {
    expect(activityTimestampToIso('17915441586158484')).toMatch(/^2026-10-09T/);
    expect(activityTimestampToIso('garbage')).toBeNull();
  });

  it('parses a status transition and ignores other events', () => {
    const data = JSON.stringify({
      column_id: 'color_mm5eda07',
      pulse_id: 13197083196,
      previous_value: { label: { text: 'Web meeting booked' } },
      value: { label: { text: 'Abandoned' } },
    });
    expect(parseStatusTransition({ id: '1', event: 'update_column_value', created_at: '17915441586158484', data })).toEqual({
      itemId: '13197083196',
      from: 'Web meeting booked',
      to: 'Abandoned',
      at: expect.stringMatching(/^2026-10-09T/),
    });
    expect(parseStatusTransition({ id: '2', event: 'create_pulse', created_at: '17915441586158484', data })).toBeNull();
    expect(parseStatusTransition({ id: '3', event: 'update_column_value', created_at: '17915441586158484', data: '{not json' })).toBeNull();
  });

  it('maps an item, dropping the time from date cells', () => {
    const mapped = mapEnquiryItem({
      id: 1,
      name: 'Arun',
      created_at: '2026-10-05T12:38:02Z',
      column_values: [
        { id: 'color_mm5eda07', text: 'New Enquiries' },
        { id: 'date_mm50brxt', text: '2026-10-05 13:38' },
        { id: 'text_mm50e3d7', text: ' info@example.com ' },
        { id: 'date_mm5ft19y', text: '' },
      ],
    } as never);
    expect(mapped.id).toBe('1');
    expect(mapped.enquiryDate).toBe('2026-10-05');
    expect(mapped.email).toBe('info@example.com');
    expect(mapped.customerStart).toBeNull();
  });
});

describe('dates', () => {
  it('London day, cells and presets', () => {
    expect(londonYmd('2026-07-31T23:30:00Z')).toBe('2026-08-01'); // BST
    expect(cellYmd('2026-10-05 13:38')).toBe('2026-10-05');
    expect(cellYmd(null)).toBeNull();
    const now = new Date('2026-10-09T12:00:00Z');
    expect(rangeForPreset('30d', now)).toEqual({ from: '2026-09-10', to: '2026-10-09' });
    expect(rangeForPreset('all', now).from).toBe('2026-05-01');
    expect(parseRange('bad', undefined, now)).toEqual({ from: '2026-09-10', to: '2026-10-09' });
    expect(parseRange('2026-09-30', '2026-09-01', now)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(rangeLabel({ from: '2026-09-10', to: '2026-10-09' }, now)).toBe('the last 30 days');
    expect(rangeLabel({ from: '2026-05-01', to: '2026-10-09' }, now)).toBe('since the board began');
  });
});

// ─── The stitch ──────────────────────────────────────────────────────────────

function lifecycle(over: Partial<LeadDbLifecycleRow> & { email: string }): LeadDbLifecycleRow {
  return {
    businessName: 'Acme Lettings',
    leadType: 'management',
    state: 'active',
    stateLabel: 'Active',
    tenureBasis: 'invoice',
    firstPaidAt: '2026-07-24T10:40:00Z',
    endedAt: null,
    endKind: null,
    cancelEffectiveAt: null,
    pausedAt: null,
    tenureMonths: 2.5,
    band: 'm1_3',
    invoicesPaid: 3,
    mrrPence: 15_000,
    reasonThemes: [],
    reasonLabels: [],
    reasonNote: null,
    ...over,
  };
}

describe('joinCustomers', () => {
  it('joins on email case-insensitively and keeps one-sided rows', () => {
    const rows = joinCustomers(ITEMS, [
      lifecycle({ email: ' A@Example.com ' }),
      lifecycle({ email: 'z@example.com', businessName: 'Zed Stays', state: 'cancelled', stateLabel: 'Cancelled', endedAt: '2026-09-01T00:00:00Z', endKind: 'cancelled', tenureMonths: 1, invoicesPaid: 1, reasonLabels: ['Price'] }),
    ]);
    expect(rows.map(r => r.name)).toEqual(['Zed Stays', 'Lead D', 'Acme Lettings', 'Lead G']); // churned first, then longest tenure
    const acme = rows.find(r => r.name === 'Acme Lettings')!;
    expect(acme.mondayStatus).toBe(S.managementCustomer);
    expect(acme.mondayStart).toBe('2026-07-24');
    const d = rows.find(r => r.name === 'Lead D')!;
    expect(d.leadDbState).toBeNull();
    expect(d.reasonLabels).toEqual(['Lead quality']);
    expect(rows.find(r => r.name === 'Zed Stays')!.mondayStatus).toBeNull();
  });

  it('without the feed, every board customer still appears', () => {
    expect(joinCustomers(ITEMS, null).map(r => r.name)).toEqual(['Lead D', 'Lead A', 'Lead G']);
  });
});

// ─── Voice ───────────────────────────────────────────────────────────────────

function leadDb(): LeadDbRetention {
  return {
    asOf: '2026-10-09T12:00:00Z',
    unavailable: false,
    partial: [],
    quality: { invoiceBacked: 20, signupEstimated: 2, neverPaid: 1, cohorts: 3, earliestFirstPaid: '2026-07-24', maxTenureMonths: 2 },
    products: [
      {
        leadType: 'management',
        label: 'Management',
        customers: 29,
        active: 13,
        paused: 6,
        cancelling: 1,
        payingEver: 20,
        churned: 3,
        churnedNeverPaid: 1,
        churnRatePct: 15,
        mrr: { totalPence: 379_500, stablePence: 0, stableSharePct: 0, pausedPence: 99_000, pausedCustomers: 6, bands: [] },
        retention: [
          { months: 1, label: '1 month', eligible: 15, renewed: 13, churned: 2, unclear: 0, paused: 5, pct: 0.8667, suppressed: false, measurableFrom: null },
          { months: 6, label: '6 months', eligible: 0, renewed: 0, churned: 0, unclear: 0, paused: 0, pct: null, suppressed: false, measurableFrom: '2027-01-24' },
        ],
        reasons: [
          { theme: 'lead_quality', label: 'Lead quality', count: 3 },
          { theme: 'not_recorded', label: 'Not recorded', count: 1 },
        ],
      },
    ],
    lifecycle: [lifecycle({ email: 'a@example.com' })],
  };
}

function dashboard(withLeadDb: boolean, customers = 1): RetentionDashboardData {
  const f = funnel();
  const db = withLeadDb ? leadDb() : null;
  const rows = db
    ? Array.from({ length: customers }, (_, i) => lifecycle({ email: `c${i}@example.com`, businessName: `Customer number ${i} with a longish trading name` }))
    : null;
  return {
    ok: true,
    errors: [],
    generatedAt: '2026-10-09T12:00:00Z',
    range: { from: '2026-09-10', to: '2026-10-09' },
    history: { from: HISTORY_FROM, events: TRANSITIONS.length },
    funnel: f,
    customers: joinCustomers(ITEMS, rows),
    leadDb: db,
    leadDbStatus: withLeadDb ? 'ok' : 'not_configured',
  };
}

describe('retention voice', () => {
  const now = new Date('2026-10-09T12:00:00Z');

  it('briefs from the lead-database figures when connected', () => {
    const line = buildRetentionBriefing(dashboard(true), now);
    expect(line).toMatch(/^Lead database, sir\. 7 enquiries in total/);
    expect(line).toContain('the last 30 days');
    expect(line).toContain('Churn stands at 15 per cent: 3 of 20 paying customers have left, most often citing lead quality.');
    expect(line).not.toContain('approximate');
  });

  it('says churn is approximate when the feed is not connected', () => {
    const line = buildRetentionBriefing(dashboard(false), now);
    expect(line).toContain("The lead database feed isn't connected");
    expect(line).toContain('1 cancelled of 3 customers ever, about 33 per cent');
  });

  it('falls back to a plain line with no data', () => {
    expect(buildRetentionBriefing(null)).toMatch(/aren't available/);
  });

  it('builds a LIVE VIEW DATA line under the chat route cap, trimming customers', () => {
    const line = buildRetentionContextLine(dashboard(true, 120))!;
    expect(line.length).toBeLessThan(4000);
    expect(line).toContain('Management: 13 active, 6 paused, 1 cancelling; 3 of 20 paying customers have left (churn 15%)');
    expect(line).toContain('1 month 13 of 15 (87%)');
    expect(line).toContain('6 months measurable from 2027-01-24');
    expect(line).toMatch(/\(\+\d+ more\)$/);
    expect(buildRetentionContextLine(null)).toBeUndefined();
  });
});
