// app/api/chat/route.ts
// ─── Chat API Route ───────────────────────────────────────────────────────────
//
// Streams a reply from whichever member of staff Zac is talking to, with
// MCP servers for live data. Two models:
//   - Standard (claude-sonnet-4-6) — fast, for most turns
//   - Deep (claude-opus-4-7) — slower, for investment analysis + complex decisions
//
// Hand-offs: a reply may end with <handoff to="janet">brief</handoff>
// (or to="jarvis"). The tag is held back from the stream, and the other
// person is brought in for one more streamed turn with the brief as a
// system note. The client sees both replies, each tagged with its speaker.
//
// SSE output (consumed by hooks/useJARVIS.ts):
//   data: { type: 'speaker', persona: 'jarvis' | 'janet' }
//   data: { type: 'start',   model: '...' }
//   data: { type: 'text',    text: '...' }
//   data: { type: 'error',   message: '...' }
//   data: [DONE]
//
// All view routing is decided on the client; the body tells us which view is
// open (`activeView`) so the prompt can reflect it.
//
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { buildMcpServers, type MCPServer } from '@/lib/mcp-servers';
import { buildSystemPrompt } from '@/lib/jarvis-system-prompt';
import { detectLucyCommand, LUCY_SYSTEM_CONTEXT } from '@/lib/lucy-commands';
import {
  detectPortfolioCommand,
  PORTFOLIO_SYSTEM_CONTEXT,
} from '@/lib/portfolio/commands';
import { getPersona, isPersonaId, DEFAULT_PERSONA } from '@/lib/personas';
import type { ApiMessage, InputMode, PersonaId } from '@/types/jarvis';

export const runtime = 'edge';
export const maxDuration = 120; // seconds — allow time for MCP tool calls + a hand-off

const SONNET_MODEL = 'claude-sonnet-4-6';
const OPUS_MODEL = 'claude-opus-4-7';

