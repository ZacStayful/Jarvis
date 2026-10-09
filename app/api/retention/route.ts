// app/api/retention/route.ts
// Lead-database retention dashboard data for RetentionDashboardView.
// Monday enquiries board (funnel, cached 5 min) + the lead-database app's
// read-only retention feed (churn, cached 5 min), joined on email in
// lib/retention/server.ts. Protected by middleware.ts like every other
// non-webhook API route — do not move it under /api/monday, which is a
// JARVIS_API_SECRET service route.
//
//   GET /api/retention?from=YYYY-MM-DD&to=YYYY-MM-DD   (default: last 30 days)
//   200 — the board was read (errors[] lists anything else that wasn't)
//   503 — MONDAY_API_KEY missing or the board couldn't be read

import { NextResponse, type NextRequest } from 'next/server';
import { parseRange } from '@/lib/retention/dates';
import { getRetentionDashboardData } from '@/lib/retention/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get('from'), url.searchParams.get('to'));
  const data = await getRetentionDashboardData(range);
  return NextResponse.json(data, {
    status: data.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
