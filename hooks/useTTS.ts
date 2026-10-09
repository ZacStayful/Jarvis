import { useCallback, useEffect, useRef, useState } from 'react';
import type { PersonaId } from '@/types/jarvis';
import { DEFAULT_PERSONA } from '@/lib/personas';

// ─── useTTS ───────────────────────────────────────────────────────────────────
//
// Queued speech through the /api/speak ElevenLabs proxy.
//
//   speak(text, persona)   — interrupt: drop everything, say this now.
//                            Acks, greetings, fillers, handovers, errors.
//   enqueue(text, persona) — append: say this after whatever is queued.
//                            Streamed reply chunks, chained replies.
//   stop()                 — silence, clear the queue.
//
// Design notes:
// - One HTMLAudioElement is reused for every chunk. iOS only lets audio
//   play after a user gesture; once an element has played in a gesture it
//   may keep playing new sources, which a fresh `new Audio()` per chunk
//   would not.
// - The next chunk's audio is fetched while the current one plays, so
//   sentence-by-sentence playback has no gap beyond the first fetch.
// - `isSpeaking` is true from the first enqueue until the queue drains, with
//   no flicker between chunks. `onEnd` fires on a natural drain, never on
//   stop(). The speak() promise resolves whether or not audio actually
//   played — autoplay rejection is reported through onError and the queue
//   is cleared, so `onEnd` remains the only real "it played" signal.
// - `currentText` is everything enqueued since the last speak()/stop(): the
//   echo filter in lib/voice-echo-filter.ts compares mic partials against
//   it, and with chunked playback it needs the whole reply, not the chunk.

interface UseTTSOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

interface UseTTSReturn {
  speak: (text: string, persona?: PersonaId) => Promise<void>;
  enqueue: (text: string, persona?: PersonaId) => void;
  stop: () => void;
  isSpeaking: boolean;
  currentText: string;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
}

interface QueueItem {
  id: number;
  text: string;
  persona: PersonaId;
  controller: AbortController;
  blob?: Promise<Blob | null>;
}

const STORAGE_KEY = 'jarvis_tts_muted';

export function readStoredMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState<string>('');
  const [muted, setMutedState] = useState<boolean>(false);

  // Callbacks through refs so `speak`/`enqueue` are stable even when the
  // caller passes inline functions (otherwise every effect depending on
  // `speak` re-runs each render — the sales silence timer among them).
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);
  const generationRef = useRef(0);
  const nextIdRef = useRef(1);
  const groupTextRef = useRef('');
  const mutedRef = useRef(false);

  // Restore mute preference on mount
  useEffect(() => {
    const stored = readStoredMuted();
    mutedRef.current = stored;
    if (stored) setMutedState(true);
  }, []);

  const setMuted = useCallback((next: boolean) => {
    mutedRef.current = next;
    setMutedState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // storage unavailable — in-memory only
      }
    }
  }, []);

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'auto';
    }
    return audioRef.current;
  }, []);

  const stop = useCallback(() => {
    generationRef.current += 1; // any in-flight processQueue loop exits
    for (const item of queueRef.current) item.controller.abort();
    queueRef.current = [];
    processingRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // nothing playing
      }
    }
    releaseUrl();
    setIsSpeaking(false);
  }, [releaseUrl]);

  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    setMuted(next);
    if (next) stop();
  }, [setMuted, stop]);

  const fetchBlob = useCallback(async (item: QueueItem): Promise<Blob | null> => {
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.text, persona: item.persona }),
        signal: item.controller.signal,
      });
      if (!res.ok) {
        callbacksRef.current.onError?.(`TTS failed (HTTP ${res.status})`);
        return null;
      }
      return await res.blob();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacksRef.current.onError?.(
          err instanceof Error ? err.message : 'Unknown TTS error'
        );
      }
      return null;
    }
  }, []);

  const playBlob = useCallback(
    (blob: Blob): Promise<'ended' | 'blocked' | 'failed'> =>
      new Promise(resolve => {
        const audio = getAudio();
        releaseUrl();
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        audio.onended = () => resolve('ended');
        audio.onerror = () => resolve('failed');
        audio.src = url;
        audio.play().catch(() => resolve('blocked'));
      }),
    [getAudio, releaseUrl]
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    const generation = generationRef.current;
    let started = false;

    while (queueRef.current.length > 0 && generationRef.current === generation) {
      const item = queueRef.current[0];
      item.blob ??= fetchBlob(item);
      // Prefetch the next chunk while this one plays.
      const next = queueRef.current[1];
      if (next) next.blob ??= fetchBlob(next);

      const blob = await item.blob;
      if (generationRef.current !== generation) break;

      if (!blob) {
        queueRef.current.shift();
        continue;
      }

      if (!started) {
        started = true;
        callbacksRef.current.onStart?.();
      }

      const outcome = await playBlob(blob);
      if (generationRef.current !== generation) break;
      queueRef.current.shift();

      if (outcome === 'blocked') {
        // Autoplay refused (no user gesture yet). Nothing after this will
        // play either, so drop the rest and let the caller re-arm on a
        // gesture. onEnd deliberately does NOT fire.
        queueRef.current = [];
        processingRef.current = false;
        setIsSpeaking(false);
        callbacksRef.current.onError?.('Audio playback blocked');
        return;
      }
      if (outcome === 'failed') {
        callbacksRef.current.onError?.('Audio playback failed');
      }
    }

    if (generationRef.current !== generation) return; // stopped mid-way
    processingRef.current = false;
    releaseUrl();
    setIsSpeaking(false);
    if (started) callbacksRef.current.onEnd?.();
  }, [fetchBlob, playBlob, releaseUrl]);

  const enqueue = useCallback(
    (text: string, persona: PersonaId = DEFAULT_PERSONA) => {
      const trimmed = text.trim();
      if (!trimmed || mutedRef.current) return;
      queueRef.current.push({
        id: nextIdRef.current++,
        text: trimmed,
        persona,
        controller: new AbortController(),
      });
      groupTextRef.current = `${groupTextRef.current} ${trimmed}`.trim();
      setCurrentText(groupTextRef.current);
      setIsSpeaking(true);
      void processQueue();
    },
    [processQueue]
  );

  const speak = useCallback(
    async (text: string, persona: PersonaId = DEFAULT_PERSONA) => {
      if (!text.trim() || mutedRef.current) return;
      stop();
      groupTextRef.current = '';
      enqueue(text, persona);
    },
    [stop, enqueue]
  );

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { speak, enqueue, stop, isSpeaking, currentText, muted, setMuted, toggleMuted };
}
