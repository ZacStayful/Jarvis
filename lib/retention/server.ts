// ─── /api/retention orchestration (server only) ───────────────────────────────
//
// Monday (funnel) + the lead-database feed (churn), joined on email. Degrades
// rather than throws: only a failed board read makes `ok` false; a missing
// activity log or an unreachable lead database is reported in `errors` and
// the figures that don't need them are still returned.

import { buildFunnel } from './funnel';
import { joinCustomers } from './join';
import { fetchLeadDbRetention } from './lead-db';
import { fetchEnquiryItems, fetchStatusHistory } from './monday';
import type { DateRange, LeadDbRetention, LeadDbStatus, RetentionDashboardData } from './types';

export async function getRetentionDashboardData(range: DateRange): Promise<RetentionDashboardData> {
  const [itemsRes, historyRes, leadDbRes] = await Promise.all([
    fetchEnquiryItems(),
    fetchStatusHistory(),
    fetchLeadDbRetention(),
  ]);

  const errors: string[] = [];
  const items = itemsRes.ok ? itemsRes.data : [];
  if (!itemsRes.ok) errors.push(itemsRes.error);

  const history = historyRes.ok ? historyRes.data : { transitions: [], historyFrom: null };
  if (!historyRes.ok) {
    errors.push(`${historyRes.error} — meeting counts for the period fall back to the current labels`);
  }

  let leadDb: LeadDbRetention | null = null;
  let leadDbStatus: LeadDbStatus;
  if (leadDbRes.ok) {
    leadDb = leadDbRes.data;
    leadDbStatus = 'ok';
    if (leadDb.partial.length) errors.push(`lead database: partial read (${leadDb.partial.join(', ')})`);
  } else {
    leadDbStatus = leadDbRes.status;
    errors.push(leadDbRes.error);
  }

  return {
    ok: itemsRes.ok,
    errors,
    generatedAt: new Date().toISOString(),
    range,
    history: { from: history.historyFrom, events: history.transitions.length },
    funnel: itemsRes.ok ? buildFunnel(items, history.transitions, history.historyFrom, range) : null,
    customers: joinCustomers(items, leadDb?.lifecycle ?? null),
    leadDb,
    leadDbStatus,
  };
}
