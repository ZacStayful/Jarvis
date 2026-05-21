// app/api/sales/route.ts
// Management Leads board (5891626711) — group-based counting.
// Board is organised by GROUPS (pipeline stages). The "date" column
// = Date Added to board. Used for all period-based calculations.
// There is no dedicated "web meeting date" column — proximity logic:
// leads added in period AND now in web meeting groups = had meeting in period.

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const BOARD_ID = "5891626711";
const MONDAY_URL = "https://api.monday.com/v2";

// Pipeline stage groups
const G = {
  maintenance: "group_mkwhk3z9",     // excluded from all metrics
  cold: "topics",                    // Cold Management Leads (holding pen)
  qualified: "group_mm28ypgs",       // Qualified Management Leads
  futureFromCall: "group_mm1htyz7",  // In the future Due to call
  futureGeneral: "group_mkwthdxq",   // In the future management leads
  abandonedCall: "group_mkwt7bfr",   // Abandoned Due to call
  booked: "group_mksxb5m0",          // Web meeting booked (upcoming)
  noShow: "group_mkwx4dhv",          // Web meeting No show
  warm: "group_mksx27r4",            // Web meeting sat/warm
  specialOffer: "group_mm16jhqm",    // Special offer applied
  abandonedLeads: "group_mkwtw6he",  // Abandoned Leads
  abandonedFU: "group_mm151eer",     // Abandoned Leads follow up
  customer: "group_mm1dtkdm",        // Customer / signed
} as const;

