// ─── Sales metrics → one spoken-English context line ─────────────────────────
//
// Shared by /api/sales/summary (the dashboard's own voice) and the chat route
// (LIVE VIEW DATA block when the sales dashboard is open and Zac asks
// something that isn't a sales question). Tolerates partial metrics.

type Num = number | string | undefined | null;

interface LooseSalesMetrics {
  period?: Record<string, Num>;
  snapshot?: Record<string, Num>;
  rates?: Record<string, Num>;
  efficiency?: Record<string, Num>;
  offers?: Record<string, Num>;
}

const n = (v: Num): string => (v === undefined || v === null || v === '' ? '0' : String(v));

export function buildSalesContextLine(m: LooseSalesMetrics | null | undefined): string | undefined {
  const p = m?.period;
  if (!p) return undefined;
  const s = m?.snapshot ?? {};
  const r = m?.rates ?? {};
  const e = m?.efficiency ?? {};
  const o = m?.offers ?? {};

  return (
    `Pipeline (from 1st May 2026): ${n(p.totalLeads)} leads added. ` +
    `${n(p.webMeetingCount)} web meetings booked, ${n(p.webMeetingsSat)} sat, ${n(p.webMeetingsNoShow)} no shows. ` +
    `${n(p.customersWon)} customers won. ${n(p.presentationsSent)} presentations sent, ${n(p.engaged)} engaged (${n(r.presentationEngagement)}%). ` +
    `Snapshot: ${n(s.pipeline)} in pipeline, ${n(s.warm)} warm, ${n(s.specialOffer)} special offer, ${n(s.booked)} booked, ${n(s.noShow)} no shows, ${n(s.customer)} total customers. ` +
    `Rates: ${n(r.attendanceRate)}% attendance, ${n(r.postMeetingClose)}% post-meeting close, ${n(r.overallConversion)}% overall. ` +
    `Efficiency: ${n(e.avgCallsPostMeeting)} avg calls per post-meeting lead, ${n(e.avgEmailsPostMeeting)} avg emails. ` +
    `Offers: ${n(o.active)} active, ${n(o.expiringThisWeek)} expiring this week.`
  );
}
