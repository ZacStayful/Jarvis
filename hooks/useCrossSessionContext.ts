/**
 * JARVIS — useCrossSessionContext
 * React hook that loads and manages JARVIS's persistent cross-session memory.
 *
 * On mount: loads last session summary, working memory, open action items,
 * lead pipeline snapshot, and persistent facts from Vercel KV.
 *
 * Provides: context object, loading state, patch/refresh utilities.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from 'react';
import type {
  CrossSessionContext,
  WorkingMemoryEntry,
  OpenActionItem,
  LeadPipelineSnapshot,
} from '@/lib/kv-memory';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FullCrossSessionState {
  context: CrossSessionContext | null;
  workingMemory: WorkingMemoryEntry[];
  pipeline: LeadPipelineSnapshot | null;
  pendingActions: OpenActionItem[];
  isLoaded: boolean;
  error: string | null;
}

interface UseCrossSessionContextReturn extends FullCrossSessionState {
  refresh: () => Promise<void>;
  patchContext: (patch: Partial<CrossSessionContext>) => Promise<void>;
  resolveAction: (actionId: string) => Promise<void>;
  addAction: (action: OpenActionItem) => Promise<void>;
  /**
   * Build a compact JARVIS context block to inject into the system prompt.
   * Returns a formatted string summarising what JARVIS knows from previous sessions.
   */
  buildContextBlock: () => string;
}

// ─── Internal API call helper ─────────────────────────────────────────────────

async function memoryApi(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const res = await fetch('/api/memory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jarvis-token': process.env.NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN ?? '',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, string>).error ?? `Memory API error ${res.status}`
    );
  }

  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY_STATE: FullCrossSessionState = {
  context: null,
  workingMemory: [],
  pipeline: null,
  pendingActions: [],
  isLoaded: false,
  error: null,
};

export function useCrossSessionContext(): UseCrossSessionContextReturn {
  const [state, setState] = useState<FullCrossSessionState>(EMPTY_STATE);
  const loadedOnce = useRef(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const [crossData, actionsData] = await Promise.all([
        memoryApi('load_cross_session'),
        memoryApi('load_working_memory'),
      ]);

      setState({
        context: (crossData.context as CrossSessionContext) ?? null,
        workingMemory: (crossData.workingMemory as WorkingMemoryEntry[]) ?? [],
        pipeline: (crossData.pipeline as LeadPipelineSnapshot) ?? null,
        pendingActions:
          ((crossData.context as CrossSessionContext)?.openActionItems ?? []),
        isLoaded: true,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load context';
      // Non-fatal: JARVIS can operate without cross-session memory
      setState(prev => ({ ...prev, isLoaded: true, error: msg }));
      console.warn('[JARVIS] Cross-session context unavailable:', msg);
    }
  }, []);

  useEffect(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      refresh();
    }
  }, [refresh]);

  // ── Patch ─────────────────────────────────────────────────────────────────

  const patchContext = useCallback(
    async (patch: Partial<CrossSessionContext>) => {
      await memoryApi('patch_cross_session', { patch });
      setState(prev => ({
        ...prev,
        context: prev.context
          ? { ...prev.context, ...patch, lastUpdated: new Date().toISOString() }
          : null,
      }));
    },
    []
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const resolveAction = useCallback(async (actionId: string) => {
    await memoryApi('resolve_action', { actionId });
    setState(prev => ({
      ...prev,
      pendingActions: prev.pendingActions.filter(a => a.id !== actionId),
      context: prev.context
        ? {
            ...prev.context,
            openActionItems: prev.context.openActionItems.filter(
              a => a.id !== actionId
            ),
          }
        : null,
    }));
  }, []);

  const addAction = useCallback(async (action: OpenActionItem) => {
    await memoryApi('add_pending_action', { action });
    setState(prev => ({
      ...prev,
      pendingActions: [...prev.pendingActions.filter(a => a.id !== action.id), action],
    }));
  }, []);

  // ── Context block for system prompt injection ─────────────────────────────

  const buildContextBlock = useCallback((): string => {
    const { context, workingMemory, pipeline, pendingActions } = state;

    if (!context && !workingMemory.length) return '';

    const lines: string[] = ['=== JARVIS CROSS-SESSION CONTEXT ==='];

    if (context?.lastSessionSummary) {
      lines.push(
        `\nLast session (${
          context.lastSessionDate
            ? new Date(context.lastSessionDate).toLocaleDateString('en-GB')
            : 'unknown'
        }): ${context.lastSessionSummary}`
      );
    }

    if (context?.persistentFacts?.length) {
      lines.push('\nPersistent facts:');
      context.persistentFacts
        .slice(-15) // most recent 15 facts
        .forEach(f => lines.push(`• ${f}`));
    }

    if (workingMemory.length) {
      const highConfidence = workingMemory.filter(e => e.confidence === 'high');
      if (highConfidence.length) {
        lines.push('\nWorking memory (high confidence):');
        highConfidence
          .slice(-10)
          .forEach(e => lines.push(`• [${e.category}] ${e.fact}`));
      }
    }

    if (pendingActions.filter(a => a.status !== 'pending').length === 0 &&
        pendingActions.length > 0) {
      lines.push('\nOpen action items:');
      pendingActions
        .slice(0, 5)
        .forEach(a => lines.push(`• [${a.category}] ${a.description}`));
    }

    if (pipeline) {
      const ago = pipeline.capturedAt
        ? Math.round(
            (Date.now() - new Date(pipeline.capturedAt).getTime()) / 60000
          )
        : null;
      lines.push(
        `\nLead pipeline (captured ${ago != null ? `${ago}m ago` : 'recently'}): ${pipeline.summary}`
      );
    }

    if (context?.recentPatterns?.length) {
      lines.push('\nRecent patterns detected:');
      context.recentPatterns
        .slice(-5)
        .forEach(p => lines.push(`• ${p}`));
    }

    lines.push('\n=== END CONTEXT ===');
    return lines.join('\n');
  }, [state]);

  return {
    ...state,
    refresh,
    patchContext,
    resolveAction,
    addAction,
    buildContextBlock,
  };
}

// ─── React Context (optional — for deep tree access) ─────────────────────────

export const CrossSessionCtx = createContext<UseCrossSessionContextReturn | null>(
  null
);

export function useCrossSession(): UseCrossSessionContextReturn {
  const ctx = useContext(CrossSessionCtx);
  if (!ctx) {
    throw new Error(
      'useCrossSession must be used within a CrossSessionProvider'
    );
  }
  return ctx;
}
