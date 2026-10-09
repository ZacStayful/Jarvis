// app/api/marketing/route.ts
// Structured marketing-department data for MarketingDepartmentView.
// Reads stayful-ads (read-only, cached 1h) via lib/ads/department.ts.
// Protected by middleware.ts like every other non-webhook API route.
//
//   200 — snapshot loaded (errors[] lists any other file that didn't)
//   503 — STAYFUL_ADS_GITHUB_TOKEN missing, or the snapshot couldn't be read

import { NextResponse } from 'next/server';
import { getDepartmentData } from '@/lib/ads/department';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getDepartmentData();
  return NextResponse.json(data, {
    status: data.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
