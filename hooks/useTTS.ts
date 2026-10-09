import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

export interface SpeechPart {
  text: string;
  voiceId?: string; // ElevenLabs voice; omitted → the server's default (Jarvis)
}

interface UseTTSReturn {
  speak: (text: string, voiceId?: string) => Promise<void>;
  // Plays several parts back to back (e.g. Jarvis then Janet, each in their
  // own voice). One stop()/barge-in cancels the whole sequence.
  speakSequence: (parts: SpeechPart[]) => Promise<void>;
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

function requestSpeech(text: string, voiceId: string | undefined, signal: AbortSignal) {
  return fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
    signal,
  });
}

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
    async (text: string, voiceId?: string) => {
      if (!text.trim() || muted) return;

      // Cancel anything in flight
      cleanup();

      setCurrentText(text);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await requestSpeech(text, voiceId, controller.signal);

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

  const speakSequence = useCallback(
    async (parts: SpeechPart[]) => {
      const queue = parts.filter((p) => p.text.trim());
      if (queue.length === 0 || muted) return;
      if (queue.length === 1) return speak(queue[0].text, queue[0].voiceId);

      // Cancel anything in flight
      cleanup();
      const controller = new AbortController();
      abortRef.current = controller;
      const { signal } = controller;

      // Request every part up front so each is ready when the one before it
      // finishes; a failed part is skipped rather than ending the sequence.
      const blobs = queue.map((p) =>
        requestSpeech(p.text, p.voiceId, signal)
          .then((res) => {
            if (res.ok && res.body) return res.blob();
            onError?.(`TTS failed (HTTP ${res.status})`);
            return null;
          })
          .catch((err) => {
            if ((err as Error).name !== 'AbortError') {
              onError?.(err instanceof Error ? err.message : 'Unknown TTS error');
            }
            return null;
          })
      );

      // Resolves true when the clip plays to the end, false if it fails or
      // the sequence is stopped.
      const playToEnd = (blob: Blob) =>
        new Promise<boolean>((resolve) => {
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          const finish = (ok: boolean) => {
            signal.removeEventListener('abort', onAbort);
            if (objectUrlRef.current === url) {
              URL.revokeObjectURL(url);
              objectUrlRef.current = null;
            }
            if (audioRef.current === audio) audioRef.current = null;
            resolve(ok);
          };
          const onAbort = () => finish(false);
          signal.addEventListener('abort', onAbort);
          audio.onended = () => finish(true);
          audio.onerror = () => {
            // stop() clears the src, which also fires an error — not a failure
            if (!signal.aborted) onError?.('Audio playback failed');
            finish(false);
          };
          audio.play().catch((err) => {
            if ((err as Error).name !== 'AbortError') {
              onError?.(err instanceof Error ? err.message : 'Audio playback failed');
            }
            finish(false);
          });
        });

      let started = false;
      for (let i = 0; i < queue.length; i++) {
        const blob = await blobs[i];
        if (signal.aborted) return;
        if (!blob) continue;
        setCurrentText(queue[i].text);
        if (!started) {
          // isSpeaking stays true across the gaps between parts so the
          // always-on mic doesn't re-arm mid-reply.
          started = true;
          setIsSpeaking(true);
          onStart?.();
        }
        const played = await playToEnd(blob);
        if (signal.aborted) return;
        if (!played) break;
      }
      if (abortRef.current === controller) abortRef.current = null;
      setIsSpeaking(false);
      if (started) onEnd?.();
    },
    [muted, speak, cleanup, onStart, onEnd, onError]
  );

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { speak, speakSequence, stop, isSpeaking, currentText, muted, setMuted, toggleMuted };
}
