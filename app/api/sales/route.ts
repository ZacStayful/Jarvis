// app/api/sales/route.ts
// Queries Monday.com Management Leads board (5891626711) and counts leads
// by GROUP — not status column. The board is organised by groups which
// define the actual pipeline stage.

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MONDAY_URL = "https://api.monday.com/v2";
const BOARD_ID = "5891626711";

// Group IDs — these are the pipeline stages
const GROUPS = {
  cold: "topics",                       // Cold Management Leads
  qualified: "group_mm28ypgs",          // Qualified Management Leads
  futureFromCall: "group_mm1htyz7",     // In the future Due to call
  futureGeneral: "group_mkwthdxq",      // In the future management leads
  abandonedFromCall: "group_mkwt7bfr",  // Abandoned Due to call
  webMeetingBooked: "group_mksxb5m0",   // Web meeting booked
  noShow: "group_mkwx4dhv",             // Web meeting No show
  warm: "group_mksx27r4",               // Web meeting sat/warm
  specialOffer: "group_mm16jhqm",       // Special offer applied
  abandonedGeneral: "group_mkwtw6he",   // Abandoned Leads
  abandonedFollowUp: "group_mm151eer",  // Abandoned Leads follow up flow
  customer: "group_mm1dtkdm",           // Customer / signed
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
  if (col.text?.trim()) return true;
  if (col.value && col.value !== "{}" && col.value !== "null") return true;
  return false;
}

const COLUMNS_TO_FETCH = [
  "date",                  // Date added
  "dropdown_mm0wabga",     // Special offer type
  "date_mm0wdvyx",         // Special offer expiry
  "file_mm1daxvv",         // Call recordings
  "long_text_mm2pse8d",    // Presentation responses
  "date_mm2qppyp",         // Presentation Viewed
  "date_mm2q9b8g",         // Presentation Email Sent
  "text6",                 // Address
  "text_mm1x8cgy",         // Lead Profile
  "numeric_mm3jrh70",      // WA Messages Sent
  "numeric_mm3j1dff",      // WA Replies
];

// In-memory cache — expires after 5 minutes
let cache: { data: any; expires: number } | null = null;
let inFlight: Promise<any> | null = null;