const HANDOFF_RE = /<handoff\s+to\s*=\s*"(jarvis|janet)"\s*>([\s\S]*?)<\/handoff>/i;
// Terminal blocks that are held back from the live stream and dealt with at
// the end of the turn.
const HELD_TAGS = ['<handoff', '<action_request'];
const MAX_VIEW_CONTEXT = 4000;

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function encodeSSE(payload: unknown): Uint8Array {
  const text =
    payload === '[DONE]'
      ? 'data: [DONE]\n\n'
      : `data: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(text);
}

// ─── Text gate: forward deltas, hold terminal tags ────────────────────────────
//
// Text is forwarded as it arrives except for a `<handoff …>` or
// `<action_request>` block, which is held until the turn ends. A lone "<"
// in ordinary prose is forwarded once we can see it isn't a tag.

class TextGate {
  private pending = '';
  private held = '';
  public emitted = '';

  constructor(private readonly emit: (text: string) => void) {}

  push(delta: string): void {
    if (this.held) {
      this.held += delta;
      return;
    }
    this.pending += delta;
    this.flush();
  }

  private out(text: string): void {
    if (!text) return;
    this.emitted += text;
    this.emit(text);
  }

  private flush(): void {
    const longest = Math.max(...HELD_TAGS.map(t => t.length));
    while (this.pending) {
      const idx = this.pending.indexOf('<');
      if (idx < 0) {
        this.out(this.pending);
        this.pending = '';
        return;
      }
      if (idx > 0) {
        this.out(this.pending.slice(0, idx));
        this.pending = this.pending.slice(idx);
      }
      const head = this.pending.slice(0, longest);
      const couldBeTag = HELD_TAGS.some(t => t.startsWith(head) || head.startsWith(t));
      if (couldBeTag) {
        if (this.pending.length < longest && !HELD_TAGS.some(t => this.pending.startsWith(t))) {
          return; // wait for more characters before deciding
        }
        if (HELD_TAGS.some(t => this.pending.startsWith(t))) {
          this.held = this.pending;
          this.pending = '';
          return;
        }
      }
      this.out('<');
      this.pending = this.pending.slice(1);
    }
  }

  /** Flush at end of turn. Returns the full visible text and any hand-off. */
  finish(): { text: string; handoff: { to: PersonaId; brief: string } | null } {
    if (this.pending) {
      this.out(this.pending);
      this.pending = '';
    }
    let held = this.held;
    this.held = '';
    let handoff: { to: PersonaId; brief: string } | null = null;

    const m = held.match(HANDOFF_RE);
    if (m && isPersonaId(m[1].toLowerCase())) {
      handoff = { to: m[1].toLowerCase() as PersonaId, brief: m[2].trim() };
      held = held.replace(m[0], '');
    }
    // A hand-off tag cut off by max_tokens: drop the fragment rather than show it.
    held = held.replace(/<handoff[\s\S]*$/i, '');

    if (held.trim()) this.out(held);
    return { text: this.emitted, handoff };
  }
}

// ─── One streamed turn with the Messages API ──────────────────────────────────

interface TurnParams {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: ApiMessage[];
  mcpServers: MCPServer[];
  send: (payload: unknown) => void;
}

interface TurnResult {
  text: string;
  handoff: { to: PersonaId; brief: string } | null;
  error?: string;
}

async function streamTurn(p: TurnParams): Promise<TurnResult> {
  const gate = new TextGate(text => p.send({ type: 'text', text }));

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': p.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'mcp-client-2025-04-04',
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: p.maxTokens,
      system: p.system,
      messages: p.messages,
      stream: true,
      ...(p.mcpServers.length > 0 && { mcp_servers: p.mcpServers }),
    }),
  });

  if (!anthropicRes.ok) {
    const errorText = await anthropicRes.text();
    let errorMessage = `Anthropic API error ${anthropicRes.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message ?? errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    return { text: '', handoff: null, error: errorMessage };
  }

  const reader = anthropicRes.body?.getReader();
  if (!reader) return { text: '', handoff: null, error: 'No response stream from Anthropic' };

  const decoder = new TextDecoder();
  let buffer = '';
  let startSent = false;
  let modelUsed = p.model;

  const handleEvent = (event: Record<string, unknown>): 'continue' | 'stop' | string => {
    const eventType = event.type as string;

    if (eventType === 'message_start') {
      const msg = event.message as Record<string, unknown> | undefined;
      if (msg?.model) modelUsed = msg.model as string;
      if (!startSent) {
        p.send({ type: 'start', model: modelUsed });
        startSent = true;
      }
    }

    if (eventType === 'content_block_start' && !startSent) {
      p.send({ type: 'start', model: modelUsed });
      startSent = true;
    }

    if (eventType === 'content_block_delta') {
      const delta = event.delta as Record<string, unknown> | undefined;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
        gate.push(delta.text);
      }
      // input_json_delta = MCP tool input streaming — handled server-side, ignore
    }

    if (eventType === 'message_stop') return 'stop';

    if (eventType === 'error') {
      const errDetails = event.error as Record<string, unknown> | undefined;
      return (errDetails?.message as string) ?? 'Stream error';
    }

    return 'continue';
  };

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

      const outcome = handleEvent(event);
      if (outcome === 'stop') {
        const { text, handoff } = gate.finish();
        return { text, handoff };
      }
      if (outcome !== 'continue') {
        gate.finish();
        return { text: gate.emitted, handoff: null, error: outcome };
      }
    }
  }

  // Flush any remaining buffered event (stream ended without message_stop)
  if (buffer.startsWith('data: ')) {
    const raw = buffer.slice(6).trim();
    if (raw && raw !== '[DONE]') {
      try {
        handleEvent(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        // Skip malformed
      }
    }
  }

  const { text, handoff } = gate.finish();
  return { text, handoff };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Parse request ──────────────────────────────────────────────────────────
  let messages: ApiMessage[];
  let deep: boolean;
  let maxTokens: number;
  let crossSessionContext: string | undefined;
  let persona: PersonaId;
  let inputMode: InputMode;
  let activeView: string | undefined;
  let viewJustOpened: boolean;
  let viewContext: string | undefined;

  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    deep = body.deep === true;
    maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : deep ? 4096 : 2048;
    crossSessionContext =
      typeof body.crossSessionContext === 'string' && body.crossSessionContext.trim()
        ? body.crossSessionContext
        : undefined;
    persona = isPersonaId(body.persona) ? body.persona : DEFAULT_PERSONA;
    inputMode = body.inputMode === 'voice' ? 'voice' : 'text';
    activeView =
      typeof body.activeView === 'string' && body.activeView.trim()
        ? body.activeView.trim()
        : undefined;
    viewJustOpened = body.viewJustOpened === true;
    viewContext =
      typeof body.viewContext === 'string' && body.viewContext.trim()
        ? body.viewContext.slice(0, MAX_VIEW_CONTEXT)
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

  // ── Context detection on the last user message ─────────────────────────────
  // Approval / denial payloads are JSON for an action already agreed; never
  // run intent detection on them (a "lucy" inside the payload used to inject
  // the Lucy context into the execution turn).
  const lastUserMessage = messages.filter(m => m.role === 'user').at(-1);
  const isApprovalTurn =
    !!lastUserMessage && /^JARVIS_(APPROVAL|DENY):/.test(lastUserMessage.content.trim());

  const lucyCommand =
    lastUserMessage && !isApprovalTurn ? detectLucyCommand(lastUserMessage.content) : null;
  const portfolioCommand =
    lastUserMessage && !isApprovalTurn ? detectPortfolioCommand(lastUserMessage.content) : null;

  const extraContext = [
    lucyCommand ? LUCY_SYSTEM_CONTEXT : null,
    portfolioCommand ? PORTFOLIO_SYSTEM_CONTEXT : null,
    crossSessionContext ?? null,
  ];

  const systemFor = (who: PersonaId, handoffNote?: string) =>
    buildSystemPrompt({
      persona: who,
      missingIntegrations,
      now: new Date(),
      inputMode,
      activeView,
      viewJustOpened,
      viewContext,
      extraContext,
      handoffNote,
    });

  const model = deep ? OPUS_MODEL : SONNET_MODEL;

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
      const close = () => {
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      try {
        send({ type: 'speaker', persona });

        const first = await streamTurn({
          apiKey,
          model,
          maxTokens,
          system: systemFor(persona),
          messages,
          mcpServers,
          send,
        });

        if (first.error) {
          send({ type: 'error', message: first.error });
          close();
          return;
        }

        // ── Hand-off hop: bring the other person in for one more turn ──────
        const handoff = first.handoff;
        if (handoff && handoff.to !== persona && !isApprovalTurn) {
          const from = getPersona(persona);
          const to = getPersona(handoff.to);
          send({ type: 'speaker', persona: to.id });

          const hopMessages: ApiMessage[] = [...messages];
          if (first.text.trim()) {
            hopMessages.push({ role: 'assistant', content: first.text.trim() });
          }
          hopMessages.push({
            role: 'user',
            content: `[${from.name} hands this to ${to.name}: ${handoff.brief || 'over to you'}] Zac is waiting for ${to.name}.`,
          });

          const second = await streamTurn({
            apiKey,
            model,
            maxTokens,
            system: systemFor(to.id, handoff.brief || 'over to you'),
            messages: hopMessages,
            mcpServers,
            send,
          });

          if (second.error) {
            send({ type: 'error', message: second.error });
            close();
            return;
          }
        }

        send('[DONE]');
        close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        send({ type: 'error', message });
        close();
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
