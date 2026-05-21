// app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { MANAGEMENT_LEADS_BOARD, MANAGEMENT_LEADS_COLUMNS as COL, STATUS_LABELS } from '@/lib/monday-columns';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const MONDAY_URL = 'https://api.monday.com/v2';

async function mondayQuery(query: string) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error('MONDAY_API_TOKEN not set');
  const res = await fetch(MONDAY_URL, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Monday API ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

function colVal(item: any, colId: string): string {
  const col = item.column_values?.find((c: any) => c.id === colId);
  return col?.text || '';
}

function isPopulated(item: any, colId: string): boolean {
  const col = item.column_values?.find((c: any) => c.id === colId);
  if (!col) return false;
  if (col.text && col.text.trim()) return true;
  if (col.value && col.value !== '{}' && col.value !== 'null') return true;
  return false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Columns to fetch
    const columnIds = [
      COL.status,
      COL.leadProfile,
      COL.presentationResponse,
      COL.callRecording,
      COL.specialOffer,
      COL.offerExpiry,
      COL.estAirbnbRent,
      COL.address,
      COL.email,
      COL.emailsSent,
      COL.wasNoShowed,
      COL.waStatus,
      COL.waMessagesSent,
      COL.waReplies,
      COL.waCompleted,
      COL.dateFirstQualified,
      COL.dateBecameCustomer,
    ].map(id => `"${id}"`).join(', ');

    // Paginate through all items
    let allItems: any[] = [];
    let cursor: string | null = null;

    const firstQuery = `{
      boards(ids: [${MANAGEMENT_LEADS_BOARD}]) {
        items_page(limit: 200) {
          cursor
          items {
            id
            name
            created_at
            column_values(ids: [${columnIds}]) {
              id
              text
              value
            }
          }
        }
      }
    }`;

    const firstData = await mondayQuery(firstQuery);
    const firstPage = firstData.boards?.[0]?.items_page;
    if (firstPage?.items) allItems.push(...firstPage.items);
    cursor = firstPage?.cursor || null;

    while (cursor) {
      const nextQuery = `{
        next_items_page(limit: 200, cursor: "${cursor}") {
          cursor
          items {
            id
            name
            created_at
            column_values(ids: [${columnIds}]) {
              id
              text
              value
            }
          }
        }
      }`;
      const nextData = await mondayQuery(nextQuery);
      const nextPage = nextData.next_items_page;
      if (nextPage?.items) allItems.push(...nextPage.items);
      cursor = nextPage?.cursor || null;
    }

    // Optional date range filter on created_at
    if (from || to) {
      const fromDate = from ? new Date(from) : new Date(0);
      const toDate = to ? new Date(to) : new Date();
      toDate.setHours(23, 59, 59, 999);
      allItems = allItems.filter(item => {
        const created = new Date(item.created_at);
        return created >= fromDate && created <= toDate;
      });
    }

    // ── Calculate metrics ──
    const statusCount = (label: string) =>
      allItems.filter(i => colVal(i, COL.status) === label).length;

    const total = allItems.length;
    const cold = statusCount(STATUS_LABELS.cold);
    const abandoned = statusCount(STATUS_LABELS.abandoned);
    const future = statusCount(STATUS_LABELS.future);
    const webMeetingBooked = statusCount(STATUS_LABELS.webMeetingBooked);
    const webMeetingNoShow = statusCount(STATUS_LABELS.webMeetingNoShow);
    const warm = statusCount(STATUS_LABELS.warm);
    const specialOffer = statusCount(STATUS_LABELS.specialOfferApplied);
    const customer = statusCount(STATUS_LABELS.customer);
    const attended = warm + specialOffer + customer;

    // Outreach
    const callsMade = allItems.filter(i => isPopulated(i, COL.callRecording)).length;
    const emailsEngaged = allItems.filter(i => isPopulated(i, COL.presentationResponse)).length;
    const totalEmailsSent = allItems.reduce((sum, i) => {
      const v = parseInt(colVal(i, COL.emailsSent) || '0', 10);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const waMessagesSent = allItems.reduce((sum, i) => {
      const v = parseInt(colVal(i, COL.waMessagesSent) || '0', 10);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const waReplies = allItems.reduce((sum, i) => {
      const v = parseInt(colVal(i, COL.waReplies) || '0', 10);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const waContacted = allItems.filter(i =>
      parseInt(colVal(i, COL.waMessagesSent) || '0', 10) > 0
    ).length;

    // No-show tracking
    const wasNoShowedCount = allItems.filter(i => {
      const raw = colVal(i, COL.wasNoShowed);
      return raw === 'true' || raw === 'Yes' || raw === 'v';
    }).length;

    // Special offers detail
    const offersActive = allItems.filter(i => isPopulated(i, COL.specialOffer));
    const now = new Date();
    const offers = offersActive.map(item => {
      const expiryStr = colVal(item, COL.offerExpiry);
      const expiry = expiryStr ? new Date(expiryStr) : null;
      const daysLeft = expiry
        ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        id: item.id,
        name: item.name,
        profile: colVal(item, COL.leadProfile),
        offerType: colVal(item, COL.specialOffer),
        expiry: expiryStr,
        daysLeft,
        status: colVal(item, COL.status),
        address: colVal(item, COL.address),
      };
    });

    const expiringThisWeek = offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 7).length;
    const expiringThisMonth = offers.filter(o => o.daysLeft !== null && o.daysLeft >= 0 && o.daysLeft <= 30).length;

    // ── Build response ──
    const metrics = {
      total,
      pipeline: {
        cold,
        abandoned,
        future,
        webMeetingBooked,
        webMeetingNoShow,
        warm,
        specialOffer,
        customer,
        attended,
        qualificationDropoff: total > 0 ? Math.round((abandoned / total) * 100) : 0,
        futureRate: total > 0 ? Math.round((future / total) * 100) : 0,
        attendanceRate: (attended + webMeetingNoShow) > 0 ? Math.round((attended / (attended + webMeetingNoShow)) * 100) : 0,
        noShowRate: (attended + webMeetingNoShow) > 0 ? Math.round((webMeetingNoShow / (attended + webMeetingNoShow)) * 100) : 0,
        postMeetingConversion: (warm + specialOffer + customer) > 0 ? Math.round((customer / (warm + specialOffer + customer)) * 100) : 0,
        overallConversion: total > 0 ? Math.round((customer / total) * 100) : 0,
        wasNoShowedCount,
      },
      outreach: {
        callsMade,
        emailsEngaged,
        totalEmailsSent,
        emailEngagementRate: total > 0 ? Math.round((emailsEngaged / total) * 100) : 0,
        waMessagesSent,
        waReplies,
        waContacted,
        waReplyRate: waContacted > 0 ? Math.round((waReplies / waContacted) * 100) : 0,
        waActive: waMessagesSent > 0,
      },
      offers: {
        active: offers.length,
        expiringThisWeek,
        expiringThisMonth,
        items: offers.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
      },
      dateRange: { from, to, filtered: !!(from || to) },
    };

    return NextResponse.json(metrics, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    console.error('[Sales API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
