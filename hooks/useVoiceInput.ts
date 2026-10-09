import { useState, useCallback, useRef, useEffect } from 'react';

// Browser-native Web Speech API. Zero cost, no external service.
// Supported well in Chrome / Edge. macOS Safari 14+. Not Firefox.
// On iOS Safari `continuous` recognition is unreliable, so the page uses
// tap-to-talk there: one startListening() per utterance, the silence timer
// finalises it.
//
// Replaced AssemblyAI v3 — that endpoint required a paid plan and was
// rejecting the existing key with "Invalid API key".

export type VoiceState =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'processing'
  | 'error';

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => unknown) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

export interface UseVoiceInputOptions {
  onFinalTranscript?: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: string) => void;
  silenceThresholdMs?: number;
}

export interface UseVoiceInputReturn {
  voiceState: VoiceState;
  partialTranscript: string;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputReturn {
  const { silenceThresholdMs = 1500 } = options;

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef = useRef('');
  const intentionallyStoppedRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>('idle');

  // The recogniser's event handlers are installed once per startListening()
  // and then live for as long as the browser keeps the session open. Reading
  // the callbacks through refs means they always see the latest render's
  // closures — otherwise the page's local handlers ran with stale
  // routedView / salesOpen / salesMetrics for the life of the session.
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const updateState = useCallback((state: VoiceState) => {
    voiceStateRef.current = state;
    setVoiceState(state);
    callbacksRef.current.onStateChange?.(state);
  }, []);

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
    setPartialTranscript('');
    finalTextRef.current = '';
  }, []);

  const stopListening = useCallback(() => {
    intentionallyStoppedRef.current = true;
    cleanup();
    updateState('idle');
  }, [cleanup, updateState]);

  const startListening = useCallback(async () => {
    if (voiceStateRef.current === 'listening') {
      stopListening();
      return;
    }

    setError(null);
    updateState('requesting');

    if (typeof window === 'undefined') {
      const errMsg = 'Voice input is only available in the browser';
      setError(errMsg);
      callbacksRef.current.onError?.(errMsg);
      updateState('error');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      const errMsg =
        'Voice input is not supported in this browser. Use Chrome or Edge.';
      setError(errMsg);
      callbacksRef.current.onError?.(errMsg);
      updateState('error');
      return;
    }

    try {
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';
      recognitionRef.current = recognition;
      intentionallyStoppedRef.current = false;

      recognition.onstart = () => {
        updateState('listening');
      };

      recognition.onresult = ev => {
        let interim = '';
        let finalSegment = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const result = ev.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalSegment += text;
          } else {
            interim += text;
          }
        }

        if (finalSegment) {
          finalTextRef.current = (
            finalTextRef.current + ' ' + finalSegment
          ).trim();
        }

        const display = (
          finalTextRef.current + (interim ? ' ' + interim : '')
        ).trim();
        setPartialTranscript(display);
        callbacksRef.current.onPartialTranscript?.(display);

        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          if (finalTextRef.current.trim()) {
            const text = finalTextRef.current.trim();
            callbacksRef.current.onFinalTranscript?.(text);
            stopListening();
          }
        }, silenceThresholdMs);
      };

      recognition.onerror = ev => {
        const code = ev.error || 'unknown';
        // "no-speech" and "aborted" are benign during always-on mode.
        if (code === 'no-speech' || code === 'aborted') return;
        const errMsg =
          code === 'not-allowed'
            ? 'Microphone permission denied. Allow microphone access for this site.'
            : code === 'audio-capture'
            ? 'No microphone found.'
            : code === 'network'
            ? 'Voice recognition network error.'
            : `Voice error: ${code}`;
        setError(errMsg);
        callbacksRef.current.onError?.(errMsg);
        cleanup();
        updateState('error');
      };

      recognition.onend = () => {
        // Browsers periodically auto-stop continuous recognition. The
        // consumer's always-on effect will restart it. We just mark idle.
        if (!intentionallyStoppedRef.current) {
          updateState('idle');
        }
      };

      recognition.start();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to start voice input';
      setError(msg);
      callbacksRef.current.onError?.(msg);
      cleanup();
      updateState('error');
    }
  }, [stopListening, cleanup, updateState, silenceThresholdMs]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    voiceState,
    partialTranscript,
    isListening: voiceState === 'listening',
    startListening,
    stopListening,
    error,
  };
}
