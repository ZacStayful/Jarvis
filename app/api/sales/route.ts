// app/api/sales/route.ts
// Management Leads board (5891626711) — definitive implementation.
// ALL metrics verified against real board data and confirmed with Zac.
//
// KEY FACTS:
// - Every lead starts in Cold Management Leads (topics group)
// - created_at = when lead entered board = accurate total lead count
// - file_mm1daxvv files array length = answered calls per lead
// - numeric_mm2tj6ny = unanswered call count
// - Emails = count of populated date columns: sent + FU1 + FU2
// - Warm AND Special offer = attended web meeting
// - text_mm3h5atf populated = had web meeting (only accurate from recent automation)
// - Engagement = long_text_mm2pse8d populated (lead answered presentation questions)

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const BOARD_ID = "5891626711";
const MONDAY_URL = "https://api.monday.com/v2";

// Pipeline stage groups — confirmed board structure
const G = {
  maintenance: "group_mkwhk3z9",
  cold: "topics",
  qualified: "group_mm28ypgs",
  futureFromCall: "group_mm1htyz7",
  futureGeneral: "group_mkwthdxq",
  abandonedCall: "group_mkwt7bfr",
  booked: "group_mksxb5m0",
  noShow: "group_mkwx4dhv",
  warm: "group_mksx27r4",
  specialOffer: "group_mm16jhqm",
  abandonedLeads: "group_mkwtw6he",
  abandonedFU: "group_mm151eer",
  customer: "group_mm1dtkdm",
} as const;

// Columns — confirmed IDs
const C = {
  dateAdded: "date",
  callRecordings: "file_mm1daxvv",
  noAnswerCount: "numeric_mm2tj6ny",
  presentationSent: "date_mm2q9b8g",
  followUp1Sent: "date_mm2q8sc3",
  followUp2Sent: "date_mm2q6e9x",
  presentationViewed: "date_mm2qppyp",
  presentationResponses: "long_text_mm2pse8d",
  postMeetingAction: "text_mm3h5atf",
  lostReason: "color_mm1v2s3m",
  specialOfferType: "dropdown_mm0wabga",
  specialOfferExpiry: "date_mm0wdvyx",
  address: "text6",
  leadProfile: "text_mm1x8cgy",
  waMessagesSent: "numeric_mm3jrh70",
  waReplies: "numeric_mm3j1dff",
} as const;

