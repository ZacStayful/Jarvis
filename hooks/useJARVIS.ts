// hooks/useJARVIS.ts
// ─── useJARVIS Hook (Phase 8) ─────────────────────────────────────────────────
//
// Merged feature set across phases:
//   Phase 4 — Typed message union (TextMessage | ApprovalMessage),
//             <action_request> parsing, approveAction / denyAction
//   Phase 5 — onRoute callback for view navigation events
//   Phase 8 — Session persistence (Vercel KV), cross-session context
//             injection, ElevenLabs voice streaming, request dedup,
//             timing telemetry, endSession() summarisation
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
import {
  useJARVISVoice,
  splitIntoSpeakableChunks,
  stripMarkdownForSpeech,
} from '@/lib/voice-config';

export type { ViewRoute };

// ─── Options + Return types ───────────────────────────────────────────────────

type UseJARVISOptions = BaseUseJARVISOptions & {
  onRoute?: (view: ViewRoute, params?: Record<string, unknown>) => void;
  crossSessionContext?: string;
  voiceEnabled?: boolean;
  persistSession?: boolean;
};

interface UseJARVISReturn extends BaseUseJARVISReturn {
  isSpeaking: boolean;
  sessionId: string;
  endSession: () => Promise<void>;
  stopSpeaking: () => void;
  performanceStats: {
    avgTtfbMs: number;
    avgTotalMs: number;
    sampleSize: number;
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function extractActionRequest(text: string): {
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

function toApiMessages(messages: Message[]): ApiMessage[] {
  return messages
    .filter(m => !m.isStreaming)
    .map(m => ({
      role: m.role,
      content: m.type === 'approval' ? m.content : (m as TextMessage).content,
    }));
}

function toStoredMessages(messages: Message[]): StoredMessage[] {
  return messages
    .filter(m => !m.isStreaming)
    .map(m => ({
      role: m.role,
      content: m.type === 'approval' ? m.content : (m as TextMessage).content,
      timestamp: m.timestamp.toISOString(),
      model: m.model,
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
    isStreaming: false,
  }));
}

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
  if (!res.ok) throw new Error(`Memory API ${res.status}`);
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJARVIS(options: UseJARVISOptions = {}): UseJARVISReturn {
  const {
    onStateChange,
    onError,
    onRoute,
    crossSessionContext = '',
    voiceEnabled = true,
    persistSession = true,
  } = options;

  // ── State ─────────────────────────────────────────────────────────────────

  const [messages, setMessages] = useState<Message[]>([]);
  const [jarvisState, setJARVISState] = useState<JARVISState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [sessionId] = useState<string>(generateSessionId);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  // ── State helpers ─────────────────────────────────────────────────────────

  const updateState = useCallback(
    (state: JARVISState) => {
      setJARVISState(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

  // ── Voice (Phase 8) ───────────────────────────────────────────────────────

  const { speak, stop: stopSpeaking, isSpeaking } = useJARVISVoice({
    enabled: voiceEnabled,
    onSpeakingChange: speaking => {
      if (speaking) {
        updateState('speaking');
      } else if (jarvisState === 'speaking') {
        updateState('idle');
      }
    },
  });

  // ── Session persistence (Phase 8) ─────────────────────────────────────────

  const debouncedSaverRef = useRef(
    createDebouncedSessionSaver(async () => {
      if (!persistSession) return;
      const msgs = messagesRef.current;
      if (!msgs.length) return;

      const ctx: Partial<SessionContext> = {
        sessionId,
        lastActiveAt: new Date().toISOString(),
        messageCount: msgs.length,
      };

      await memoryApi('save_session', {
        sessionId,
        messages: toStoredMessages(msgs),
        context: ctx,
      }).catch(() => {
        // Non-fatal — session save failure doesn't break JARVIS
      });
    }, 2000)
  );

  // Load previous session on mount
  useEffect(() => {
    if (!persistSession) return;

    const loadPrevious = async () => {
      try {
        await prefetchOnMount();
        const data = await memoryApi('load_session', { sessionId });
        const storedMsgs = (data.messages as StoredMessage[]) ?? [];
        if (storedMsgs.length > 0) {
          setMessages(fromStoredMessages(storedMsgs));
        }
      } catch {
        // Non-fatal — start fresh
      }
    };

    loadPrevious();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flush session on page unload
  useEffect(() => {
    const handleUnload = () => {
      debouncedSaverRef.current.flush().catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // ─── Core send logic ───────────────────────────────────────────────────────

  const sendToAPI = useCallback(
    async (
      userContent: string,
      deep = false,
      currentMessages: Message[]
    ) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

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

      const assistantMsgId = generateId();
      const streamingPlaceholder: TextMessage = {
        id: assistantMsgId,
        role: 'assistant',
        type: 'text',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages(prev => [...prev, streamingPlaceholder]);

      timingTracker.startTracking(assistantMsgId);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            deep,
            maxTokens: deep ? 4096 : 2048,
            crossSessionContext: crossSessionContext || undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let fullText = '';
        let modelUsed = '';
        let firstChunk = true;

        // Voice: buffer sentences for streaming TTS
        let spokenUpTo = 0;
        const speakPending = async (text: string, force = false) => {
          if (!voiceEnabled) return;
          const chunks = splitIntoSpeakableChunks(text.slice(spokenUpTo));
          // Hold back last chunk unless force=true — it may be incomplete
          const toSpeak = force ? chunks : chunks.slice(0, -1);
          for (const chunk of toSpeak) {
            spokenUpTo += chunk.length;
            await speak(stripMarkdownForSpeech(chunk), 'normal');
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;

            try {
              const parsed = JSON.parse(raw);

              if (parsed.type === 'route') {
                onRoute?.(
                  parsed.view as ViewRoute,
                  parsed.params as Record<string, unknown> | undefined
                );
              }

              if (parsed.type === 'start') {
                modelUsed = parsed.model;
                timingTracker.startTracking(assistantMsgId, modelUsed);
              }

              if (parsed.type === 'text') {
                if (firstChunk) {
                  timingTracker.markFirstByte(assistantMsgId);
                  firstChunk = false;
                }
                fullText += parsed.text;
                setCurrentResponse(fullText);

                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? ({ ...m, content: fullText, model: modelUsed } as TextMessage)
                      : m
                  )
                );

                // Stream to voice in sentence-complete chunks
                await speakPending(fullText);
              }

              if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Speak any remaining text
        if (voiceEnabled && fullText.slice(spokenUpTo).trim()) {
          await speakPending(fullText, true);
        }

        timingTracker.markComplete(assistantMsgId, fullText);

        // ── Finalise: check for action request in response ─────────────────
        const { cleanText, actionRequest } = extractActionRequest(fullText);

        if (actionRequest) {
          const approvalMsg: ApprovalMessage = {
            id: assistantMsgId,
            role: 'assistant',
            type: 'approval',
            content: cleanText,
            timestamp: new Date(),
            isStreaming: false,
            model: modelUsed,
            actionRequest,
            status: 'pending',
          };
          setMessages(prev =>
            prev.map(m => (m.id === assistantMsgId ? approvalMsg : m))
          );
        } else {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? ({
                    ...m,
                    content: fullText,
                    model: modelUsed,
                    isStreaming: false,
                  } as TextMessage)
                : m
            )
          );
        }

        setCurrentResponse('');
        if (!isSpeaking) updateState('idle');

        // Trigger debounced KV save
        debouncedSaverRef.current.save();
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
          updateState('idle');
          return;
        }
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        onError?.(errMessage);
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? ({
                  ...m,
                  type: 'text',
                  content: `I encountered an error: ${errMessage}. Please try again.`,
                  isStreaming: false,
                } as TextMessage)
              : m
          )
        );
        updateState('idle');
      } finally {
        setIsLoading(false);
      }
    },
    [
      updateState,
      onError,
      onRoute,
      crossSessionContext,
      voiceEnabled,
      speak,
      isSpeaking,
    ]
  );

  // ─── Public: sendMessage (deduped) ─────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, deep = false) => {
      if (!content.trim() || isLoading) return;
      const dedupeKey = `${content.slice(0, 40)}-${deep}`;
      await requestDedup.dedupe(dedupeKey, () =>
        sendToAPI(content, deep, messagesRef.current)
      );
    },
    [isLoading, sendToAPI]
  );

  // ─── Public: approveAction / denyAction (Phase 4) ──────────────────────────

  const approveAction = useCallback(
    async (messageId: string) => {
      const msg = messagesRef.current.find(m => m.id === messageId);
      if (!msg || msg.type !== 'approval') return;
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? ({ ...m, status: 'approved' } as ApprovalMessage)
            : m
        )
      );
      const approvalContent = `JARVIS_APPROVAL: ${JSON.stringify(msg.actionRequest)}`;
      await sendToAPI(approvalContent, false, messagesRef.current);
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
    abortControllerRef.current?.abort();
    stopSpeaking();
    setMessages([]);
    setCurrentResponse('');
    setJARVISState('idle');
    setIsLoading(false);
  }, [stopSpeaking]);

  // ─── Public: endSession (Phase 8) ──────────────────────────────────────────

  const endSession = useCallback(async () => {
    await debouncedSaverRef.current.flush();
    const stored = toStoredMessages(messagesRef.current);
    if (!stored.length) return;
    try {
      await memoryApi('summarise_session', { sessionId, messages: stored });
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
    // Phase 8 additions
    isSpeaking,
    sessionId,
    endSession,
    stopSpeaking,
    performanceStats,
  };
}
