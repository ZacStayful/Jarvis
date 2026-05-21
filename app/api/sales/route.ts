// /api/sales — Sales Intelligence data endpoint.
//
// Server-only. Reads from Monday.com using MONDAY_API_TOKEN (or the legacy
// MONDAY_API_KEY). Returns chunked JSON so the dashboard can load each
// section independently without waiting on the others.
//
// Auth: enforced by /middleware.ts (jarvis_auth cookie). No extra check needed.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

import {
  loadActivityLogs,
  loadBoardSnapshot,
  parseRange,
} from '@/lib/sales/monday';
import {
  buildDiagnostics,
  computeOffers,
  computeOutreach,
  computePipeline,
  computeWebMeetings,
} from '@/lib/sales/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5 min route-segment hint (data layer caches too)

type Chunk = 'pipeline' | 'outreach' | 'meetings' | 'offers' | 'summary' | 'all';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const chunk = (url.searchParams.get('chunk') ?? 'all') as Chunk;
    const { from, to } = parseRange(
      url.searchParams.get('from'),
      url.searchParams.get('to')
    );

    const snapshot = await loadBoardSnapshot();
    const activity = await loadActivityLogs(from.toISOString(), to.toISOString());

    // Pipeline is needed by both chunk=pipeline and chunk=meetings / summary.
    const pipeline = computePipeline(snapshot.items, from, to, activity);
    const diagnostics = buildDiagnostics(snapshot.items, activity, snapshot.fetchedAt);

    const base = {
      range: { from: from.toISOString(), to: to.toISOString() },
      diagnostics,
      activityLogsAvailable: activity.available,
    };

    if (chunk === 'pipeline') {
      return NextResponse.json({ ...base, pipeline });
    }
    if (chunk === 'outreach') {
      return NextResponse.json({ ...base, outreach: computeOutreach(snapshot.items, from, to) });
    }
    if (chunk === 'meetings') {
      return NextResponse.json({ ...base, meetings: computeWebMeetings(snapshot.items, pipeline) });
    }
    if (chunk === 'offers') {
      return NextResponse.json({ ...base, offers: computeOffers(snapshot.items) });
    }
    if (chunk === 'summary') {
      const summary = await generateAiSummary(pipeline, snapshot.itemCount, from, to);
      return NextResponse.json({ ...base, summary });
    }

    // chunk=all — used by the AI summary generator and ad-hoc clients
    return NextResponse.json({
      ...base,
      pipeline,
      outreach: computeOutreach(snapshot.items, from, to),
      meetings: computeWebMeetings(snapshot.items, pipeline),
      offers: computeOffers(snapshot.items),
    });
  } catch (err) {
    console.error('[api/sales]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sales fetch failed' },
      { status: 500 }
    );
  }
}

// ─── AI summary ───────────────────────────────────────────────────────────────
// 4-5 sentences, JARVIS voice, references the lead-intelligence framework.
// Lives inside this route per spec; chunks fetch it via ?chunk=summary so the
// slow Claude call never blocks pipeline metrics from rendering.

const SUMMARY_SYSTEM = `You are JARVIS speaking directly to Zac, founder of Stayful (UK short-term rental management).

You are about to deliver a 4-5 sentence intelligence briefing on his sales pipeline. Tone: analytical, direct, British, no fluff. No opening pleasantries. No closing offers of help. You are dropping the briefing and leaving.

You MUST use the language of the lead intelligence framework, never generic business language:
- "revenue floor" (not "income projection")
- "comparable properties" (not "case studies")
- "fast-path signals" — leads converting in 1-2 touches (revenue questions early, clear timeline, no mortgage complications, profile 1-3)
- "slow-path signals" — leads cycling without converting (objections repeat, no timeline, residential mortgage, profiles 5-6)
- "post-meeting inaction" when warm leads sit unconverted
- VALIDATE → REFRAME → QUANTIFY framework when responses are mentioned

PERFORMANCE TARGETS to benchmark against:
- Cold to customer: 12-15% target
- Web meeting attendance: >50%
- Post-meeting close: >15%
- Fast-path: 1-2 touches; slow-path qualified out by touch 4-5

In the briefing:
1. Name the biggest drop-off point in the data.
2. Reference fast-path vs slow-path where the numbers warrant it.
3. Flag post-meeting inaction explicitly if warm/offer count is high relative to customer count.
4. Compare cold-to-customer rate against the 12-15% target.
5. Acknowledge re-engagement wins if present.

Return ONLY the briefing text. No JSON, no markdown, no headers.`;

async function generateAiSummary(
  pipeline: Awaited<ReturnType<typeof computePipeline>>,
  itemCount: number,
  from: Date,
  to: Date
): Promise<{ text: string; generatedAt: string; model: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      text: 'AI summary unavailable: ANTHROPIC_API_KEY not configured.',
      generatedAt: new Date().toISOString(),
      model: 'none',
    };
  }

  const anthropic = new Anthropic();
  const model = 'claude-sonnet-4-6';

  const userBlock = `Pipeline snapshot for ${from.toLocaleDateString('en-GB')} → ${to.toLocaleDateString('en-GB')} (board has ${itemCount} leads total):

Cold leads in range:          ${pipeline.coldLeads}
Abandoned:                    ${pipeline.abandoned}
Future (too early):           ${pipeline.future}
Web meeting booked:           ${pipeline.webMeetingBooked}
Web meeting no show:          ${pipeline.webMeetingNoShow}
Warm:                         ${pipeline.warm}
Special offer applied:        ${pipeline.specialOfferApplied}
Customers:                    ${pipeline.customers}

Qualification drop-off:       ${pipeline.qualificationDropoffPct}%
Future-rate:                  ${pipeline.futureRatePct}%
Web meeting attendance:       ${pipeline.attendanceRatePct}% (target: >50%)
No-show rate:                 ${pipeline.noShowRatePct}%
Re-engagement rate:           ${pipeline.reEngagementRatePct}% (${pipeline.reEngagementCount} no-shows returned, source: ${pipeline.reEngagementSource})
Post-meeting close:           ${pipeline.postMeetingConversionPct}% (target: >15%)
Overall cold → customer:      ${pipeline.overallConversionPct}% (target: 12-15%)

Deliver the briefing now.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 400,
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userBlock }],
  });

  const text = response.content
    .filter(c => c.type === 'text')
    .map(c => (c as { type: 'text'; text: string }).text)
    .join('')
    .trim();

  return { text, generatedAt: new Date().toISOString(), model };
}
