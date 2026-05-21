// /api/sales/summarise — on-demand AI briefing for any focused chunk.
//
// Pipeline already gets an inline AI card from /api/sales?chunk=summary.
// This endpoint serves the "summarise" voice command for the other chunks:
// it accepts the chunk's current metrics and returns 3-4 sentences of
// JARVIS-voice narration, designed to be spoken back via TTS.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const SYSTEM = `You are JARVIS speaking directly to Zac, founder of Stayful (UK short-term rental management). You are about to deliver a 3-4 sentence verbal briefing on one section of the sales dashboard. Tone: analytical, direct, British, no fluff. No opening pleasantries. No closing offers of help.

Use the lead-intelligence framework language: "revenue floor", "comparable properties", "fast-path signals", "slow-path signals", "post-meeting inaction", VALIDATE → REFRAME → QUANTIFY. Avoid generic business language.

Performance benchmarks to refer to when relevant:
- Cold to customer: 12-15% target
- Web meeting attendance: >50%
- Post-meeting close: >15%
- Fast-path: 1-2 touches; slow-path qualified out by touch 4-5

Return ONLY the briefing text. No JSON. No markdown. No headers.`;

export async function POST(req: NextRequest) {
  try {
    const { chunk, metrics } = (await req.json()) as {
      chunk: string;
      metrics: unknown;
    };

    if (!chunk || !metrics) {
      return NextResponse.json(
        { error: 'Body must include { chunk, metrics }' },
        { status: 400 }
      );
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { text: 'AI summary unavailable. ANTHROPIC_API_KEY is not configured.' },
        { status: 200 }
      );
    }

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 320,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Section: ${chunk}\n\nLive data:\n${JSON.stringify(metrics, null, 2)}\n\nDeliver the briefing now.`,
        },
      ],
    });

    const text = response.content
      .filter(c => c.type === 'text')
      .map(c => (c as { type: 'text'; text: string }).text)
      .join('')
      .trim();

    return NextResponse.json({
      text,
      chunk,
      generatedAt: new Date().toISOString(),
      model: 'claude-sonnet-4-6',
    });
  } catch (err) {
    console.error('[api/sales/summarise]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Summarise failed' },
      { status: 500 }
    );
  }
}