// Column IDs
const COL = {
  dateAdded: "date",                       // Date Added to board
  presentationSent: "date_mm2q9b8g",       // Presentation Email Sent date
  presentationViewed: "date_mm2qppyp",     // Presentation Viewed date
  callRecording: "file_mm1daxvv",          // Call recordings file
  specialOfferType: "dropdown_mm0wabga",
  specialOfferExpiry: "date_mm0wdvyx",
  address: "text6",
  leadProfile: "text_mm1x8cgy",
  noShowDate: "date_mm39hhdq",
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

function colText(item: any, colId: string): string {
  return item.column_values?.find((c: any) => c.id === colId)?.text || "";
}
function colPopulated(item: any, colId: string): boolean {
  const col = item.column_values?.find((c: any) => c.id === colId);
  if (!col) return false;
  return !!(col.text?.trim() || (col.value && col.value !== "{}" && col.value !== "null"));
}
function parseDate(item: any, colId: string): Date | null {
  const text = colText(item, colId);
  if (!text) return null;
  const d = new Date(text);
  return isNaN(d.getTime()) ? null : d;
}

// In-flight dedup + 5-min cache
let _cache: { items: any[]; expires: number } | null = null;
let _inFlight: Promise<any[]> | null = null;

async function fetchAllItems(): Promise<any[]> {
  if (_cache && _cache.expires > Date.now()) return _cache.items;
  if (_inFlight) return _inFlight;

  const colIds = Object.values(COL).map((c) => `"${c}"`).join(", ");

  _inFlight = (async () => {
    let all: any[] = [];
    let cursor: string | null = null;

    const firstQ = `{
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

    const firstData = await mondayQuery(firstQ);
    const fp = firstData.boards?.[0]?.items_page;
    if (fp?.items) all.push(...fp.items);
    cursor = fp?.cursor || null;

    while (cursor) {
      const nextQ = `{
        next_items_page(limit: 200, cursor: "${cursor}") {
          cursor
          items {
            id name created_at
            group { id title }
            column_values(ids: [${colIds}]) { id text value }
          }
        }
      }`;
      const nd = await mondayQuery(nextQ);
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

function inPeriod(item: any, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  const d = parseDate(item, COL.dateAdded);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function inDateColPeriod(item: any, colId: string, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  const d = parseDate(item, colId);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const fromDate = fromStr ? new Date(fromStr) : null;
    const toDate = toStr ? (() => { const d = new Date(toStr); d.setHours(23, 59, 59, 999); return d; })() : null;

    const allItems = await fetchAllItems();

    // Exclude maintenance service leads from all calculations
    const items = allItems.filter(i => i.group?.id !== G.maintenance);

    const gid = (item: any) => item.group?.id as string;

    // ── PERIOD METRICS ──────────────────────────────────────────────
    // Based on "date" (Date Added) being within the selected period.
    // Logic: a lead added in period X that is now in a post-meeting
    // group sat their web meeting in approximately that period.

    const periodItems = items.filter(i => inPeriod(i, fromDate, toDate));

    const totalLeads = periodItems.length;

    // Web meetings sat = added in period AND currently in warm/specialOffer/customer
    const webMeetingsSat = periodItems.filter(i =>
      [G.warm, G.specialOffer, G.customer].includes(gid(i) as any)
    ).length;

    // Web meetings missed = added in period AND currently in noShow
    const webMeetingsMissed = periodItems.filter(i => gid(i) === G.noShow).length;

    // Web meetings upcoming = added in period AND currently in booked
    const webMeetingsUpcoming = periodItems.filter(i => gid(i) === G.booked).length;

    // Total web meeting activity for period
    const totalWebMeetings = webMeetingsSat + webMeetingsMissed + webMeetingsUpcoming;

    // Customers won in period (added in period AND now customer)
    const customersWon = periodItems.filter(i => gid(i) === G.customer).length;

    // Abandoned in period
    const abandonedInPeriod = periodItems.filter(i =>
      [G.abandonedCall, G.abandonedLeads, G.abandonedFU].includes(gid(i) as any)
    ).length;

    // Outreach in period — filtered by activity date columns
    const presentationsSentInPeriod = items.filter(i =>
      inDateColPeriod(i, COL.presentationSent, fromDate, toDate)
    ).length;

    const presentationsViewedInPeriod = items.filter(i =>
      inDateColPeriod(i, COL.presentationViewed, fromDate, toDate)
    ).length;

    const callsMadeInPeriod = items.filter(i =>
      inPeriod(i, fromDate, toDate) && colPopulated(i, COL.callRecording)
    ).length;

    // ── LIVE SNAPSHOT ───────────────────────────────────────────────
    // Current state regardless of date — how many are in each stage right now.
    const snap = (groupId: string) => items.filter(i => gid(i) === groupId).length;

    const snapshot = {
      qualified:    snap(G.qualified),
      future:       snap(G.futureFromCall) + snap(G.futureGeneral),
      booked:       snap(G.booked),
      noShow:       snap(G.noShow),
      warm:         snap(G.warm),
      specialOffer: snap(G.specialOffer),
      customer:     snap(G.customer),
      abandoned:    snap(G.abandonedCall) + snap(G.abandonedLeads) + snap(G.abandonedFU),
    };

    // ── CONVERSION RATES ────────────────────────────────────────────
    const rates = {
      webMeetingRate: totalLeads > 0
        ? Math.round((totalWebMeetings / totalLeads) * 100) : 0,
      attendanceRate: (webMeetingsSat + webMeetingsMissed) > 0
        ? Math.round((webMeetingsSat / (webMeetingsSat + webMeetingsMissed)) * 100) : 0,
      customerRate: totalLeads > 0
        ? Math.round((customersWon / totalLeads) * 100) : 0,
      presentationEngagement: presentationsSentInPeriod > 0
        ? Math.round((presentationsViewedInPeriod / presentationsSentInPeriod) * 100) : 0,
      postMeetingClose: (snapshot.warm + snapshot.specialOffer + snapshot.customer) > 0
        ? Math.round((snapshot.customer / (snapshot.warm + snapshot.specialOffer + snapshot.customer)) * 100) : 0,
    };

    // ── SPECIAL OFFER DETAILS ───────────────────────────────────────
    const now = new Date();
    const offerItems = items.filter(i => gid(i) === G.specialOffer);
    const offers = offerItems.map(item => {
      const expiryStr = colText(item, COL.specialOfferExpiry);
      const expiry = expiryStr ? new Date(expiryStr) : null;
      const daysLeft = expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: item.id, name: item.name,
        profile: colText(item, COL.leadProfile),
        offerType: colText(item, COL.specialOfferType),
        expiry: expiryStr, daysLeft,
        address: colText(item, COL.address),
      };
    });

    // ── WHATSAPP ────────────────────────────────────────────────────
    const waTotal = items.reduce((s, i) => {
      const v = parseInt(colText(i, COL.waMessagesSent) || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const waContacted = items.filter(i =>
      parseInt(colText(i, COL.waMessagesSent) || "0", 10) > 0
    ).length;
    const waReplies = items.reduce((s, i) => {
      const v = parseInt(colText(i, COL.waReplies) || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    return NextResponse.json({
      period: {
        totalLeads,
        webMeetingsSat,
        webMeetingsMissed,
        webMeetingsUpcoming,
        totalWebMeetings,
        customersWon,
        abandonedInPeriod,
        presentationsSent: presentationsSentInPeriod,
        presentationsViewed: presentationsViewedInPeriod,
        callsMade: callsMadeInPeriod,
      },
      snapshot,
      rates,
      offers: {
        active: offerItems.length,
        expiringThisWeek:  offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7).length,
        expiringThisMonth: offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 30).length,
        items: offers.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
      },
      whatsapp: {
        messagesSent: waTotal,
        contacted: waContacted,
        replies: waReplies,
        replyRate: waContacted > 0 ? Math.round((waReplies / waContacted) * 100) : 0,
        active: waTotal > 0,
      },
      dateRange: { from: fromStr, to: toStr, filtered: !!(fromStr || toStr) },
    }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    console.error("[Sales API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