async function mondayQuery(query: string) {
  const token = process.env.MONDAY_API_TOKEN || process.env.MONDAY_API_KEY;
  if (!token) throw new Error("Monday API token not set");
  const res = await fetch(MONDAY_URL, {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Monday API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// ── Helpers ────────────────────────────────────────────────────────

function col(item: any, id: string) { return item.column_values?.find((c: any) => c.id === id); }
function colText(item: any, id: string): string { return col(item, id)?.text || ""; }
function colPopulated(item: any, id: string): boolean {
  const c = col(item, id);
  if (!c) return false;
  return !!(c.text?.trim() || (c.value && c.value !== "{}" && c.value !== "null"));
}

// Each file in the files array = 1 answered call (confirmed by Zac)
function answeredCalls(item: any): number {
  const c = col(item, C.callRecordings);
  if (!c?.value) return 0;
  try { return JSON.parse(c.value).files?.length || 0; } catch { return 0; }
}

// Unanswered calls from no-answer counter
function unansweredCalls(item: any): number {
  const v = parseInt(colText(item, C.noAnswerCount), 10);
  return isNaN(v) ? 0 : v;
}

// Total calls = answered + unanswered
function totalCalls(item: any): number { return answeredCalls(item) + unansweredCalls(item); }

// Total emails = count of populated date columns for each send event
function totalEmails(item: any): number {
  let n = 0;
  if (colPopulated(item, C.presentationSent)) n++;
  if (colPopulated(item, C.followUp1Sent)) n++;
  if (colPopulated(item, C.followUp2Sent)) n++;
  return n;
}

// Date helpers
function itemCreatedAt(item: any): Date { return new Date(item.created_at); }
function colDate(item: any, id: string): Date | null {
  const t = colText(item, id);
  if (!t) return null;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}
function inPeriod(date: Date | null, from: Date | null, to: Date | null): boolean {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// Average of numbers, excluding zeros for meaningful averages
function avg(nums: number[], excludeZeros = true): number {
  const filtered = excludeZeros ? nums.filter(n => n > 0) : nums;
  if (!filtered.length) return 0;
  return Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length) * 10) / 10;
}

// ── Cache ───────────────────────────────────────────────────────────
let _cache: { items: any[]; expires: number } | null = null;
let _inFlight: Promise<any[]> | null = null;

async function fetchAll(): Promise<any[]> {
  if (_cache && _cache.expires > Date.now()) return _cache.items;
  if (_inFlight) return _inFlight;

  const colIds = Object.values(C).map(c => `"${c}"`).join(", ");

  _inFlight = (async () => {
    let all: any[] = [];
    let cursor: string | null = null;

    const first = `{
      boards(ids: [${BOARD_ID}]) {
        items_page(limit: 200) {
          cursor
          items {
            id name created_at
            group { id title }
            column_values(ids: [${colIds}]) { id text value }
          }
        }
      }
    }`;

    const fd = await mondayQuery(first);
    const fp = fd.boards?.[0]?.items_page;
    if (fp?.items) all.push(...fp.items);
    cursor = fp?.cursor || null;

    while (cursor) {
      const next = `{
        next_items_page(limit: 200, cursor: "${cursor}") {
          cursor
          items {
            id name created_at
            group { id title }
            column_values(ids: [${colIds}]) { id text value }
          }
        }
      }`;
      const nd = await mondayQuery(next);
      const np = nd.next_items_page;
      if (np?.items) all.push(...np.items);
      cursor = np?.cursor || null;
    }

    _cache = { items: all, expires: Date.now() + 5 * 60 * 1000 };
    _inFlight = null;
    return all;
  })();
  return _inFlight;
}

// ── Route ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const fromDate = fromStr ? new Date(fromStr) : null;
    const toDate = toStr ? (() => { const d = new Date(toStr); d.setHours(23, 59, 59, 999); return d; })() : null;
    const filtered = !!(fromDate || toDate);

    const all = await fetchAll();
    // Exclude maintenance service leads from everything
    const items = all.filter(i => i.group?.id !== G.maintenance);

    const gid = (i: any): string => i.group?.id || "";

    // ── PERIOD METRICS ───────────────────────────────────────────
    // Based on created_at — every lead starts in cold, so created_at = date entered board
    const period = filtered
      ? items.filter(i => inPeriod(itemCreatedAt(i), fromDate, toDate))
      : items;

    const totalLeads = period.length;

    // Leads added in period that progressed to web meeting or beyond
    const postMeetingGroups = [G.warm, G.specialOffer, G.customer];
    const webMeetingGroups  = [G.booked, G.noShow, ...postMeetingGroups];

    const webMeetingSat      = period.filter(i => postMeetingGroups.includes(gid(i) as any)).length;
    const webMeetingNoShow   = period.filter(i => gid(i) === G.noShow).length;
    const webMeetingUpcoming = period.filter(i => gid(i) === G.booked).length;
    const totalWebMeetings   = webMeetingSat + webMeetingNoShow + webMeetingUpcoming;
    const customersWon       = period.filter(i => gid(i) === G.customer).length;
    const abandonedInPeriod  = period.filter(i =>
      [G.abandonedCall, G.abandonedLeads, G.abandonedFU].includes(gid(i) as any)
    ).length;

    // Outreach in period — by activity date columns
    const presentationsSent = items.filter(i =>
      inPeriod(colDate(i, C.presentationSent), fromDate, toDate)
    ).length;
    const engaged = items.filter(i =>
      inPeriod(colDate(i, C.presentationSent), fromDate, toDate) &&
      colPopulated(i, C.presentationResponses)
    ).length;
    const callsMadeInPeriod = period.filter(i => answeredCalls(i) > 0).length;

    // ── SNAPSHOT (current state, no date filter) ──────────────────
    const snap = (g: string) => items.filter(i => gid(i) === g).length;
    const snapshot = {
      cold:            snap(G.cold),
      qualified:       snap(G.qualified),
      futureFromCall:  snap(G.futureFromCall),
      futureGeneral:   snap(G.futureGeneral),
      pipeline:        snap(G.qualified) + snap(G.futureFromCall), // total needing contact
      booked:          snap(G.booked),
      noShow:          snap(G.noShow),
      warm:            snap(G.warm),
      specialOffer:    snap(G.specialOffer),
      customer:        snap(G.customer),
      abandonedAll:    snap(G.abandonedCall) + snap(G.abandonedLeads) + snap(G.abandonedFU),
      totalOnBoard:    items.length,
    };

    // ── FUNNEL RATES (snapshot-based) ─────────────────────────────
    const attended = snapshot.warm + snapshot.specialOffer + snapshot.customer;
    const totalMeetingActivity = snapshot.booked + snapshot.noShow + attended;

    const rates = {
      // Engagement
      presentationEngagement: presentationsSent > 0
        ? Math.round(engaged / presentationsSent * 100) : 0,
      // Funnel progression
      qualificationRate: snapshot.totalOnBoard > 0
        ? Math.round(snapshot.pipeline / snapshot.totalOnBoard * 100) : 0,
      meetingBookingRate: snapshot.pipeline > 0
        ? Math.round(totalMeetingActivity / snapshot.pipeline * 100) : 0,
      attendanceRate: (attended + snapshot.noShow) > 0
        ? Math.round(attended / (attended + snapshot.noShow) * 100) : 0,
      specialOfferRate: attended > 0
        ? Math.round(snapshot.specialOffer / attended * 100) : 0,
      warmRate: attended > 0
        ? Math.round(snapshot.warm / attended * 100) : 0,
      // Post-meeting close — warm+offer+customer pool
      // Note: excludes abandoned post-meeting leads (data limited)
      postMeetingClose: (snapshot.warm + snapshot.specialOffer + snapshot.customer) > 0
        ? Math.round(snapshot.customer / (snapshot.warm + snapshot.specialOffer + snapshot.customer) * 100) : 0,
      // Overall
      overallConversion: snapshot.totalOnBoard > 0
        ? Math.round(snapshot.customer / snapshot.totalOnBoard * 100) : 0,
      // Period conversion
      periodConversion: totalLeads > 0
        ? Math.round(customersWon / totalLeads * 100) : 0,
    };

    // ── EFFICIENCY METRICS ────────────────────────────────────────
    // Pool: warm + special offer + customer (all attended web meeting)
    // Includes customers for completeness even if some data is missing
    const postMeetingItems = items.filter(i => postMeetingGroups.includes(gid(i) as any));
    const customerItems    = items.filter(i => gid(i) === G.customer);

    // Calls
    const callCounts     = postMeetingItems.map(totalCalls);
    const custCallCounts = customerItems.map(totalCalls);

    // Emails — only for leads where email tracking exists (presentationSent populated)
    const emailItems       = postMeetingItems.filter(i => colPopulated(i, C.presentationSent));
    const emailCounts      = emailItems.map(totalEmails);
    const custEmailItems   = customerItems.filter(i => colPopulated(i, C.presentationSent));
    const custEmailCounts  = custEmailItems.map(totalEmails);

    // For cold leads (to understand calls per booking from start)
    const bookedAndBeyond = items.filter(i => webMeetingGroups.includes(gid(i) as any));
    const callsToBooking  = bookedAndBeyond.map(totalCalls);

    const efficiency = {
      // Calls
      avgCallsPostMeeting:      avg(callCounts),
      avgCallsCustomer:         avg(custCallCounts),
      avgCallsToBookMeeting:    avg(callsToBooking),
      totalAnsweredCallsPool:   callCounts.filter(n => n > 0).length,
      // Emails
      avgEmailsPostMeeting:     avg(emailCounts, false),
      avgEmailsCustomer:        avg(custEmailCounts, false),
      emailTrackingPoolSize:    emailItems.length,
      custEmailTrackingPoolSize: custEmailItems.length,
      // Data notes
      postMeetingPoolSize:      postMeetingItems.length,
      customerPoolSize:         customerItems.length,
    };

    // ── ABANDONMENT INTELLIGENCE ──────────────────────────────────
    const abandonedItems = items.filter(i =>
      [G.abandonedCall, G.abandonedLeads, G.abandonedFU].includes(gid(i) as any)
    );

    // Count by lost reason
    const reasonCounts: Record<string, number> = {};
    for (const item of abandonedItems) {
      const reason = colText(item, C.lostReason) || "None";
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    }

    const topReasons = Object.entries(reasonCounts)
      .filter(([r]) => r !== "None")
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    const noReasonCount = reasonCounts["None"] || 0;

    // Post-meeting abandoned (action plan populated = had meeting before abandoning)
    // Note: only accurate from recent automation
    const postMeetingAbandoned = abandonedItems.filter(i =>
      colPopulated(i, C.postMeetingAction)
    ).length;

    // ── SPECIAL OFFERS ────────────────────────────────────────────
    const now = new Date();
    const offerItems = items.filter(i => gid(i) === G.specialOffer);
    const offers = offerItems.map(item => {
      const expiryStr = colText(item, C.specialOfferExpiry);
      const expiry = expiryStr ? new Date(expiryStr) : null;
      const daysLeft = expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: item.id, name: item.name,
        profile: colText(item, C.leadProfile),
        offerType: colText(item, C.specialOfferType),
        expiry: expiryStr, daysLeft,
        address: colText(item, C.address),
      };
    });

    // ── WHATSAPP ──────────────────────────────────────────────────
    const waTotal = items.reduce((s, i) => {
      const v = parseInt(colText(i, C.waMessagesSent) || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const waContacted = items.filter(i =>
      parseInt(colText(i, C.waMessagesSent) || "0", 10) > 0
    ).length;
    const waReplies = items.reduce((s, i) => {
      const v = parseInt(colText(i, C.waReplies) || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    return NextResponse.json({
      period: {
        totalLeads, webMeetingSat, webMeetingNoShow, webMeetingUpcoming,
        totalWebMeetings, customersWon, abandonedInPeriod,
        presentationsSent, engaged,
        callsMadeInPeriod,
      },
      snapshot,
      rates,
      efficiency,
      abandonment: {
        total: abandonedItems.length,
        withReason: abandonedItems.length - noReasonCount,
        noReason: noReasonCount,
        postMeetingAbandoned,
        topReasons,
      },
      offers: {
        active: offerItems.length,
        expiringThisWeek:  offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7).length,
        expiringThisMonth: offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 30).length,
        items: offers.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
      },
      whatsapp: {
        messagesSent: waTotal, contacted: waContacted, replies: waReplies,
        replyRate: waContacted > 0 ? Math.round(waReplies / waContacted * 100) : 0,
        active: waTotal > 0,
      },
      dateRange: { from: fromStr, to: toStr, filtered },
    }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("[Sales API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
