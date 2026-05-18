/**
 * JARVIS — Voice Configuration & ElevenLabs Streaming
 *
 * Configures ElevenLabs for the Iron Man JARVIS voice profile:
 * British, calm, authoritative, intelligent, measured — never robotic.
 *
 * Architecture:
 * - Text → ElevenLabs streaming PCM → Web Audio API (minimum latency)
 * - Voice model: eleven_turbo_v2_5 (lowest latency, highest quality for streaming)
 * - PCM streamed directly to AudioContext — no MP3 decode lag
 * - Queue manager: if JARVIS is mid-speech when new text arrives, queues next chunk
 * - Speaking state callbacks: syncs with animated eye/brain states
 */

// ─── Voice Profile ────────────────────────────────────────────────────────────

/**
 * Recommended ElevenLabs voice for JARVIS:
 * "Daniel" (en-GB) — calm, authoritative, British male.
 * Replace VOICE_ID with your chosen voice once ElevenLabs account is set up.
 * If you clone Zac's preferred voice, paste the cloned voice ID here instead.
 */
export const JARVIS_VOICE_CONFIG = {
  // Replace with your ElevenLabs voice ID after account setup
  // Recommended: "Daniel" - bVMeCyTHy58xNoL34h3p (deep British male)
  // Alternative: "Adam" - pNInz6obpgDQGcFmaJgB (authoritative)
  voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? 'bVMeCyTHy58xNoL34h3p',

  model: 'eleven_turbo_v2_5' as const, // Lowest latency (~320ms TTFB)

  voiceSettings: {
    stability: 0.75,           // High stability = consistent JARVIS-like delivery
    similarity_boost: 0.85,    // Stay close to the voice profile
    style: 0.15,               // Slight expressiveness — not flat, not dramatic
    use_speaker_boost: true,   // Adds clarity and presence
  },

  outputFormat: 'pcm_22050' as const, // 22kHz PCM — best balance of quality + latency

  // Optimisation settings
  optimize_streaming_latency: 3, // 0-4. 3 = aggressive latency reduction
  chunk_length_schedule: [120, 160, 250, 290], // ElevenLabs auto-chunking schedule
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpeakingStateCallback = (speaking: boolean) => void;

interface AudioQueueItem {
  text: string;
  priority: 'normal' | 'interrupt'; // interrupt cancels current speech
}

// ─── Main Voice Manager ───────────────────────────────────────────────────────

export class JARVISVoiceManager {
  private audioCtx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private queue: AudioQueueItem[] = [];
  private isProcessing = false;
  private onSpeakingChange: SpeakingStateCallback;
  private apiKey: string;

  constructor(
    apiKey: string,
    onSpeakingChange: SpeakingStateCallback = () => {}
  ) {
    this.apiKey = apiKey;
    this.onSpeakingChange = onSpeakingChange;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Speak a text string. If JARVIS is already speaking, queues it.
   * If priority is 'interrupt', stops current speech immediately.
   */
  async speak(text: string, priority: 'normal' | 'interrupt' = 'normal'): Promise<void> {
    if (!text.trim()) return;

    if (priority === 'interrupt') {
      this.stopSpeaking();
      this.queue = [];
    }

    this.queue.push({ text, priority });
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /** Stop current speech immediately */
  stopSpeaking(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Already stopped
      }
      this.currentSource = null;
    }
    this.isProcessing = false;
    this.onSpeakingChange(false);
  }

  /** Clean shutdown */
  destroy(): void {
    this.stopSpeaking();
    this.queue = [];
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.queue.length) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      await this.speakText(item.text);
    }

    this.isProcessing = false;
  }

  private async speakText(text: string): Promise<void> {
    try {
      this.onSpeakingChange(true);

      const pcmData = await this.fetchPCM(text);
      if (!pcmData) return;

      await this.playPCM(pcmData);
    } catch (err) {
      console.error('[JARVIS Voice] Speech error:', err);
    } finally {
      if (!this.queue.length) {
        this.onSpeakingChange(false);
      }
    }
  }

  /**
   * Streams PCM audio from ElevenLabs.
   * Returns the full PCM buffer once complete.
   * In a future iteration this can be piped directly to AudioContext
   * for sub-200ms first-byte playback.
   */
  private async fetchPCM(text: string): Promise<Float32Array | null> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${JARVIS_VOICE_CONFIG.voiceId}/stream`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
        Accept: 'audio/pcm',
      },
      body: JSON.stringify({
        text,
        model_id: JARVIS_VOICE_CONFIG.model,
        voice_settings: JARVIS_VOICE_CONFIG.voiceSettings,
        output_format: JARVIS_VOICE_CONFIG.outputFormat,
        optimize_streaming_latency: JARVIS_VOICE_CONFIG.optimize_streaming_latency,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error(`[JARVIS Voice] ElevenLabs error ${response.status}: ${errText}`);
      return null;
    }

    const reader = response.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }

    // Merge chunks → Int16Array (22050Hz PCM) → Float32Array
    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const int16 = new Int16Array(merged.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    return float32;
  }

  private async playPCM(pcmData: Float32Array): Promise<void> {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext({ sampleRate: 22050 });
    }

    // Resume if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    const audioBuffer = this.audioCtx.createBuffer(
      1,           // mono
      pcmData.length,
      22050        // sample rate
    );
    // Float32Array is generic over ArrayBufferLike in newer TS — cast to the
    // exact ArrayBuffer-backed variant copyToChannel expects.
    audioBuffer.copyToChannel(pcmData as Float32Array<ArrayBuffer>, 0);

    return new Promise((resolve) => {
      const source = this.audioCtx!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx!.destination);

      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        resolve();
      };

      source.start();
    });
  }
}

// ─── React hook wrapper ───────────────────────────────────────────────────────

import { useRef, useCallback, useEffect } from 'react';

interface UseVoiceOptions {
  onSpeakingChange?: (speaking: boolean) => void;
  enabled?: boolean;
}

interface UseVoiceReturn {
  speak: (text: string, priority?: 'normal' | 'interrupt') => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
}

export function useJARVISVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { onSpeakingChange, enabled = true } = options;

  const managerRef = useRef<JARVISVoiceManager | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Import useState at top — add to the import above if adjusting standalone
  function useState<T>(initial: T): [T, (v: T) => void] {
    const { useState: _useState } = require('react');
    return _useState(initial);
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey || !enabled) return;

    managerRef.current = new JARVISVoiceManager(apiKey, (speaking) => {
      setIsSpeaking(speaking);
      onSpeakingChange?.(speaking);
    });

    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = useCallback(
    async (text: string, priority: 'normal' | 'interrupt' = 'normal') => {
      if (!managerRef.current) return;
      await managerRef.current.speak(text, priority);
    },
    []
  );

  const stop = useCallback(() => {
    managerRef.current?.stopSpeaking();
  }, []);

  return { speak, stop, isSpeaking };
}

// ─── Text splitting utilities ─────────────────────────────────────────────────

/**
 * Split JARVIS response text into speakable chunks.
 * Splits on sentence boundaries to allow streaming TTS while Claude is still generating.
 */
export function splitIntoSpeakableChunks(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [text];

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of sentences) {
    buffer += sentence;
    // Emit chunk once we have a reasonable speaking length (60-200 chars)
    if (buffer.length >= 60) {
      chunks.push(buffer.trim());
      buffer = '';
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

/**
 * Strips markdown formatting from text before sending to TTS.
 * JARVIS responses may contain **bold**, `code`, etc.
 */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')           // headings
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1') // bold/italic
    .replace(/`{1,3}[^`]+`{1,3}/g, '')  // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → text
    .replace(/^\s*[-•*]\s+/gm, '')      // list bullets
    .replace(/\n{2,}/g, '. ')           // paragraph breaks
    .replace(/\n/g, ' ')                // single newlines
    .trim();
}
