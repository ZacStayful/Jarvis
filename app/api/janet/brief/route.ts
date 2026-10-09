// app/api/janet/brief/route.ts
// Executes Janet's approved actions against stayful-ads (see
// lib/janet/ads-writer.ts). Called by useJARVIS.approveAction for the
// create_ad_brief and build_ad action types instead of the chat route —
// Claude has no tool for these, so the app does them deterministically.
// Protected by middleware.ts like every other non-webhook API route.

import { NextRequest, NextResponse } from 'next/server';
import { buildAd, createAdBrief } from '@/lib/janet/ads-writer';
import type { BuildAdDetails, CreateAdBriefDetails } from '@/types/jarvis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let body: { type?: string; details?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body' }, { status: 400 });
  }

  const details = (body.details ?? {}) as Record<string, unknown>;

  if (body.type === 'create_ad_brief') {
    const outcome = await createAdBrief(details as unknown as CreateAdBriefDetails);
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
  }

  if (body.type === 'build_ad') {
    const d = details as unknown as BuildAdDetails;
    const outcome = await buildAd(String(d.briefId ?? ''), d.note);
    return NextResponse.json(outcome, { status: outcome.ok ? 200 : 422 });
  }

  return NextResponse.json({ ok: false, message: `Unknown action type: ${String(body.type)}` }, { status: 400 });
}
