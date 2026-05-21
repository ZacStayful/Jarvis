// /api/sales/activity — Monday activity_logs for the timeline section.
//
// Returns event entries within the requested date window. If the connected
// Monday plan does not expose activity_logs (or the query errors for any
// reason), responds with { available: false, entries: [], reason } rather
// than failing — the dashboard falls back to a "Tracking from [today]" pill.

import { NextRequest, NextResponse } from 'next/server';
import { loadActivityLogs, parseRange } from '@/lib/sales/monday';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const { from, to } = parseRange(
      req.nextUrl.searchParams.get('from'),
      req.nextUrl.searchParams.get('to')
    );
    const activity = await loadActivityLogs(from.toISOString(), to.toISOString());

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      activityLogsAvailable: activity.available,
      reason: activity.reason ?? null,
      entries: activity.entries,
      count: activity.entries.length,
    });
  } catch (err) {
    console.error('[api/sales/activity]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Activity fetch failed' },
      { status: 500 }
    );
  }
}
