import { NextResponse } from 'next/server';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const TOKEN_URL = 'https://api.assemblyai.com/v2/realtime/token';

export async function GET() {
  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_in: 3600 }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('AssemblyAI token error:', text);
      return NextResponse.json(
        { error: 'Failed to generate transcription token' },
        { status: 500 }
      );
    }

    const { token } = await res.json();
    return NextResponse.json({ token });
  } catch (err) {
    console.error('AssemblyAI token error:', err);
    return NextResponse.json(
      { error: 'Transcription service unavailable' },
      { status: 500 }
    );
  }
}
