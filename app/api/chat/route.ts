import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { JARVIS_SYSTEM_PROMPT } from '@/lib/jarvis-system-prompt';

export const runtime = 'edge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model selection:
// - Standard: claude-sonnet-4-20250514 (fast, everyday commands)
// - Deep:     claude-opus-4-5          (investment analysis, complex strategy, pattern analysis)
const MODELS = {
  standard: 'claude-sonnet-4-20250514',
  deep: 'claude-opus-4-5',
} as const;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      deep = false,
      maxTokens = 2048,
    }: {
      messages: ChatMessage[];
      deep?: boolean;
      maxTokens?: number;
    } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const model = deep ? MODELS.deep : MODELS.standard;

    // Build system prompt with current date/time context
    const now = new Date();
    const dateContext = now.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/London',
    });
    const timeContext = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    });

    const systemWithDate = `${JARVIS_SYSTEM_PROMPT}\n\n---\n\nCurrent date and time: ${dateContext}, ${timeContext} (Sheffield, England — Europe/London timezone).`;

    // Create streaming response
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemWithDate,
      messages,
    });

    // Stream the response as Server-Sent Events
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({
                type: 'text',
                text: chunk.delta.text,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            if (chunk.type === 'message_start') {
              const data = JSON.stringify({
                type: 'start',
                model: chunk.message.model,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            if (chunk.type === 'message_stop') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          }
        } catch (error) {
          const errData = JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Stream error',
          });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-JARVIS-Model': model,
      },
    });
  } catch (error) {
    console.error('JARVIS chat error:', error);
    return NextResponse.json(
      {
        error: 'JARVIS encountered an error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
