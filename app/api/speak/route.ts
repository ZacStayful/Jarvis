import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';

export async function POST(req: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY) {
      console.error('TTS error: ELEVENLABS_API_KEY env var is not set');
      return NextResponse.json(
        { error: 'ELEVENLABS_API_KEY not configured' },
        { status: 500 }
      );
    }

    const { text, voiceId }: { text: string; voiceId?: string } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const voice = voiceId || DEFAULT_VOICE_ID;
    if (!voice) {
      console.error('TTS error: ELEVENLABS_VOICE_ID env var is not set (and no voiceId in body)');
      return NextResponse.json(
        { error: 'No voice id supplied and ELEVENLABS_VOICE_ID not configured' },
        { status: 500 }
      );
    }

    // Strip markdown-ish formatting so it isn't read aloud as punctuation
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
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
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
