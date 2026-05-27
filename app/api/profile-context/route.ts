// app/api/profile-context/route.ts
// Returns the psychology profile text for a given emotional_profile value.
// Called by n8n before triggering an outbound Retell call, so the matching
// profile can be injected into Lucy's prompt as {{psychology_profile_context}}.
//
// POST body: { "emotional_profile": "ANALYTICAL-EVALUATOR" }
// Response:  { "psychology_profile_context": "ANALYTICAL-EVALUATOR\n..." }
// An empty or unrecognised profile returns the DEFAULT (ANALYTICAL-EVALUATOR).

import { NextRequest, NextResponse } from 'next/server';
import { getProfileContext } from '@/lib/profile-injector';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { emotional_profile?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const psychology_profile_context = getProfileContext(body.emotional_profile);

  return NextResponse.json({ psychology_profile_context });
}
