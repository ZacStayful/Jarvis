// app/api/sales/route.ts
// Management Leads board — definitive implementation.
// DATA FLOOR: Only leads where "date" (Date Added) >= 2026-05-01.
// UPDATE PARSING: Web meeting dates, calls, emails from item updates.
// GROUPS define pipeline stage (not status column).

import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const BOARD_ID = "5891626711";
const MONDAY_URL = "https://api.monday.com/v2";
const DATA_FLOOR = new Date("2026-05-01T00:00:00.000Z");

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

const C = {
  dateAdded: "date",
  callRecordings: "file_mm1daxvv",
  noAnswerCount: "numeric_mm2tj6ny",
  presentationSent: "date_mm2q9b8g",
  followUp1Sent: "date_mm2q8sc3",
  followUp2Sent: "date_mm2q6e9x",
  presentationResponse: "long_text_mm2pse8d",
  postMeetingAction: "text_mm3h5atf",
  lostReason: "color_mm1v2s3m",
  specialOfferType: "dropdown_mm0wabga",
  specialOfferExpiry: "date_mm0wdvyx",
  address: "text6",
  leadProfile: "text_mm1x8cgy",
  leadName: "text",
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

function colText(item: any, id: string): string {
  return item.column_values?.find((c: any) => c.id === id)?.text || "";
}
function colPopulated(item: any, id: string): boolean {
  const c = item.column_values?.find((c: any) => c.id === id);
  if (!c) return false;
  return !!(c.text?.trim() || (c.value && c.value !== "{}" && c.value !== "null"));
}
function countFiles(item: any, id: string): number {
  const c = item.column_values?.find((c: any) => c.id === id);
  if (!c?.value) return 0;
  try { return JSON.parse(c.value).files?.length || 0; } catch { return 0; }
}

// Parse date from "Web meeting booked on Mon, 09 Mar 2026 09:45:43 +0000 (UTC)"
function parseWebMeetingDate(text: string): Date | null {
  const match = text.match(/Web meeting booked on (.+)/i);
  if (!match) return null;
  const d = new Date(match[1].replace(/ \(UTC\)$/, "").trim());
  return isNaN(d.getTime()) ? null : d;
}

// Classify an update by type
function classifyUpdate(text: string): "web_meeting" | "answered_call" | "unanswered_call" | "email" | "other" {
  if (/web meeting booked on/i.test(text)) return "web_meeting";
  if (text.startsWith("Call Recording Transcript")) return "answered_call";
  if (/^Called no answer/i.test(text.trim())) return "unanswered_call";
  if (text.startsWith("Outgoing Email") || text.startsWith("📧 Email sent")) return "email";
  return "other";
}

// Cache
let _cache: { items: any[]; expires: number } | null = null;
let _inFlight: Promise<any[]> | null = null;

async function fetchAllItems(): Promise<any[]> {
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
      const nq = `{
        next_items_page(limit: 200, cursor: "${cursor}") {
          cursor
          items {
            id name created_at
            group { id title }
            column_values(ids: [${colIds}]) { id text value }
          }
        }
      }`;
      const nd = await mondayQuery(nq);
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

// Fetch updates for a batch of item IDs
async function fetchUpdatesForItems(ids: string[]): Promise<Record<string, any[]>> {
  if (!ids.length) return {};
  const result: Record<string, any[]> = {};
  // Batch in groups of 50
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const idsStr = batch.join(", ");
    const q = `{
      items(ids: [${idsStr}]) {
        id
        updates(limit: 100) { text_body created_at }
      }
    }`;
    try {
      const data = await mondayQuery(q);
      for (const item of data.items || []) {
        result[item.id] = item.updates || [];
      }
    } catch {}
  }
  return result;
}

function avg(nums: number[], excludeZeros = true): number {
  const f = excludeZeros ? nums.filter(n => n > 0) : nums;
  if (!f.length) return 0;
  return Math.round((f.reduce((a, b) => a + b, 0) / f.length) * 10) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    // Apply data floor — never go before 1st May 2026
    const fromDate = fromStr
      ? new Date(Math.max(new Date(fromStr).getTime(), DATA_FLOOR.getTime()))
      : DATA_FLOOR;
    const toDate = toStr
      ? (() => { const d = new Date(toStr); d.setHours(23, 59, 59, 999); return d; })()
      : new Date();

    const allItems = await fetchAllItems();
    const items = allItems.filter(i => i.group?.id !== G.maintenance);

    const gid = (i: any): string => i.group?.id || "";

    // ── DATE ADDED FILTER ─────────────────────────────────────────
    // Only items where "date" (Date Added) >= DATA_FLOOR
    const isAfterFloor = (item: any): boolean => {
      const d = colText(item, C.dateAdded);
      if (!d) return false;
      return new Date(d) >= DATA_FLOOR;
    };

    const inPeriod = (item: any): boolean => {
      const d = colText(item, C.dateAdded);
      if (!d) return false;
      const date = new Date(d);
      return date >= fromDate && date <= toDate;
    };

    // Items added since floor date
    const floorItems = items.filter(isAfterFloor);
    // Items added in selected period
    const periodItems = items.filter(inPeriod);

    // ── FETCH UPDATES for post-meeting groups ─────────────────────
    // Only for items added since floor — manageable batch size
    const postMeetingGroupIds: string[] = [G.booked, G.noShow, G.warm, G.specialOffer, G.customer];
    const updateTargets = floorItems
      .filter(i => postMeetingGroupIds.includes(gid(i)))
      .map(i => i.id);

    const updatesMap = await fetchUpdatesForItems(updateTargets);

    // ── PARSE UPDATE EVENTS ───────────────────────────────────────
    // For each item, extract: web meeting dates, call counts, email counts
    const itemEvents: Record<string, {
      webMeetingDates: Date[];
      answeredCalls: number;
      unansweredCalls: number;
      emailsSent: number;
    }> = {};

    for (const [itemId, updates] of Object.entries(updatesMap)) {
      const events = { webMeetingDates: [] as Date[], answeredCalls: 0, unansweredCalls: 0, emailsSent: 0 };
      for (const update of updates) {
        const type = classifyUpdate(update.text_body || "");
        if (type === "web_meeting") {
          const d = parseWebMeetingDate(update.text_body);
          if (d) events.webMeetingDates.push(d);
        } else if (type === "answered_call")   events.answeredCalls++;
        else if (type === "unanswered_call")   events.unansweredCalls++;
        else if (type === "email")             events.emailsSent++;
      }
      itemEvents[itemId] = events;
    }

    // ── PERIOD METRICS (from date filter) ─────────────────────────
    const snap = (g: string) => floorItems.filter(i => gid(i) === g).length;

    const totalLeads = periodItems.length;

    // Web meetings booked in period: items where most recent web meeting date is in period
    const webMeetingsInPeriod = floorItems.filter(i => {
      const ev = itemEvents[i.id];
      if (!ev?.webMeetingDates.length) return false;
      return ev.webMeetingDates.some(d => d >= fromDate && d <= toDate);
    });
    const webMeetingCount = webMeetingsInPeriod.length;

    // Of those, who attended (now in warm or special offer)
    const webMeetingsSat    = webMeetingsInPeriod.filter(i => [G.warm, G.specialOffer].includes(gid(i) as any)).length;
    const webMeetingsNoShow = webMeetingsInPeriod.filter(i => gid(i) === G.noShow).length;
    const webMeetingsBooked = webMeetingsInPeriod.filter(i => gid(i) === G.booked).length;

    // Customers won in period
    const customersWon = periodItems.filter(i => gid(i) === G.customer).length;

    // Presentations sent in period (from date columns since pre-May may be inaccurate)
    const presentationsSent = periodItems.filter(i => colPopulated(i, C.presentationSent)).length;
    const engaged           = periodItems.filter(i => colPopulated(i, C.presentationResponse)).length;

    // Calls in period (from floor items updates, filtered by period)
    const callsInPeriod = floorItems.filter(i => {
      const ev = itemEvents[i.id];
      return (ev?.answeredCalls || 0) + (ev?.unansweredCalls || 0) > 0 && inPeriod(i);
    }).length;

    // ── SNAPSHOT (current state, floor items only) ────────────────
    const snapshot = {
      cold:          snap(G.cold),
      qualified:     snap(G.qualified),
      futureFromCall:snap(G.futureFromCall),
      pipeline:      snap(G.qualified) + snap(G.futureFromCall),
      booked:        snap(G.booked),
      noShow:        snap(G.noShow),
      warm:          snap(G.warm),
      specialOffer:  snap(G.specialOffer),
      customer:      snap(G.customer),
      abandoned:     snap(G.abandonedCall) + snap(G.abandonedLeads) + snap(G.abandonedFU),
      totalOnBoard:  floorItems.length,
    };

    // ── RATES ──────────────────────────────────────────────────────
    const attended = snapshot.warm + snapshot.specialOffer + snapshot.customer;
    const rates = {
      presentationEngagement: presentationsSent > 0
        ? Math.round(engaged / presentationsSent * 100) : 0,
      attendanceRate: (webMeetingsSat + webMeetingsNoShow) > 0
        ? Math.round(webMeetingsSat / (webMeetingsSat + webMeetingsNoShow) * 100) : 0,
      postMeetingClose: (snapshot.warm + snapshot.specialOffer + snapshot.customer) > 0
        ? Math.round(snapshot.customer / (snapshot.warm + snapshot.specialOffer + snapshot.customer) * 100) : 0,
      overallConversion: snapshot.totalOnBoard > 0
        ? Math.round(snapshot.customer / snapshot.totalOnBoard * 100) : 0,
      periodConversion: totalLeads > 0
        ? Math.round(customersWon / totalLeads * 100) : 0,
    };

    // ── EFFICIENCY (from parsed updates) ─────────────────────────
    const postMeetingItems = floorItems.filter(i => [G.warm, G.specialOffer, G.customer].includes(gid(i) as any));

    const callTotals  = postMeetingItems.map(i => {
      const ev = itemEvents[i.id];
      return (ev?.answeredCalls || 0) + (ev?.unansweredCalls || 0);
    });
    const emailTotals = postMeetingItems.map(i => itemEvents[i.id]?.emailsSent || 0);

    const efficiency = {
      avgCallsPostMeeting:   avg(callTotals),
      avgEmailsPostMeeting:  avg(emailTotals, false),
      postMeetingPoolSize:   postMeetingItems.length,
      dataFromUpdates:       Object.keys(updatesMap).length,
    };

    // ── ABANDONMENT ───────────────────────────────────────────────
    const abandonedItems = floorItems.filter(i =>
      [G.abandonedCall, G.abandonedLeads, G.abandonedFU].includes(gid(i) as any)
    );
    const reasonCounts: Record<string, number> = {};
    for (const item of abandonedItems) {
      const r = colText(item, C.lostReason) || "None";
      reasonCounts[r] = (reasonCounts[r] || 0) + 1;
    }
    const topReasons = Object.entries(reasonCounts)
      .filter(([r]) => r !== "None")
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // ── OFFERS ────────────────────────────────────────────────────
    const now = new Date();
    const offerItems = floorItems.filter(i => gid(i) === G.specialOffer);
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
    const waTotal = floorItems.reduce((s, i) => {
      const v = parseInt(colText(i, C.waMessagesSent) || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const waContacted = floorItems.filter(i =>
      parseInt(colText(i, C.waMessagesSent) || "0", 10) > 0
    ).length;
    const waReplies = floorItems.reduce((s, i) => {
      const v = parseInt(colText(i, C.waReplies) || "0", 10);
      return s + (isNaN(v) ? 0 : v);
    }, 0);

    return NextResponse.json({
      period: {
        totalLeads, webMeetingCount, webMeetingsSat,
        webMeetingsNoShow, webMeetingsBooked, customersWon,
        presentationsSent, engaged, callsInPeriod,
      },
      snapshot,
      rates,
      efficiency,
      abandonment: {
        total: abandonedItems.length,
        withReason: abandonedItems.length - (reasonCounts["None"] || 0),
        noReason: reasonCounts["None"] || 0,
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
      dataFloor: "2026-05-01",
      dateRange: {
        from: fromDate.toISOString().split("T")[0],
        to: toDate.toISOString().split("T")[0],
        filtered: !!(fromStr || toStr),
      },
    }, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    console.error("[Sales API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
