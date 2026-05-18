/**
 * JARVIS — KV Memory Layer
 * Vercel KV (Redis) for session and cross-session persistence.
 *
 * Key schema:
 *   session:{sessionId}:messages      → compressed recent messages
 *   session:{sessionId}:context       → active context facts
 *   jarvis:cross-session              → persistent cross-session state
 *   jarvis:working-memory             → high-value facts extracted this week
 *   jarvis:pending-actions            → queued (but not yet executed) actions
 *   jarvis:lead-pipeline-snapshot     → last known pipeline summary
 */

import { kv } from '@vercel/kv';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

export interface SessionContext {
  sessionId: string;
  startedAt: string;
  lastActiveAt: string;
  messageCount: number;
  topics: string[];          // detected topic threads this session
  keyFacts: string[];        // facts JARVIS extracted mid-session
  pendingApprovals: string[]; // action items awaiting Zac's confirmation
}

export interface CrossSessionContext {
  lastSessionDate: string;
  lastSessionSummary: string;
  persistentFacts: string[];         // high-value, long-lived context
  openActionItems: OpenActionItem[];
  leadPipelineSummary: string;
  investmentThesisNotes: string[];
  recentPatterns: string[];
  weeklyLearnings: string[];
  lastUpdated: string;
}

export interface OpenActionItem {
  id: string;
  description: string;
  category: 'monday' | 'email' | 'call' | 'workflow' | 'obsidian' | 'other';
  createdAt: string;
  dueDate?: string;
  context: string;
  status: 'pending' | 'in_progress' | 'blocked';
}

// ─── TTL constants ─────────────────────────────────────────────────────────────

const SESSION_TTL_SECONDS = 60 * 60 * 8;          // 8 hours — one working day
const WORKING_MEMORY_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const CROSS_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

// ─── Session Memory ────────────────────────────────────────────────────────────

export async function saveSessionMessages(
  sessionId: string,
  messages: StoredMessage[]
): Promise<void> {
  // Store only the last 40 messages to stay within KV value limits
  const trimmed = messages.slice(-40);
  await kv.set(`session:${sessionId}:messages`, trimmed, {
    ex: SESSION_TTL_SECONDS,
  });
}

export async function loadSessionMessages(
  sessionId: string
): Promise<StoredMessage[]> {
  const stored = await kv.get<StoredMessage[]>(
    `session:${sessionId}:messages`
  );
  return stored ?? [];
}

export async function saveSessionContext(
  sessionId: string,
  context: SessionContext
): Promise<void> {
  await kv.set(`session:${sessionId}:context`, context, {
    ex: SESSION_TTL_SECONDS,
  });
}

export async function loadSessionContext(
  sessionId: string
): Promise<SessionContext | null> {
  return kv.get<SessionContext>(`session:${sessionId}:context`);
}

// ─── Cross-Session Context ─────────────────────────────────────────────────────

export async function loadCrossSessionContext(): Promise<CrossSessionContext | null> {
  return kv.get<CrossSessionContext>('jarvis:cross-session');
}

export async function saveCrossSessionContext(
  ctx: CrossSessionContext
): Promise<void> {
  await kv.set('jarvis:cross-session', ctx, {
    ex: CROSS_SESSION_TTL_SECONDS,
  });
}

export async function patchCrossSessionContext(
  patch: Partial<CrossSessionContext>
): Promise<CrossSessionContext> {
  const existing = (await loadCrossSessionContext()) ?? buildEmptyCrossSession();
  const updated: CrossSessionContext = {
    ...existing,
    ...patch,
    lastUpdated: new Date().toISOString(),
  };
  await saveCrossSessionContext(updated);
  return updated;
}

// ─── Working Memory (high-value extracted facts) ──────────────────────────────

export interface WorkingMemoryEntry {
  id: string;
  fact: string;
  category: 'lead' | 'investment' | 'business' | 'personal' | 'task';
  confidence: 'high' | 'medium';
  extractedAt: string;
  expiresAt?: string;
}

export async function loadWorkingMemory(): Promise<WorkingMemoryEntry[]> {
  return (await kv.get<WorkingMemoryEntry[]>('jarvis:working-memory')) ?? [];
}

export async function appendWorkingMemory(
  entries: WorkingMemoryEntry[]
): Promise<void> {
  const current = await loadWorkingMemory();
  // Deduplicate by fact content (simple substring check)
  const deduped = [...current];
  for (const entry of entries) {
    const alreadyExists = deduped.some(e =>
      e.fact.toLowerCase().includes(entry.fact.toLowerCase().slice(0, 40))
    );
    if (!alreadyExists) deduped.push(entry);
  }
  // Cap at 100 entries, keep most recent
  const capped = deduped.slice(-100);
  await kv.set('jarvis:working-memory', capped, {
    ex: WORKING_MEMORY_TTL_SECONDS,
  });
}

export async function clearExpiredWorkingMemory(): Promise<void> {
  const current = await loadWorkingMemory();
  const now = new Date();
  const valid = current.filter(e => {
    if (!e.expiresAt) return true;
    return new Date(e.expiresAt) > now;
  });
  await kv.set('jarvis:working-memory', valid, {
    ex: WORKING_MEMORY_TTL_SECONDS,
  });
}

// ─── Pending Actions ──────────────────────────────────────────────────────────

export async function loadPendingActions(): Promise<OpenActionItem[]> {
  return (await kv.get<OpenActionItem[]>('jarvis:pending-actions')) ?? [];
}

export async function savePendingActions(
  actions: OpenActionItem[]
): Promise<void> {
  await kv.set('jarvis:pending-actions', actions, {
    ex: CROSS_SESSION_TTL_SECONDS,
  });
}

export async function addPendingAction(action: OpenActionItem): Promise<void> {
  const current = await loadPendingActions();
  const updated = [...current.filter(a => a.id !== action.id), action];
  await savePendingActions(updated);
}

export async function resolvePendingAction(actionId: string): Promise<void> {
  const current = await loadPendingActions();
  await savePendingActions(current.filter(a => a.id !== actionId));
}

// ─── Lead Pipeline Snapshot ────────────────────────────────────────────────────

export interface LeadPipelineSnapshot {
  capturedAt: string;
  totalLeads: number;
  byStatus: Record<string, number>;
  hotLeads: string[];       // names of leads marked hot
  nextWebMeetings: string[]; // upcoming meeting names
  summary: string;
}

export async function saveLeadPipelineSnapshot(
  snapshot: LeadPipelineSnapshot
): Promise<void> {
  await kv.set('jarvis:lead-pipeline-snapshot', snapshot, {
    ex: WORKING_MEMORY_TTL_SECONDS,
  });
}

export async function loadLeadPipelineSnapshot(): Promise<LeadPipelineSnapshot | null> {
  return kv.get<LeadPipelineSnapshot>('jarvis:lead-pipeline-snapshot');
}

// ─── Session ID utilities ──────────────────────────────────────────────────────

export function generateSessionId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `JARVIS-${date}-${rand}`;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

export function buildEmptyCrossSession(): CrossSessionContext {
  return {
    lastSessionDate: new Date().toISOString(),
    lastSessionSummary: '',
    persistentFacts: [],
    openActionItems: [],
    leadPipelineSummary: '',
    investmentThesisNotes: [],
    recentPatterns: [],
    weeklyLearnings: [],
    lastUpdated: new Date().toISOString(),
  };
}

export function buildEmptySessionContext(sessionId: string): SessionContext {
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    messageCount: 0,
    topics: [],
    keyFacts: [],
    pendingApprovals: [],
  };
}