async function fetchAllLeads(): Promise<any[]> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.data;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const colIds = COLUMNS_TO_FETCH.map((c) => `"${c}"`).join(", ");
    let allItems: any[] = [];
    let cursor: string | null = null;

    // First page
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
    const firstPage = firstData.boards?.[0]?.items_page;
    if (firstPage?.items) allItems.push(...firstPage.items);
    cursor = firstPage?.cursor || null;

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
      const nextData = await mondayQuery(nextQ);
      const nextPage = nextData.next_items_page;
      if (nextPage?.items) allItems.push(...nextPage.items);
      cursor = nextPage?.cursor || null;
    }

    cache = { data: allItems, expires: Date.now() + 5 * 60 * 1000 };
    inFlight = null;
    return allItems;
  })();
  return inFlight;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let items = await fetchAllLeads();

    // Date filter: use the "date" (Date added) column
    if (from || to) {
      const fromDate = from ? new Date(from) : new Date(0);
      const toDate = to ? new Date(to) : new Date();
      toDate.setHours(23, 59, 59, 999);
      items = items.filter((item) => {
        const dateAdded = colText(item, "date");
        if (!dateAdded) return false;
        const d = new Date(dateAdded);
        return d >= fromDate && d <= toDate;
      });
    }

    // Count items per group
    const byGroup: Record<string, number> = {};
    for (const item of items) {
      const gid = item.group?.id || "unknown";
      byGroup[gid] = (byGroup[gid] || 0) + 1;
    }

    const g = (id: string) => byGroup[id] || 0;

    // ── Funnel metrics ──
    const cold              = g(GROUPS.cold);
    const qualified         = g(GROUPS.qualified);
    const futureFromCall    = g(GROUPS.futureFromCall);
    const futureGeneral     = g(GROUPS.futureGeneral);
    const future            = futureFromCall + futureGeneral;
    const abandonedFromCall = g(GROUPS.abandonedFromCall);
    const webMeetingBooked  = g(GROUPS.webMeetingBooked);
    const noShow            = g(GROUPS.noShow);
    const warm              = g(GROUPS.warm);
    const specialOffer      = g(GROUPS.specialOffer);
    const abandonedGeneral  = g(GROUPS.abandonedGeneral) + g(GROUPS.abandonedFollowUp);
    const customer          = g(GROUPS.customer);

    // Total active pipeline = qualified + future + web meeting stages
    const totalPipeline = qualified + future + webMeetingBooked + noShow + warm + specialOffer + customer;
    const totalLeads = items.filter(i => i.group?.id !== "group_mkwhk3z9").length; // exclude maintenance

    // Outreach
    const callsMade     = items.filter(i => colPopulated(i, "file_mm1daxvv")).length;
    const presentationEmailSent = items.filter(i => colPopulated(i, "date_mm2q9b8g")).length;
    const presentationViewed    = items.filter(i => colPopulated(i, "date_mm2qppyp")).length;
    const engagementRate = presentationEmailSent > 0
      ? Math.round((presentationViewed / presentationEmailSent) * 100)
      : 0;

    // WhatsApp
    const waMessagesSent = items.reduce((s, i) => {
      const v = parseInt(colText(i, "numeric_mm3jrh70") || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const waReplies = items.reduce((s, i) => {
      const v = parseInt(colText(i, "numeric_mm3j1dff") || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const waContacted = items.filter(i =>
      parseInt(colText(i, "numeric_mm3jrh70") || "0", 10) > 0
    ).length;

    // Conversion rates
    const qualifiedToMeetingRate = qualified > 0
      ? Math.round((webMeetingBooked / (qualified + webMeetingBooked + noShow + warm + specialOffer)) * 100)
      : 0;
    const attendanceRate = (webMeetingBooked + noShow) > 0
      ? Math.round(((warm + specialOffer + customer) / (warm + specialOffer + customer + noShow)) * 100)
      : 0;
    const postMeetingConversion = (warm + specialOffer + customer) > 0
      ? Math.round((customer / (warm + specialOffer + customer)) * 100)
      : 0;
    const coldToCustomer = cold > 0
      ? Math.round((customer / totalLeads) * 100)
      : 0;

    // Special offer details
    const now = new Date();
    const offerItems = items.filter(i => i.group?.id === GROUPS.specialOffer);
    const offers = offerItems.map(item => {
      const expiryStr = colText(item, "date_mm0wdvyx");
      const expiry = expiryStr ? new Date(expiryStr) : null;
      const daysLeft = expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: item.id,
        name: item.name,
        profile: colText(item, "text_mm1x8cgy"),
        offerType: colText(item, "dropdown_mm0wabga"),
        expiry: expiryStr,
        daysLeft,
        address: colText(item, "text6"),
      };
    });
    const expiringThisWeek  = offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7).length;
    const expiringThisMonth = offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 30).length;

    const metrics = {
      // Raw counts by group
      funnel: {
        cold,
        qualified,
        future,
        futureFromCall,
        futureGeneral,
        abandonedFromCall,
        abandonedGeneral,
        webMeetingBooked,
        noShow,
        warm,
        specialOffer,
        customer,
        totalPipeline,
        totalLeads,
      },
      // Conversion rates
      rates: {
        qualifiedToMeetingRate,
        attendanceRate,
        postMeetingConversion,
        coldToCustomer,
        engagementRate,
      },
      // Outreach
      outreach: {
        callsMade,
        presentationEmailSent,
        presentationViewed,
        waMessagesSent,
        waReplies,
        waContacted,
        waReplyRate: waContacted > 0 ? Math.round((waReplies / waContacted) * 100) : 0,
        waActive: waMessagesSent > 0,
      },
      // Special offers
      offers: {
        active: offers.length,
        expiringThisWeek,
        expiringThisMonth,
        items: offers.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
      },
      dateRange: { from, to, filtered: !!(from || to) },
    };

    return NextResponse.json(metrics, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("[Sales API]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
