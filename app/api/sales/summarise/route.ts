// app/api/sales/summarise/route.ts
// Per-chunk voice briefing triggered by "summarise" while a chunk is
// focused. Returns 2–3 sentences optimised for TTS (no markdown, no
// bullets, conversational tone).

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

type Chunk = 'pipeline' | 'outreach' | 'meetings' | 'offers';
const CHUNK_KEYS: Chunk[] = ['pipeline', 'outreach', 'meetings', 'offers'];

const CHUNK_FOCUS: Record<Chunk, string> = {
  pipeline:
    'overall sales pipeline — cold leads, abandoned, web meetings, customers, conversion rate. Identify the biggest drop-off.',
  outreach:
    'outreach channels — Lucy calls, pre-qualification emails, and WhatsApp activity. Note channel mix and best-performing channel.',
  meetings:
    'web meeting performance — attendance rate, no-show rate, and post-meeting conversion. Flag whether urgency triggers are landing.',
  offers:
    'special offers — active count, expiring this week, and close rate. Highlight any urgent expiries.',
};

function buildSystemPrompt(chunk: Chunk): string {
  return `You are JARVIS briefing Zac (founder of Stayful, Sheffield STR management) on the ${chunk} section of his sales pipeline.

FOCUS: ${CHUNK_FOCUS[chunk]}

FRAMEWORK: VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION.
Reference where the data warrants: "revenue floor", "fast-path signals", "slow-path signals", 12–15% web-meeting-to-customer target, 50% cold-to-web-meeting target.

STYLE for VOICE:
- 2–3 sentences.
- Calm, British, definitive.
- One bottleneck or one next action — not both.
- Plain prose. No markdown. No bullets. No lists.
- Spell out numbers ten and below. Round percentages to whole numbers.
- Do not start with "Here's" or "So". Open with the headline.`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const chunkParam = searchParams.get('chunk');
    const chunk: Chunk = CHUNK_KEYS.includes(chunkParam as Chunk)
      ? (chunkParam as Chunk)
      : 'pipeline';

    const items = await fetchAllLeads({ from, to });

    let payload: any = { total: items.length, dateRange: { from, to } };
    if (chunk === 'pipeline' || chunk === 'meetings') {
      payload.pipeline = buildPipeline(items);
    }
    if (chunk === 'outreach') {
      payload.outreach = buildOutreach(items);
    }
    if (chunk === 'offers') {
      payload.offers = buildOffers(items);
    }

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 250,
      system: buildSystemPrompt(chunk),
      messages: [
        {
          role: 'user',
          content: `Briefing data:\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });

    const text = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    return NextResponse.json(
      { text, chunk, model: MODEL },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (error) {
    console.error('[Sales Summarise API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
