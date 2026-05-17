import { useState, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  isStreaming?: boolean;
}

export type JARVISState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseJARVISOptions {
  onStateChange?: (state: JARVISState) => void;
  onError?: (error: string) => void;
}

interface UseJARVISReturn {
  messages: Message[];
  jarvisState: JARVISState;
  isLoading: boolean;
  sendMessage: (content: string, deep?: boolean) => Promise<void>;
  clearMessages: () => void;
  currentResponse: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

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

  const sendMessage = useCallback(
    async (content: string, deep = false) => {
      if (!content.trim() || isLoading) return;

      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg]);
      setCurrentResponse('');
      setIsLoading(true);
      updateState('thinking');

      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const assistantMsgId = generateId();
      setMessages(prev => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

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

                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, content: fullText, model: modelUsed }
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

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: fullText,
                  model: modelUsed,
                  isStreaming: false,
                }
              : m
          )
        );

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
              ? {
                  ...m,
                  content: `I encountered an error: ${errMessage}. Please try again.`,
                  isStreaming: false,
                }
              : m
          )
        );

        updateState('idle');
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, updateState, onError]
  );

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
    clearMessages,
    currentResponse,
    setMessages,
  };
}
