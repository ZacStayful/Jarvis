import { useState, useCallback, useRef, useEffect } from 'react';

export type VoiceState =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'processing'
  | 'error';

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

const SAMPLE_RATE = 16000;
const WS_URL = (token: string) =>
  `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=${SAMPLE_RATE}&token=${token}`;

export function useVoiceInput(
  options: UseVoiceInputOptions = {}
): UseVoiceInputReturn {
  const {
    onFinalTranscript,
    onPartialTranscript,
    onStateChange,
    onError,
    silenceThresholdMs = 1500,
  } = options;

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTextRef = useRef('');

  const updateState = useCallback(
    (state: VoiceState) => {
      setVoiceState(state);
      onStateChange?.(state);
    },
    [onStateChange]
  );

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setPartialTranscript('');
    finalTextRef.current = '';
  }, []);

  const stopListening = useCallback(() => {
    cleanup();
    updateState('idle');
  }, [cleanup, updateState]);

  function float32ToInt16(buffer: Float32Array): ArrayBuffer {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16.buffer;
  }

  const startListening = useCallback(async () => {
    if (voiceState === 'listening') {
      stopListening();
      return;
    }

    setError(null);
    updateState('requesting');

    try {
      const tokenRes = await fetch('/api/transcribe');
      if (!tokenRes.ok) throw new Error('Could not reach transcription service');
      const { token } = await tokenRes.json();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      const ws = new WebSocket(WS_URL(token));
      wsRef.current = ws;

      ws.onopen = () => {
        updateState('listening');
        finalTextRef.current = '';

        const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const processor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = event => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = event.inputBuffer.getChannelData(0);
          const int16Data = float32ToInt16(inputData);
          ws.send(int16Data);
        };

        source.connect(processor);
        processor.connect(audioCtx.destination);
      };

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.message_type === 'PartialTranscript' && msg.text) {
            setPartialTranscript(msg.text);
            onPartialTranscript?.(msg.text);

            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
              if (finalTextRef.current.trim()) {
                const text = finalTextRef.current.trim();
                onFinalTranscript?.(text);
                stopListening();
              }
            }, silenceThresholdMs);
          }

          if (msg.message_type === 'FinalTranscript' && msg.text) {
            finalTextRef.current =
              (finalTextRef.current + ' ' + msg.text).trim();
            setPartialTranscript(finalTextRef.current);
            onPartialTranscript?.(finalTextRef.current);

            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
              if (finalTextRef.current.trim()) {
                const text = finalTextRef.current.trim();
                onFinalTranscript?.(text);
                stopListening();
              }
            }, silenceThresholdMs);
          }

          if (msg.message_type === 'SessionBegins') {
            console.log('JARVIS voice session started:', msg.session_id);
          }
        } catch {
          // Ignore parse errors on non-JSON messages
        }
      };

      ws.onerror = () => {
        const errMsg = 'Voice connection failed';
        setError(errMsg);
        onError?.(errMsg);
        cleanup();
        updateState('error');
      };

      ws.onclose = event => {
        if (voiceState === 'listening' && !event.wasClean) {
          const errMsg = 'Voice connection dropped';
          setError(errMsg);
          onError?.(errMsg);
          updateState('error');
        }
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone access denied or unavailable';
      setError(msg);
      onError?.(msg);
      cleanup();
      updateState('error');
    }
  }, [
    voiceState,
    stopListening,
    cleanup,
    updateState,
    onFinalTranscript,
    onPartialTranscript,
    onError,
    silenceThresholdMs,
  ]);

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
