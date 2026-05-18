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
import { detectCommand } from '@/lib/commandRouter';
import { detectLucyCommand, LUCY_SYSTEM_CONTEXT } from '@/lib/lucy-commands';
import {
  detectPortfolioCommand,
  PORTFOLIO_SYSTEM_CONTEXT,
} from '@/lib/portfolio/commands';
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
  let crossSessionContext: string | undefined;

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    deep = body.deep ?? false;
    maxTokens = body.maxTokens ?? (deep ? 4096 : 2048);
    crossSessionContext =
      typeof body.crossSessionContext === 'string' && body.crossSessionContext.trim()
        ? body.crossSessionContext
        : undefined;
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

  // ── Phase 5: detect navigation commands on the last user message ──────────
  const lastUserMessage = messages.filter(m => m.role === 'user').at(-1);
  const commandResult = lastUserMessage
    ? detectCommand(lastUserMessage.content)
    : { view: null, params: undefined, isDeep: false };

  // ── Phase 7: detect Lucy intent and append the Lucy system context ────────
  const lucyCommand = lastUserMessage
    ? detectLucyCommand(lastUserMessage.content)
    : null;

  // ── Phase 8 portfolio dashboard: detect intent, append portfolio context ──
  const portfolioCommand = lastUserMessage
    ? detectPortfolioCommand(lastUserMessage.content)
    : null;

  // ── ACTIVE VIEW directive: any time a command opens a view, tell Claude
  //    explicitly what view is being shown and how to respond. Replaces the
  //    old canned ROUTE_RESPONSES short-circuit so Claude actually thinks
  //    about what to say instead of repeating a stock phrase.
  const activeViewName =
    commandResult.view ??
    (portfolioCommand ? 'portfolio-dashboard' : null) ??
    (lucyCommand ? 'lucy-intelligence-centre' : null);

  const activeViewDirective = activeViewName
    ? `=== ACTIVE VIEW DIRECTIVE ===

Zac has just issued a command that opened the "${activeViewName}" view in the
JARVIS UI. He is now looking at that panel.

When you reply:
1. Acknowledge the view change in one sentence — but never reply with only
   "Opening X now, sir" or similar. Pair the acknowledgement with substance.
2. Summarise the content of the view (infer from context, working memory, or
   the system-context blocks above) — focus on key points and what they mean,
   not a verbatim readout.
3. Offer either the single most useful next action / advisory point, OR ask
   one specific clarifying question that would meaningfully sharpen the next
   step.
4. If the data isn't available to you (e.g. placeholder values, integration
   not connected), say so plainly and ask Zac what he wants to populate or
   check first.

Voice cadence: short sentences. This response will be spoken aloud.
=== END ACTIVE VIEW DIRECTIVE ===`
    : null;

  // ── Build system prompt (Phase 8: prepend cross-session context if present) ─
  const systemPrompt = [
    buildSystemPrompt(missingIntegrations),
    lucyCommand ? LUCY_SYSTEM_CONTEXT : null,
    portfolioCommand ? PORTFOLIO_SYSTEM_CONTEXT : null,
    activeViewDirective,
    crossSessionContext ?? null,
  ]
    .filter(Boolean)
    .join('\n\n');

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

      // Emit route event first so the UI can switch views immediately.
      // The view command is still detected, but the canned ROUTE_RESPONSES
      // short-circuit is gone — every turn now goes through Claude with the
      // ACTIVE VIEW DIRECTIVE injected into the system prompt above.
      if (commandResult.view) {
        send({
          type: 'route',
          view: commandResult.view,
          params: commandResult.params,
        });
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
