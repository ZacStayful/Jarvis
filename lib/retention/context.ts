// ─── Retention dashboard → spoken English (pure) ─────────────────────────────
//
// Two outputs from the same data:
//   buildRetentionBriefing   — 2–4 sentences JARVIS says when the view opens
//                              (no Claude round trip; the dashboard narrates
//                              itself like the sales one).
//   buildRetentionContextLine — the dense LIVE VIEW DATA block for /api/chat
//                              when Zac asks a follow-up with the view open.
//                              Capped well under MAX_VIEW_CONTEXT (4000).

import { londonYmd, rangeLabel, speakDate } from './dates';
import { ENQUIRY_STATUS } from './monday';
import type { CustomerRow, LeadDbProduct, RetentionDashboardData } from './types';

export const RETENTION_OPEN_LINE = 'Pulling up the lead database, sir.';
export const RETENTION_CLOSE_LINE = 'Closing the lead database, sir.';
export const RETENTION_UNAVAILABLE_LINE =
  "The lead database figures aren't available, sir — the enquiries board couldn't be read.";

const MAX_CONTEXT_CHARS = 3600;

const pc = (v: number | null | undefined): string => (v === null || v === undefined ? 'n/a' : `${v}%`);
const gbp = (pence: number): string => `£${Math.round(pence / 100).toLocaleString('en-GB')}`;
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

function productShort(p: LeadDbProduct['leadType'] | null): string {
  return p === 'guaranteed_rent' ? 'GR' : p === 'management' ? 'Mgmt' : '?';
}

function customerLine(row: CustomerRow): string {
  const state = row.leadDbStateLabel ?? row.mondayStatus ?? 'unknown';
  const bits: string[] = [];
  if (row.tenureMonths !== null) bits.push(`${row.tenureMonths} mo`);
  if (row.invoicesPaid !== null) bits.push(`${plural(row.invoicesPaid, 'invoice')}`);
  if (row.mrrPence) bits.push(`${gbp(row.mrrPence)}/mo`);
  if (row.firstPaidAt) bits.push(`from ${londonYmd(row.firstPaidAt)}`);
  else if (row.mondayStart) bits.push(`from ${row.mondayStart}`);
  if (row.endedAt) bits.push(`left ${londonYmd(row.endedAt)}`);
  const reason = row.reasonLabels.length ? `; reason: ${row.reasonLabels.join(', ')}` : '';
  return `${row.name} (${productShort(row.product)}): ${state}${bits.length ? ', ' + bits.join(', ') : ''}${reason}.`;
}

function productContext(p: LeadDbProduct): string {
  const checkpoints = p.retention
    .map(c =>
      c.eligible > 0
        ? `${c.label} ${c.renewed} of ${c.eligible}${c.pct !== null ? ` (${Math.round(c.pct * 100)}%)` : ' (withheld, under 5)'}${c.unclear ? `, ${c.unclear} unclear` : ''}${c.paused ? `, ${c.paused} paused` : ''}`
        : `${c.label} measurable from ${c.measurableFrom ?? 'later'}`
    )
    .join('; ');
  const reasons = p.reasons.length ? ` Reasons: ${p.reasons.map(r => `${r.label} ${r.count}`).join(', ')}.` : '';
  return (
    `${p.label}: ${p.active} active, ${p.paused} paused, ${p.cancelling} cancelling; ${p.churned} of ${p.payingEver} paying customers have left (churn ${pc(p.churnRatePct)})` +
    `${p.churnedNeverPaid ? `, ${p.churnedNeverPaid} left before paying` : ''}. ` +
    `MRR ${gbp(p.mrr.totalPence)} in force${p.mrr.pausedPence ? `, ${gbp(p.mrr.pausedPence)} paused` : ''}` +
    `${p.mrr.stableSharePct !== null ? `, ${Math.round(p.mrr.stableSharePct * 100)}% in 6-month-plus tenure` : ''}. ` +
    `Retention: ${checkpoints}.${reasons}`
  );
}

