// hooks/useJARVIS.ts
// ─── useJARVIS Hook ───────────────────────────────────────────────────────────
//
// Core hook for all JARVIS interactions. Extends the original with:
//   - Typed message union (TextMessage | ApprovalMessage)
//   - Action request parsing from <action_request> blocks
//   - approveAction / denyAction handlers
//   - Approval execution (sends JARVIS_APPROVAL: back to API)
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import type {
  Message,
  TextMessage,
  ApprovalMessage,
  JARVISState,
  ActionRequest,
  UseJARVISOptions,
  UseJARVISReturn,
  ApiMessage,
} from '@/types/jarvis';

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Parse <action_request>{ ... }</action_request> from response text.
// Returns { cleanText, actionRequest } — cleanText has the block removed.
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
    // Malformed JSON — treat as plain text
    return { cleanText: text, actionRequest: null };
  }

  const cleanText = text.replace(match[0], '').trim();
  return { cleanText, actionRequest };
}

// Convert typed Message[] back to ApiMessage[] for the API
function toApiMessages(messages: Message[]): ApiMessage[] {
  return messages
    .filter(m => !m.isStreaming) // Exclude in-flight messages
    .map(m => ({
      role: m.role,
      content: m.type === 'approval' ? m.content : (m as TextMessage).content,
    }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useJARVIS(options: UseJARVISOptions = {}): UseJARVISReturn {
  const { onStateChange, onError } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [jarvisState, setJARVISState] = useState<JARVISState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateState = useCallback(
    (state: JARVISState) => {
      setJARVISState(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

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

      // Build API messages from full history
      const apiMessages = toApiMessages(updatedMessages);

      // Streaming placeholder
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

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            deep,
            maxTokens: deep ? 4096 : 2048,
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

              if (parsed.type === 'start') {
                modelUsed = parsed.model;
              }

              if (parsed.type === 'text') {
                if (firstChunk) {
                  updateState('speaking');
                  firstChunk = false;
                }
                fullText += parsed.text;
                setCurrentResponse(fullText);

                // Update streaming placeholder in real time
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? ({ ...m, content: fullText, model: modelUsed } as TextMessage)
                      : m
                  )
                );
              }

              if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // ── Finalise: check for action request in response ─────────────────
        const { cleanText, actionRequest } = extractActionRequest(fullText);

        if (actionRequest) {
          // Replace streaming placeholder with approval message
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
          // Standard text message
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
        updateState('idle');
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          setMessages(prev => prev.filter(m => m.id !== assistantMsgId));
          updateState('idle');
          return;
        }

        const errMessage =
          error instanceof Error ? error.message : 'Unknown error';
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
    [updateState, onError]
  );

  // ─── Public: sendMessage ───────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string, deep = false) => {
      if (!content.trim() || isLoading) return;
      await sendToAPI(content, deep, messages);
    },
    [messages, isLoading, sendToAPI]
  );

  // ─── Public: approveAction ─────────────────────────────────────────────────
  // Marks the approval message as approved, then sends the execution request
  // back to the API using the JARVIS_APPROVAL: prefix convention.

  const approveAction = useCallback(
    async (messageId: string) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg || msg.type !== 'approval') return;

      // Mark as approved in UI immediately
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? ({ ...m, status: 'approved' } as ApprovalMessage)
            : m
        )
      );

      // Build execution message for the API
      const approvalContent = `JARVIS_APPROVAL: ${JSON.stringify(msg.actionRequest)}`;

      // Use current messages (including the approval message)
      await sendToAPI(approvalContent, false, messages);
    },
    [messages, sendToAPI]
  );

  // ─── Public: denyAction ────────────────────────────────────────────────────

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
    setMessages([]);
    setCurrentResponse('');
    setJARVISState('idle');
    setIsLoading(false);
  }, []);

  return {
    messages,
    jarvisState,
    isLoading,
    sendMessage,
    approveAction,
    denyAction,
    clearMessages,
    currentResponse,
  };
}
