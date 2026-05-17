// ─────────────────────────────────────────────────────────────────────────────
// POST /api/investment
// Runs Claude Opus with web search to produce investment advisory analysis.
// Streams back as SSE — same pattern as /api/chat.
//
// Body: { query: string, context?: string }
//
// SSE event types emitted:
//   { type: 'start', message: string }
//   { type: 'text', text: string }       — streaming text delta
//   { type: 'complete' }
//   { type: 'error', message: string }
//   data: [DONE]
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { INVESTMENT_SYSTEM_PROMPT } from '@/lib/intelligencePrompts';

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, context } = body as { query?: string; context?: string };

    if (!query?.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // Client disconnected
          }
        };

        try {
          send({ type: 'start', message: 'Accessing market intelligence, sir.' });

          const userMessage = context?.trim()
            ? `${query.trim()}\n\nAdditional context from Zac: ${context.trim()}`
            : query.trim();

          // Opus with web search for current market data
          const stream = await anthropic.messages.create({
            model: 'claude-opus-4-5',
            max_tokens: 4096,
            system: INVESTMENT_SYSTEM_PROMPT,
            tools: [
              {
                type: 'web_search_20250305' as 'web_search_20250305',
                name: 'web_search',
              },
            ],
            messages: [{ role: 'user', content: userMessage }],
            stream: true,
          });

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              send({ type: 'text', text: event.delta.text });
            }
          }

          send({ type: 'complete' });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          send({
            type: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Investment advisory error — unknown failure',
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
