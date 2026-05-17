// Mints a short-lived AssemblyAI v3 Universal Streaming token so the
// browser can open a direct WebSocket without exposing the master API key.
//
// The legacy v2 realtime endpoint (api.assemblyai.com/v2/realtime/token)
// was deprecated in 2025 and now returns 404 Not Found — hence this v3
// migration.
import { NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const TOKEN_URL = 'https://streaming.assemblyai.com/v3/token';

export async function GET() {
  try {
    const url = new URL(TOKEN_URL);
    url.searchParams.set('expires_in_seconds', '60');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('AssemblyAI v3 token error:', res.status, text);
      return NextResponse.json(
        { error: 'Failed to generate transcription token', detail: text },
        { status: 500 }
      );
    }

    const { token } = await res.json();
    return NextResponse.json({ token });
  } catch (err) {
    console.error('AssemblyAI v3 token error:', err);
    return NextResponse.json(
      { error: 'Transcription service unavailable' },
      { status: 500 }
    );
  }
}
