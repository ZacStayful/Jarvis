// hooks/useJARVIS.ts
// ─── useJARVIS Hook ───────────────────────────────────────────────────────────
//
// Owns the conversation with /api/chat: message history, streaming, approval
// cards, interrupts, session persistence (Vercel KV) and end-of-session
// summarisation.
//
// Speech is NOT handled here. app/page.tsx drives useTTS from the message
// stream so each member of staff speaks in their own voice as their text
// arrives.
//
// SSE events consumed (see app/api/chat/route.ts):
//   { type: 'start',   model }
//   { type: 'speaker', persona }   — who is talking from here on (hand-offs)
//   { type: 'text',    text }
//   { type: 'route',   view, params }
//   { type: 'error',   message }
//   [DONE]
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Message,
  TextMessage,
  ApprovalMessage,
  JARVISState,
  ActionRequest,
  UseJARVISOptions as BaseUseJARVISOptions,
  UseJARVISReturn as BaseUseJARVISReturn,
  ApiMessage,
  PersonaId,
  SendOptions,
} from '@/types/jarvis';
import type { ViewRoute } from '@/lib/commandRouter';
import {
  timingTracker,
  requestDedup,
  createDebouncedSessionSaver,
  prefetchOnMount,
} from '@/lib/performance';
import {
  generateSessionId,
  type StoredMessage,
  type SessionContext,
} from '@/lib/kv-memory';
import { getPersona, DEFAULT_PERSONA } from '@/lib/personas';

export type { ViewRoute };

// ─── Options + Return types ───────────────────────────────────────────────────

type UseJARVISOptions = BaseUseJARVISOptions & {
  onRoute?: (view: ViewRoute, params?: Record<string, unknown>) => void;
  /** Fired when the server hands the reply to the other member of staff. */
  onSpeakerChange?: (persona: PersonaId) => void;
  crossSessionContext?: string;
  persistSession?: boolean;
};

interface UseJARVISReturn extends BaseUseJARVISReturn {
  sessionId: string;
  endSession: () => Promise<void>;
  /**
   * Abort the in-flight reply (talk-over). Keeps whatever text has already
   * streamed as a finished message. Returns true if something was aborted.
   */
  interrupt: () => boolean;
  /**
   * Add an assistant message that is shown in the feed but never sent to the
   * API, KV or the EOD transcript (greetings, handovers). Returns its id.
   */
  addLocalAssistantMessage: (content: string, speaker?: PersonaId) => string;
  performanceStats: {
    avgTtfbMs: number;
    avgTotalMs: number;
    sampleSize: number;
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = 'jarvis_session_id';
const SUMMARISE_THROTTLE_MS = 5 * 60 * 1000;
const STORED_MESSAGE_CHAR_CAP = 1000;

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Same session id for the life of the tab, so a refresh resumes the
 * conversation from KV instead of starting a blank one. A new tab is a new
 * session.
 */
function resolveSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = generateSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return generateSessionId();
  }
}

export function extractActionRequest(text: string): {
  cleanText: string;
  actionRequest: ActionRequest | null;
} {
  const match = text.match(/<action_request>([\s\S]*?)<\/action_request>/);
  if (!match) return { cleanText: text, actionRequest: null };
  let actionRequest: ActionRequest | null = null;
  try {
    actionRequest = JSON.parse(match[1].trim()) as ActionRequest;
  } catch {
    return { cleanText: text, actionRequest: null };
  }
  const cleanText = text.replace(match[0], '').trim();
  return { cleanText, actionRequest };
}

/** The server strips hand-off tags; this is belt and braces for the UI. */
export function stripHandoff(text: string): string {
  return text.replace(/<handoff\b[^>]*>[\s\S]*?<\/handoff>\s*$/i, '').trimEnd();
}

function isConversational(m: Message): boolean {
  return !m.local && !m.isStreaming && m.content.trim().length > 0;
}

/**
 * History as the Messages API wants it: no local/UI-only messages, no empty
 * content, and the first turn must come from the user.
 */
