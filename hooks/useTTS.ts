import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

interface UseTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  // The text currently being spoken (or last spoken if isSpeaking is
  // false). Used by app/page.tsx's barge-in filter to discard partial
  // transcripts that match JARVIS's own voice picked up via mic echo.
  currentText: string;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
}

const STORAGE_KEY = 'jarvis_tts_muted';

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { onStart, onEnd, onError } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string>('');
  const [muted, setMutedState] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Restore mute preference on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setMutedState(true);
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
  }, [cleanup]);

  const toggleMuted = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (next) stop();
  }, [muted, setMuted, stop]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim() || muted) return;

      // Cancel anything in flight
      cleanup();

      setCurrentText(text);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errMsg = `TTS failed (HTTP ${res.status})`;
          onError?.(errMsg);
          return;
        }

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsSpeaking(false);
          if (objectUrlRef.current === url) {
            URL.revokeObjectURL(url);
            objectUrlRef.current = null;
          }
          audioRef.current = null;
          onEnd?.();
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          if (objectUrlRef.current === url) {
            URL.revokeObjectURL(url);
            objectUrlRef.current = null;
          }
          audioRef.current = null;
          onError?.('Audio playback failed');
        };

        setIsSpeaking(true);
        onStart?.();
        await audio.play();
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Unknown TTS error';
        onError?.(msg);
        setIsSpeaking(false);
      }
    },
    [muted, cleanup, onStart, onEnd, onError]
  );

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { speak, stop, isSpeaking, currentText, muted, setMuted, toggleMuted };
}
