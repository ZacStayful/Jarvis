// app/api/chat/route.ts
// ─── JARVIS Chat API Route ────────────────────────────────────────────────────
//
// Handles all JARVIS conversations with streaming SSE output.
// Integrates MCP servers for live data access.
// Supports two modes:
//   - Standard (claude-sonnet-4-20250514) — fast, for most operations
//   - Deep (claude-opus-4-6) — slower, for investment analysis + complex decisions
//
// SSE output format (consumed by useJARVIS hook):
//   data: { type: 'start', model: '...' }
//   data: { type: 'text', text: '...' }
//   data: { type: 'error', message: '...' }
//   data: [DONE]
//
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { buildMcpServers } from '@/lib/mcp-servers';
import { buildSystemPrompt } from '@/lib/jarvis-system-prompt';
import { detectCommand, ROUTE_RESPONSES } from '@/lib/commandRouter';
import type { ApiMessage } from '@/types/jarvis';

export const runtime = 'edge';
export const maxDuration = 120; // seconds — allow time for MCP tool calls

const SONNET_MODEL = 'claude-sonnet-4-20250514';
const OPUS_MODEL = 'claude-opus-4-6';

// ─── SSE Helpers ──────────────────────────────────────────────────────────────

function encodeSSE(payload: unknown): Uint8Array {
  const text =
    payload === '[DONE]'
      ? 'data: [DONE]\n\n'
      : `data: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(text);
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Parse request ──────────────────────────────────────────────────────────
  let messages: ApiMessage[];
  let deep: boolean;
  let maxTokens: number;

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    deep = body.deep ?? false;
    maxTokens = body.maxTokens ?? (deep ? 4096 : 2048);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!messages.length) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Check API key ──────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── Build MCP config ───────────────────────────────────────────────────────
  const { servers: mcpServers, missing: missingIntegrations } = buildMcpServers();

  // ── Build system prompt ────────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(missingIntegrations);

  // ── Phase 5: detect navigation commands on the last user message ──────────
  const lastUserMessage = messages.filter(m => m.role === 'user').at(-1);
  const commandResult = lastUserMessage
    ? detectCommand(lastUserMessage.content)
    : { view: null, params: undefined, isDeep: false };

  const useDeep = deep || commandResult.isDeep;
  const model = useDeep ? OPUS_MODEL : SONNET_MODEL;

  // ── Build streaming response ───────────────────────────────────────────────
  const responseStream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(encodeSSE(payload));
        } catch {
          // Controller already closed
        }
      };

      // Emit route event first so the UI can switch views immediately
      if (commandResult.view) {
        send({
          type: 'route',
          view: commandResult.view,
          params: commandResult.params,
        });
      }

      // Simple nav commands (everything except investment-dashboard) get a
      // canned JARVIS verbal response streamed word-by-word, then end.
      const isSimpleNavCommand =
        commandResult.view !== null &&
        commandResult.view !== 'investment-dashboard';

      if (isSimpleNavCommand && commandResult.view) {
        send({ type: 'start', model });
        const verbalResponse =
          ROUTE_RESPONSES[commandResult.view] ?? 'Navigating now, sir.';
        const words = verbalResponse.split(' ');
        for (const word of words) {
          send({ type: 'text', text: word + ' ' });
          await new Promise(r => setTimeout(r, 30));
        }
        send('[DONE]');
        controller.close();
        return;
      }

      try {
        // ── Call Anthropic API with MCP + streaming ────────────────────────
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'mcp-client-2025-04-04',
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages,
            stream: true,
            ...(mcpServers.length > 0 && { mcp_servers: mcpServers }),
          }),
        });

        if (!anthropicRes.ok) {
          const errorText = await anthropicRes.text();
          let errorMessage = `Anthropic API error ${anthropicRes.status}`;
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message ?? errorMessage;
          } catch {
            // Use raw text if not JSON
            errorMessage = errorText || errorMessage;
          }
          send({ type: 'error', message: errorMessage });
          controller.close();
          return;
        }

        // ── Process SSE stream ─────────────────────────────────────────────
        const reader = anthropicRes.body?.getReader();
        if (!reader) {
          send({ type: 'error', message: 'No response stream from Anthropic' });
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let modelUsed = model;
        let startSent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw);
            } catch {
              continue; // Skip malformed SSE lines
            }

            const eventType = event.type as string;

            // ── message_start: extract model name ──────────────────────────
            if (eventType === 'message_start') {
              const msg = event.message as Record<string, unknown> | undefined;
              if (msg?.model) {
                modelUsed = msg.model as string;
              }
              if (!startSent) {
                send({ type: 'start', model: modelUsed });
                startSent = true;
              }
            }

            // ── content_block_start: send start event if not yet sent ──────
            if (eventType === 'content_block_start' && !startSent) {
              send({ type: 'start', model: modelUsed });
              startSent = true;
            }

            // ── content_block_delta: forward text deltas ───────────────────
            if (eventType === 'content_block_delta') {
              const delta = event.delta as Record<string, unknown> | undefined;
              if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
                send({ type: 'text', text: delta.text });
              }
              // input_json_delta = MCP tool input streaming — handled server-side, ignore
            }

            // ── message_stop ───────────────────────────────────────────────
            if (eventType === 'message_stop') {
              send('[DONE]');
              controller.close();
              return;
            }

            // ── error event from Anthropic stream ──────────────────────────
            if (eventType === 'error') {
              const errDetails = event.error as Record<string, unknown> | undefined;
              send({
                type: 'error',
                message: (errDetails?.message as string) ?? 'Stream error',
              });
              controller.close();
              return;
            }
          }
        }

        // Flush any remaining buffer
        if (buffer.startsWith('data: ')) {
          const raw = buffer.slice(6).trim();
          if (raw && raw !== '[DONE]') {
            try {
              const event = JSON.parse(raw) as Record<string, unknown>;
              if (
                event.type === 'content_block_delta' &&
                (event.delta as Record<string, unknown>)?.type === 'text_delta'
              ) {
                send({
                  type: 'text',
                  text: (event.delta as Record<string, unknown>).text,
                });
              }
            } catch {
              // Skip malformed
            }
          }
        }

        send('[DONE]');
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        send({ type: 'error', message });
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering on Vercel
    },
  });
}
