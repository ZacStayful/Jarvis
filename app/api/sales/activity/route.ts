// app/api/sales/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchActivityLogEvents } from '@/lib/sales/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const { events, activityLogsAvailable } = await fetchActivityLogEvents({
      from,
      to,
    });

    const message = activityLogsAvailable
      ? undefined
      : `Tracking from ${new Date().toISOString().split('T')[0]}`;

    return NextResponse.json(
      {
        events,
        activityLogsAvailable,
        message,
        dateRange: { from, to, filtered: !!(from || to) },
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error) {
    console.error('[Sales Activity API]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        events: [],
        activityLogsAvailable: false,
      },
      { status: 500 },
    );
  }
}