export function toApiMessages(messages: Message[]): ApiMessage[] {
  const eligible = messages.filter(isConversational);
  const firstUser = eligible.findIndex(m => m.role === 'user');
  if (firstUser < 0) return [];
  return eligible.slice(firstUser).map(m => ({ role: m.role, content: m.content }));
}

function toStoredMessages(messages: Message[]): StoredMessage[] {
  return messages.filter(isConversational).map(m => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp.toISOString(),
    model: m.model,
    speaker: m.role === 'assistant' ? (m.speaker ?? DEFAULT_PERSONA) : undefined,
  }));
}

function fromStoredMessages(stored: StoredMessage[]): Message[] {
  return stored.map(m => ({
    id: generateId(),
    role: m.role,
    type: 'text' as const,
    content: m.content,
    timestamp: new Date(m.timestamp),
    model: m.model,
    speaker: m.role === 'assistant' ? (m.speaker ?? DEFAULT_PERSONA) : undefined,
    isStreaming: false,
  }));
}

async function memoryApi(
  action: string,
  payload: Record<string, unknown> = {},
  init: { keepalive?: boolean } = {}
): Promise<Record<string, unknown>> {
  // Persistence requires both NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN (client) and
  // JARVIS_INTERNAL_TOKEN (server) to be set to the same value in Vercel. If
  // the client token is missing, short-circuit so we don't spam the network
  // tab with 401s on every round-trip.
  const token = process.env.NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN;
  if (!token) throw new Error('memory_disabled');

  const res = await fetch('/api/memory', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-jarvis-token': token,
    },
    body: JSON.stringify({ action, ...payload }),
    keepalive: init.keepalive ?? false,
  });
  if (!res.ok) throw new Error(`Memory API ${res.status}`);
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJARVIS(options: UseJARVISOptions = {}): UseJARVISReturn {
  const {
    onStateChange,
    onError,
    onRoute,
    onSpeakerChange,
    crossSessionContext = '',
    persistSession = true,
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────

  const [messages, setMessages] = useState<Message[]>([]);
  const [jarvisState, setJARVISState] = useState<JARVISState>('idle');
  const [isLoading, setIsLoadingState] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [sessionId] = useState<string>(resolveSessionId);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // Mirrors of state that callbacks need synchronously (interrupt + send in
  // the same tick must not race React's batched updates).
  const isLoadingRef = useRef(false);
  // Every request gets a sequence number. Completion/error handlers of a
  // request that is no longer current (interrupted or superseded) do nothing,
  // so a stale `finally` can never clobber the new request's loading state.
  const requestSeqRef = useRef(0);
  const lastSummaryRef = useRef<{ at: number; count: number }>({ at: 0, count: 0 });

  const setIsLoading = useCallback((next: boolean) => {
    isLoadingRef.current = next;
    setIsLoadingState(next);
  }, []);

  const updateState = useCallback(
    (state: JARVISState) => {
      setJARVISState(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

  // ── Session persistence ───────────────────────────────────────────────────

  const debouncedSaverRef = useRef(
    createDebouncedSessionSaver(async () => {
      if (!persistSession) return;
      const msgs = messagesRef.current;
      const stored = toStoredMessages(msgs);
      if (!stored.length) return;

      const ctx: Partial<SessionContext> = {
        sessionId,
        lastActiveAt: new Date().toISOString(),
        messageCount: stored.length,
      };

      await memoryApi('save_session', {
        sessionId,
        messages: stored,
        context: ctx,
      }).catch(() => {
        // Non-fatal — session save failure doesn't break JARVIS
      });
    }, 2000)
  );

  // Restore the same tab's conversation after a refresh. Restored messages
  // keep their original timestamps so the speech effects in page.tsx (which
  // only voice messages newer than mount) stay quiet. Anything already in the
  // feed (the greeting) stays after the restored history.
  useEffect(() => {
    if (!persistSession) return;

    const loadPrevious = async () => {
      try {
        await prefetchOnMount();
        const data = await memoryApi('load_session', { sessionId });
        const storedMsgs = (data.messages as StoredMessage[]) ?? [];
        if (storedMsgs.length > 0) {
          const restored = fromStoredMessages(storedMsgs);
          setMessages(prev => [...restored, ...prev]);
        }
      } catch {
        // Non-fatal — start fresh
      }
    };

    loadPrevious();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Local (UI-only) assistant messages ────────────────────────────────────

  const addLocalAssistantMessage = useCallback(
    (content: string, speaker: PersonaId = DEFAULT_PERSONA): string => {
      const id = generateId();
      const msg: TextMessage = {
        id,
        role: 'assistant',
        type: 'text',
        content,
        timestamp: new Date(),
        isStreaming: false,
        local: true,
        speaker,
      };
      setMessages(prev => [...prev, msg]);
      return id;
    },
    []
  );

  // ─── Interrupt (talk-over) ─────────────────────────────────────────────────

  const interrupt = useCallback((): boolean => {
    if (!isLoadingRef.current) return false;
    requestSeqRef.current += 1; // invalidate the in-flight request's handlers
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    // Keep whatever has streamed so far as a finished message; drop empties.
    setMessages(prev =>
      prev.flatMap(m => {
        if (!m.isStreaming) return [m];
        const clean = extractActionRequest(stripHandoff(m.content)).cleanText.trim();
        if (!clean) return [];
        return [{ ...m, content: clean, isStreaming: false } as Message];
      })
    );
    setCurrentResponse('');
    setIsLoading(false);
    updateState('idle');
    return true;
  }, [setIsLoading, updateState]);

  // ─── Core send logic ───────────────────────────────────────────────────────

  const sendToAPI = useCallback(
    async (
      userContent: string,
      deep: boolean,
      currentMessages: Message[],
      opts: SendOptions
    ) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const seq = ++requestSeqRef.current;
      const isCurrent = () => requestSeqRef.current === seq;

      const persona: PersonaId = opts.persona ?? DEFAULT_PERSONA;

      const userMsg: TextMessage = {
        id: generateId(),
        role: 'user',
        type: 'text',
        content: userContent.trim(),
        timestamp: new Date(),
      };

      const updatedMessages = [...currentMessages, userMsg];
      setMessages(updatedMessages);
      setCurrentResponse('');
      setIsLoading(true);
      updateState('thinking');

      const apiMessages = toApiMessages(updatedMessages);

      // The streaming placeholder. A hand-off mid-reply closes it and opens a
      // second one for the other speaker, so these are `let`.
      let assistantMsgId = generateId();
      let speaker: PersonaId = persona;
      let fullText = '';
      let modelUsed = '';
      let firstChunk = true;

      const pushPlaceholder = (id: string, spk: PersonaId) => {
        const placeholder: TextMessage = {
          id,
          role: 'assistant',
          type: 'text',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          speaker: spk,
        };
        setMessages(prev => [...prev, placeholder]);
        timingTracker.startTracking(id, modelUsed || undefined);
      };

      const finaliseCurrent = () => {
        const id = assistantMsgId;
        const spk = speaker;
        const model = modelUsed;
        const { cleanText, actionRequest } = extractActionRequest(stripHandoff(fullText));
        if (actionRequest) {
          const approvalMsg: ApprovalMessage = {
            id,
            role: 'assistant',
            type: 'approval',
            content: cleanText,
            timestamp: new Date(),
            isStreaming: false,
            model,
            speaker: spk,
            actionRequest,
            status: 'pending',
          };
          setMessages(prev => prev.map(m => (m.id === id ? approvalMsg : m)));
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === id
                ? ({ ...m, content: cleanText, model, isStreaming: false, speaker: spk } as TextMessage)
                : m
            )
          );
        }
      };

      const handleEvent = (parsed: Record<string, unknown>) => {
        switch (parsed.type) {
          case 'route':
            onRoute?.(
              parsed.view as ViewRoute,
              parsed.params as Record<string, unknown> | undefined
            );
            break;

          case 'start':
            modelUsed = String(parsed.model ?? '');
            timingTracker.startTracking(assistantMsgId, modelUsed);
            break;

          case 'speaker': {
            const next = parsed.persona as PersonaId;
            if (fullText.trim()) {
              // Hand-off: close the current speaker's message, open the next.
              finaliseCurrent();
              assistantMsgId = generateId();
              fullText = '';
              firstChunk = true;
              speaker = next;
              pushPlaceholder(assistantMsgId, next);
            } else {
              speaker = next;
              const id = assistantMsgId;
              setMessages(prev =>
                prev.map(m => (m.id === id ? ({ ...m, speaker: next } as Message) : m))
              );
            }
            onSpeakerChange?.(next);
            break;
          }

          case 'text': {
            if (firstChunk) {
              timingTracker.markFirstByte(assistantMsgId);
              firstChunk = false;
            }
            fullText += String(parsed.text ?? '');
            setCurrentResponse(fullText);
            const id = assistantMsgId;
            const model = modelUsed;
            const text = fullText;
            setMessages(prev =>
              prev.map(m =>
                m.id === id ? ({ ...m, content: text, model } as TextMessage) : m
              )
            );
            break;
          }

          case 'error':
            throw new Error(String(parsed.message ?? 'Stream error'));
        }
      };

      pushPlaceholder(assistantMsgId, speaker);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            deep,
            maxTokens: deep ? 4096 : 2048,
            crossSessionContext: crossSessionContext || undefined,
            persona,
            inputMode: opts.inputMode ?? 'text',
            activeView: opts.activeView,
            viewJustOpened: opts.viewJustOpened ?? false,
            viewContext: opts.viewContext,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let done = false;

        while (!done) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          // Carry a partial line across network chunks — a JSON event split
          // over two reads used to be dropped silently.
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            if (raw === '[DONE]') {
              done = true;
              break;
            }
            let parsed: Record<string, unknown>;
            try {
              parsed = JSON.parse(raw) as Record<string, unknown>;
            } catch {
              continue; // malformed line — skip it, never the whole stream
            }
            handleEvent(parsed); // 'error' events throw from here
          }
        }

        if (buffer.startsWith('data: ')) {
          const raw = buffer.slice(6).trim();
          if (raw && raw !== '[DONE]') {
            try {
              handleEvent(JSON.parse(raw) as Record<string, unknown>);
            } catch (err) {
              if (!(err instanceof SyntaxError)) throw err;
            }
          }
        }

        if (!isCurrent()) return; // interrupted — interrupt() already tidied up

        if (!fullText.trim()) {
          throw new Error('The reply came back empty.');
        }

        timingTracker.markComplete(assistantMsgId, fullText);
        finaliseCurrent();
        setCurrentResponse('');
        updateState('idle');

        debouncedSaverRef.current.save();
      } catch (error) {
        if ((error as Error).name === 'AbortError' || !isCurrent()) return;

        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.(errMessage);

        // Friendly line in the speaker's voice; the technical detail is kept
        // on the message for the UI only. Marked local so it is never sent
        // back to the API as something JARVIS "said".
        const id = assistantMsgId;
        const spk = speaker;
        const friendly = getPersona(spk).errorLine;
        setMessages(prev =>
          prev.map(m =>
            m.id === id
              ? ({
                  id,
                  role: 'assistant',
                  type: 'text',
                  content: friendly,
                  timestamp: new Date(),
                  isStreaming: false,
                  local: true,
                  speaker: spk,
                  errorDetail: errMessage,
                } as TextMessage)
              : m
          )
        );
        setCurrentResponse('');
        updateState('idle');
      } finally {
        if (isCurrent()) setIsLoading(false);
      }
    },
    [updateState, onError, onRoute, onSpeakerChange, crossSessionContext, setIsLoading]
  );

  // ─── Public: sendMessage (deduped) ─────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, deep = false, opts: SendOptions = {}) => {
      if (!content.trim() || isLoadingRef.current) return;
      const dedupeKey = `${content.slice(0, 40)}-${deep}`;
      await requestDedup.dedupe(dedupeKey, () =>
        sendToAPI(content, deep, messagesRef.current, opts)
      );
    },
    [sendToAPI]
  );

  // ─── Public: approveAction / denyAction ────────────────────────────────────

  const approveAction = useCallback(
    async (messageId: string) => {
      const msg = messagesRef.current.find(m => m.id === messageId);
      if (!msg || msg.type !== 'approval') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId && m.type === 'approval'
            ? ({ ...m, status: 'approved' } as ApprovalMessage)
            : m
        )
      );
      // Janet's stayful-ads actions are executed by the app, not by Claude
      // (there is no tool for them); the confirmation is a local line in
      // her voice.
      const type = msg.actionRequest.type;
      if (type === 'create_ad_brief' || type === 'build_ad') {
        const speaker: PersonaId = msg.speaker ?? 'janet';
        let outcome: { ok: boolean; message: string; warnings?: string[] };
        try {
          const res = await fetch('/api/janet/brief', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, details: msg.actionRequest.details }),
          });
          outcome = (await res.json()) as typeof outcome;
          if (!outcome || typeof outcome.message !== 'string') {
            outcome = { ok: false, message: `That didn't go through, Zac (HTTP ${res.status}).` };
          }
        } catch (err) {
          outcome = {
            ok: false,
            message: `That didn't go through, Zac. ${err instanceof Error ? err.message : 'Network error'}`,
          };
        }
        const notice: TextMessage = {
          id: generateId(),
          role: 'assistant',
          type: 'text',
          content: outcome.message,
          timestamp: new Date(),
          isStreaming: false,
          local: true,
          announce: true,
          speaker,
          errorDetail: outcome.warnings?.length ? outcome.warnings.join(' · ') : undefined,
        };
        setMessages(prev => [...prev, notice]);
        debouncedSaverRef.current.save();
        return;
      }

      const approvalContent = `JARVIS_APPROVAL: ${JSON.stringify(msg.actionRequest)}`;
      await sendToAPI(approvalContent, false, messagesRef.current, {
        inputMode: 'text',
        persona: msg.speaker ?? DEFAULT_PERSONA,
      });
    },
    [sendToAPI]
  );

  const denyAction = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId && m.type === 'approval'
          ? ({ ...m, status: 'denied' } as ApprovalMessage)
          : m
      )
    );
  }, []);

  // ─── Public: clearMessages ─────────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    requestSeqRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setCurrentResponse('');
    setJARVISState('idle');
    setIsLoading(false);
  }, [setIsLoading]);

  // ─── Public: endSession ────────────────────────────────────────────────────
  //
  // Called when the tab is hidden or closed. Uses a keepalive request so the
  // summarisation survives the page going away, with the payload trimmed to
  // stay under the keepalive body cap. Throttled so repeated hide/show cycles
  // don't re-summarise an unchanged conversation.

  const endSession = useCallback(async () => {
    await debouncedSaverRef.current.flush();
    const stored = toStoredMessages(messagesRef.current)
      .slice(-40)
      .map(m => ({ ...m, content: m.content.slice(0, STORED_MESSAGE_CHAR_CAP) }));
    if (!stored.length) return;

    const now = Date.now();
    const last = lastSummaryRef.current;
    if (now - last.at < SUMMARISE_THROTTLE_MS && last.count === stored.length) return;
    lastSummaryRef.current = { at: now, count: stored.length };

    try {
      await memoryApi('summarise_session', { sessionId, messages: stored }, { keepalive: true });
    } catch (err) {
      console.warn('[JARVIS] Session summarisation failed:', err);
    }
  }, [sessionId]);

  const performanceStats = timingTracker.getAverages();

  return {
    messages,
    jarvisState,
    isLoading,
    sendMessage,
    approveAction,
    denyAction,
    clearMessages,
    currentResponse,
    sessionId,
    endSession,
    interrupt,
    addLocalAssistantMessage,
    performanceStats,
  };
}
