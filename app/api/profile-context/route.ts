// app/api/profile-context/route.ts
// Profile lookup for Lucy's outbound calls. n8n calls this before triggering a
// Retell call, passing the lead's emotional_profile, and injects the returned
// text into Retell's retell_llm_dynamic_variables as psychology_profile_context.
//
// POST body:  { "emotional_profile": "ANALYTICAL-EVALUATOR" }
// Response:   { "psychology_profile_context": "ANALYTICAL-EVALUATOR\n..." }
//
// Empty / unknown profiles return the DEFAULT (ANALYTICAL-EVALUATOR) text so the
// caller always gets a usable value.

import { NextRequest, NextResponse } from 'next/server';
import { getProfileContext } from '@/lib/profile-injector';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { emotional_profile?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Invalid / empty body → fall through to DEFAULT via getProfileContext.
  }

  const psychology_profile_context = getProfileContext(body.emotional_profile);
  return NextResponse.json({ psychology_profile_context });
}

// Probe so curl / n8n's "test URL" button gets a sane response on GET.
export function GET() {
  return NextResponse.json({ ok: true, service: 'profile-context' });
}
