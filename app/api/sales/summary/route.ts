// app/api/sales/summary/route.ts
// Server-side Claude summary for Chunk 01 (Pipeline Overview).
// Generates a 4–5 sentence briefing using the Stayful lead-intelligence
// framework. Separate from /api/sales so it never blocks the dashboard's
// first paint.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  fetchAllLeads,
  buildPipeline,
  buildOutreach,
  buildOffers,
} from '@/lib/sales/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-6';

const SUMMARY_SYSTEM = `You are JARVIS, briefing Zac (founder of Stayful, Sheffield-based STR management) on his sales pipeline.

SALES FRAMEWORK: VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION.

REFERENCE THESE CONCEPTS WHERE THE DATA WARRANTS:
- "revenue floor" — counter to the income-consistency objection.
- "fast-path signals" — revenue questions early, clear timeline, no mortgage complications. Profiles 1–3.
- "slow-path signals" — repeating objections, no timeline, residential mortgage. Profiles 5–6.
- 50% cold-to-web-meeting target.
- 12–15% web-meeting-to-customer target.
- Post-meeting inaction pattern: high Warm count, low Customer count → urgency triggers not landing.

STYLE: calm, British, definitive. 4–5 sentences. Identify ONE primary bottleneck and ONE next action. Reference at most two numbers. No markdown. No bullets. No preamble. Talk to Zac directly.`;

// POST { metrics, question? } — voice-driven Q&A. The dashboard sends its
// already-loaded metrics so this endpoint doesn't re-paginate Monday. When
// `question` is present, Claude answers it using the metrics as context;
// otherwise it produces an opening briefing.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const metrics = body?.metrics;
    const question: string | undefined = body?.question;

    if (!metrics) {
      return NextResponse.json(
        { error: 'metrics object required in POST body' },
        { status: 400 },
      );
    }

    const isQuestion = typeof question === 'string' && question.trim().length > 0;

    const userPrompt = isQuestion
      ? `Zac asked aloud: "${question.trim()}"\n\nAnswer using these current sales metrics. Keep it to 2–3 spoken sentences. No bullets, no markdown — this will be read aloud.\n\nMetrics:\n${JSON.stringify(metrics, null, 2)}`
      : `Brief Zac on his current sales pipeline in 3–4 spoken sentences. Identify ONE bottleneck and ONE next action. No bullets, no markdown — this will be read aloud.\n\nMetrics:\n${JSON.stringify(metrics, null, 2)}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const summary = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    return NextResponse.json(
      { summary, model: MODEL, generatedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[Sales Summary POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const items = await fetchAllLeads({ from, to });
    const metrics = {
      total: items.length,
      pipeline: buildPipeline(items),
      outreach: buildOutreach(items),
      offers: buildOffers(items),
      dateRange: { from, to },
    };

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SUMMARY_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Brief me on the pipeline for ${from || 'all time'} to ${to || 'now'}. Metrics:\n\n${JSON.stringify(metrics, null, 2)}`,
        },
      ],
    });

    const summary = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    return NextResponse.json(
      {
        summary,
        model: MODEL,
        generatedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error) {
    console.error('[Sales Summary API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
