import { NextRequest, NextResponse } from 'next/server';
import { getPersona } from '@/lib/personas';

export const runtime = 'edge';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// Each member of staff has their own ElevenLabs voice:
//   ELEVENLABS_VOICE_ID_JARVIS, ELEVENLABS_VOICE_ID_JANET
// Either falls back to ELEVENLABS_VOICE_ID (the original single-voice var)
// so the app keeps speaking while the second id is being set up.
function resolveVoiceId(personaId: string | undefined, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const persona = getPersona(personaId);
  return process.env[persona.voiceEnvKey] || process.env.ELEVENLABS_VOICE_ID || undefined;
}

export async function POST(req: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      console.error('TTS error: ELEVENLABS_API_KEY env var is not set');
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const {
      text,
      voiceId,
      persona: personaId,
    }: { text: string; voiceId?: string; persona?: string } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const persona = getPersona(personaId);
    const voice = resolveVoiceId(personaId, voiceId);
    if (!voice) {
      console.error(
        `TTS error: no voice id for ${persona.name} (set ${persona.voiceEnvKey} or ELEVENLABS_VOICE_ID)`
      );
      return NextResponse.json(
        { error: `No voice id configured for ${persona.name}` },
        { status: 500 }
      );
    }

    // Strip markdown-ish formatting so it isn't read aloud as punctuation.
    // The client already strips most of it; this is the safety net.
    const spoken = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-•]\s+/gm, '')
      .trim();

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream?output_format=mp3_44100_128`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: spoken,
        model_id: ELEVENLABS_MODEL,
        voice_settings: persona.voiceSettings,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('ElevenLabs error:', upstream.status, detail);
      return NextResponse.json(
        { error: 'TTS upstream failed', status: upstream.status },
        { status: 502 }
      );
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-JARVIS-Voice': voice,
        'X-JARVIS-Persona': persona.id,
      },
    });
  } catch (err) {
    console.error('JARVIS speak error:', err);
    return NextResponse.json(
      { error: 'TTS failed', detail: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
