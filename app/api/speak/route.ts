import { NextRequest, NextResponse } from 'next/server';
import { getPersona } from '@/lib/personas';

export const runtime = 'edge';

// Tolerate stray quotes or spaces pasted into the Vercel value.
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim().replace(/^["']+|["']+$/g, '').trim();
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

// The shape of the configured key, for diagnosing a rejected key without
// ever logging the key itself.
function describeKey(raw: string | undefined): string {
  const v = raw ?? '';
  return `length ${v.length}, starts with sk_: ${v.replace(/^[\s"']+/, '').startsWith('sk_')}, quotes: ${/["']/.test(v)}, whitespace: ${/\s/.test(v)}`;
}

// Each member of staff has their own ElevenLabs voice. The persona lists its
// env vars in priority order (lib/personas.ts): JARVIS reads
// ELEVENLABS_VOICE_ID_JARVIS then ELEVENLABS_VOICE_ID; Janet reads
// ELEVENLABS_VOICE_ID_JANET, then NEXT_PUBLIC_JANET_VOICE_ID (the var the
// marketing department shipped with), then ELEVENLABS_VOICE_ID.
function resolveVoiceId(personaId: string | undefined, explicit?: string): string | undefined {
  if (explicit) return explicit;
  const persona = getPersona(personaId);
  for (const key of persona.voiceEnvKeys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
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
        `TTS error: no voice id for ${persona.name} (set one of ${persona.voiceEnvKeys.join(', ')})`
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
      console.error(
        'ElevenLabs error:',
        upstream.status,
        detail,
        upstream.status === 401 || upstream.status === 400
          ? `| ELEVENLABS_API_KEY as set: ${describeKey(process.env.ELEVENLABS_API_KEY)}`
          : ''
      );
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