export function buildRetentionContextLine(data: RetentionDashboardData | null | undefined): string | undefined {
  if (!data?.funnel) return undefined;
  const f = data.funnel;
  const { period: p, totals: t, rates: r, customers: c } = f;
  const parts: string[] = [];

  parts.push(
    `Lead database (operator prospects buying landlord leads). Period ${data.range.from} to ${data.range.to}` +
      `${data.history.from ? `; status history known from ${londonYmd(data.history.from)}` : '; no status history available'}.`
  );
  parts.push(
    `Period: ${p.newLeads} new enquiries, ${p.meetingsBooked} web meetings booked, ${p.meetingsSat} sat, ${p.noShows} no-shows, ${p.newCustomers} new customers.`
  );
  parts.push(
    `All time: ${t.totalLeads} enquiries, ${t.everBooked} ever booked a meeting, ${t.everSat} sat, ${t.everNoShow} no-showed, ${t.customersEver} became customers` +
      `${t.assumedSatCount ? ` (${t.assumedSatCount} customers predate the history and are assumed to have sat a meeting)` : ''}.`
  );
  parts.push(
    `Rates: ${pc(r.enquiryToMeeting)} enquiry-to-meeting, ${pc(r.attendance)} attendance, ${pc(r.meetingToCustomer)} meeting-to-customer, ${pc(r.enquiryToCustomer)} enquiry-to-customer.`
  );
  parts.push(
    `Board now: ${c.activeManagement} management customers, ${c.activeGuaranteedRent} guaranteed rent, ${c.paused} paused, ${c.cancelling} cancelling, ${c.cancelled} cancelled, ${c.cardDeclined} card declined; ` +
      `${t.statusCounts[ENQUIRY_STATUS.booked] ?? 0} booked, ${t.statusCounts[ENQUIRY_STATUS.sat] ?? 0} sat awaiting decision, ${t.statusCounts[ENQUIRY_STATUS.newEnquiry] ?? 0} new, ${t.statusCounts[ENQUIRY_STATUS.abandoned] ?? 0} abandoned.`
  );

  if (data.leadDb && data.leadDbStatus === 'ok') {
    for (const prod of data.leadDb.products) parts.push(productContext(prod));
    const q = data.leadDb.quality;
    parts.push(
      `Lead-database data quality: ${q.invoiceBacked} tenures from a real invoice, ${q.signupEstimated} estimated from signup, ${q.neverPaid} never paid; ${q.cohorts} monthly cohorts since ${q.earliestFirstPaid ?? 'n/a'}.`
    );
  } else {
    parts.push(
      `Lead-database churn feed ${data.leadDbStatus === 'not_configured' ? 'not connected' : 'unavailable'} — churn is approximate from the board: ${c.cancelled} of ${t.customersEver} customers ever have cancelled (${pc(c.approxChurnPct)}).`
    );
  }

  const head = parts.join(' ');
  const lines: string[] = [];
  let used = head.length + ' Customers: '.length;
  for (const row of data.customers) {
    const line = customerLine(row);
    if (used + line.length + 1 > MAX_CONTEXT_CHARS) {
      lines.push(`(+${data.customers.length - lines.length} more)`);
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines.length ? `${head} Customers: ${lines.join(' ')}` : head;
}

export function buildRetentionBriefing(data: RetentionDashboardData | null | undefined, now: Date = new Date()): string {
  if (!data?.funnel) return RETENTION_UNAVAILABLE_LINE;
  const { period: p, totals: t, rates: r, customers: c } = data.funnel;
  const label = rangeLabel(data.range, now);
  const s: string[] = [];

  s.push(`Lead database, sir. ${plural(t.totalLeads, 'enquiry', 'enquiries')} in total, ${p.newLeads} new in ${label}.`);
  s.push(
    `${plural(p.meetingsBooked, 'web meeting')} booked in that time and ${p.meetingsSat} sat` +
      `${p.noShows ? `, with ${plural(p.noShows, 'no-show')}` : ''}; ${data.funnel.totals.statusCounts[ENQUIRY_STATUS.booked] ?? 0} booked right now.`
  );
  if (r.meetingToCustomer !== null) {
    s.push(`Of everyone who has sat a meeting, ${Math.round(r.meetingToCustomer)} per cent went on to become customers.`);
  }
  s.push(
    `${plural(c.active, 'active customer')} — ${c.activeManagement} on management, ${c.activeGuaranteedRent} on guaranteed rent — with ${c.paused} paused${c.cancelling ? ` and ${c.cancelling} cancelling` : ''}.`
  );

  if (data.leadDb && data.leadDbStatus === 'ok') {
    const churned = data.leadDb.products.reduce((n, pr) => n + pr.churned, 0);
    const paying = data.leadDb.products.reduce((n, pr) => n + pr.payingEver, 0);
    const reasons = new Map<string, number>();
    for (const pr of data.leadDb.products) for (const rs of pr.reasons) reasons.set(rs.label, (reasons.get(rs.label) ?? 0) + rs.count);
    const top = [...reasons.entries()].filter(([l]) => l !== 'Not recorded').sort((a, b) => b[1] - a[1])[0];
    if (paying > 0) {
      s.push(
        `Churn stands at ${Math.round((churned / paying) * 100)} per cent: ${churned} of ${paying} paying customers have left` +
          `${top ? `, most often citing ${top[0].toLowerCase()}` : ''}.`
      );
    } else {
      s.push('Nobody has paid an invoice yet, so there is no churn to report.');
    }
  } else {
    s.push(
      `The lead database feed isn't connected, so churn is approximate from the board: ${c.cancelled} cancelled of ${t.customersEver} customers ever` +
        `${c.approxChurnPct !== null ? `, about ${Math.round(c.approxChurnPct)} per cent` : ''}.`
    );
  }
  return s.join(' ');
}

export { speakDate };
