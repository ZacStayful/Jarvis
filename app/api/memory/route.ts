/**
 * JARVIS — Memory API Route
 * POST /api/memory
 *
 * Handles all Vercel KV memory operations for session and cross-session context.
 * Called by the JARVIS frontend and optionally by the chat route at session end.
 *
 * Actions:
 *   load_session        → load messages + context for a session
 *   save_session        → persist messages + context
 *   load_cross_session  → load persistent cross-session state
 *   save_cross_session  → persist cross-session state
 *   patch_cross_session → merge partial update into cross-session state
 *   summarise_session   → use Claude to compress session into cross-session learnings
 *   load_working_memory → retrieve working memory entries
 *   append_working_memory → add new entries to working memory
 *   add_pending_action  → queue an action item
 *   resolve_action      → mark action as done
 *   save_pipeline       → store lead pipeline snapshot
 *   load_pipeline       → retrieve last pipeline snapshot
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  saveSessionMessages,
  loadSessionMessages,
  saveSessionContext,
  loadSessionContext,
  loadCrossSessionContext,
  saveCrossSessionContext,
  patchCrossSessionContext,
  loadWorkingMemory,
  appendWorkingMemory,
  addPendingAction,
  resolvePendingAction,
  saveLeadPipelineSnapshot,
  loadLeadPipelineSnapshot,
  buildEmptyCrossSession,
  buildEmptySessionContext,
  type StoredMessage,
  type WorkingMemoryEntry,
  type OpenActionItem,
  type LeadPipelineSnapshot,
} from '@/lib/kv-memory';

const anthropic = new Anthropic();

// ─── Auth guard ──────────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const token = req.headers.get('x-jarvis-token');
  return token === process.env.JARVIS_INTERNAL_TOKEN;
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body as { action: string };

  try {
    switch (action) {
      // ── Session ──────────────────────────────────────────────────────────

      case 'load_session': {
        const { sessionId } = body as { sessionId: string };
        const [messages, context] = await Promise.all([
          loadSessionMessages(sessionId),
          loadSessionContext(sessionId),
        ]);
        return NextResponse.json({
          messages,
          context: context ?? buildEmptySessionContext(sessionId),
        });
      }

      case 'save_session': {
        const { sessionId, messages, context } = body as {
          sessionId: string;
          messages: StoredMessage[];
          context: Record<string, unknown>;
        };
        await Promise.all([
          saveSessionMessages(sessionId, messages),
          saveSessionContext(sessionId, {
            ...buildEmptySessionContext(sessionId),
            ...(context as object),
          }),
        ]);
        return NextResponse.json({ ok: true });
      }

      // ── Cross-session ─────────────────────────────────────────────────────

      case 'load_cross_session': {
        const ctx = (await loadCrossSessionContext()) ?? buildEmptyCrossSession();
        const workingMemory = await loadWorkingMemory();
        const pipeline = await loadLeadPipelineSnapshot();
        return NextResponse.json({ context: ctx, workingMemory, pipeline });
      }

      case 'save_cross_session': {
        const { context } = body as { context: Record<string, unknown> };
        await saveCrossSessionContext(
          context as unknown as Parameters<typeof saveCrossSessionContext>[0]
        );
        return NextResponse.json({ ok: true });
      }

      case 'patch_cross_session': {
        const { patch } = body as { patch: Record<string, unknown> };
        const updated = await patchCrossSessionContext(
          patch as Parameters<typeof patchCrossSessionContext>[0]
        );
        return NextResponse.json({ context: updated });
      }

      // ── Session summarisation (end-of-session intelligence extraction) ────

      case 'summarise_session': {
        const { sessionId, messages: rawMessages } = body as {
          sessionId: string;
          messages: StoredMessage[];
        };

        if (!rawMessages?.length) {
          return NextResponse.json({ ok: true, summary: null });
        }

        const transcript = rawMessages
          .map(m => `${m.role === 'user' ? 'ZAC' : 'JARVIS'}: ${m.content}`)
          .join('\n\n');

        const extractionPrompt = `You are JARVIS's intelligence extraction engine. Given a conversation transcript between Zac (founder of Stayful, a short-term rental property management company) and JARVIS (his AI command centre), extract structured learnings.

TRANSCRIPT:
${transcript}

Extract the following as JSON (no markdown, no preamble — raw JSON only):
{
  "sessionSummary": "2-3 sentence summary of what this session covered",
  "keyFacts": ["fact1", "fact2"],
  "investmentNotes": ["note1"],
  "leadInsights": ["insight1"],
  "businessInsights": ["insight1"],
  "patternsDetected": ["pattern1"],
  "openActionItems": [
    {
      "id": "unique-id",
      "description": "action description",
      "category": "monday|email|call|workflow|obsidian|other",
      "createdAt": "ISO date",
      "context": "brief context",
      "status": "pending"
    }
  ],
  "workingMemoryEntries": [
    {
      "id": "unique-id",
      "fact": "high-value fact",
      "category": "lead|investment|business|personal|task",
      "confidence": "high|medium",
      "extractedAt": "ISO date"
    }
  ]
}

Rules:
- Only include items that are genuinely valuable for JARVIS to remember
- Ignore routine status checks, repeated questions, small talk
- Action items must be concrete and specific
- Working memory entries must be facts that would change how JARVIS advises in future sessions
- If nothing of value was discussed, return empty arrays — never invent content`;

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: extractionPrompt }],
        });

        const rawText =
          response.content[0].type === 'text' ? response.content[0].text : '';

        let extracted: Record<string, unknown> = {};
        try {
          extracted = JSON.parse(rawText.replace(/```json|```/g, '').trim());
        } catch {
          extracted = { sessionSummary: 'Could not extract learnings — raw transcript saved.' };
        }

        // Persist extracted learnings
        const operations: Promise<unknown>[] = [];

        if (Array.isArray(extracted.workingMemoryEntries)) {
          operations.push(
            appendWorkingMemory(extracted.workingMemoryEntries as WorkingMemoryEntry[])
          );
        }

        if (Array.isArray(extracted.openActionItems)) {
          for (const action of extracted.openActionItems as OpenActionItem[]) {
            operations.push(addPendingAction(action));
          }
        }

        const existingCross = (await loadCrossSessionContext()) ?? buildEmptyCrossSession();
        const patchPayload = {
          lastSessionDate: new Date().toISOString(),
          lastSessionSummary: (extracted.sessionSummary as string) ?? '',
          persistentFacts: [
            ...existingCross.persistentFacts,
            ...((extracted.keyFacts as string[]) ?? []),
          ].slice(-50), // cap at 50 facts
          investmentThesisNotes: [
            ...existingCross.investmentThesisNotes,
            ...((extracted.investmentNotes as string[]) ?? []),
          ].slice(-30),
          recentPatterns: [
            ...existingCross.recentPatterns,
            ...((extracted.patternsDetected as string[]) ?? []),
          ].slice(-20),
          weeklyLearnings: [
            ...existingCross.weeklyLearnings,
            ...((extracted.businessInsights as string[]) ?? []),
            ...((extracted.leadInsights as string[]) ?? []),
          ].slice(-40),
          lastUpdated: new Date().toISOString(),
        };

        operations.push(patchCrossSessionContext(patchPayload));
        await Promise.all(operations);

        return NextResponse.json({ ok: true, summary: extracted, sessionId });
      }

      // ── Working memory ───────────────────────────────────────────────────

      case 'load_working_memory': {
        const entries = await loadWorkingMemory();
        return NextResponse.json({ entries });
      }

      case 'append_working_memory': {
        const { entries } = body as { entries: WorkingMemoryEntry[] };
        await appendWorkingMemory(entries);
        return NextResponse.json({ ok: true });
      }

      // ── Pending actions ───────────────────────────────────────────────────

      case 'add_pending_action': {
        const { action: pendingAction } = body as { action: OpenActionItem };
        await addPendingAction(pendingAction);
        return NextResponse.json({ ok: true });
      }

      case 'resolve_action': {
        const { actionId } = body as { actionId: string };
        await resolvePendingAction(actionId);
        return NextResponse.json({ ok: true });
      }

      // ── Lead pipeline ─────────────────────────────────────────────────────

      case 'save_pipeline': {
        const { snapshot } = body as { snapshot: LeadPipelineSnapshot };
        await saveLeadPipelineSnapshot(snapshot);
        return NextResponse.json({ ok: true });
      }

      case 'load_pipeline': {
        const snapshot = await loadLeadPipelineSnapshot();
        return NextResponse.json({ snapshot });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('[JARVIS Memory API]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
