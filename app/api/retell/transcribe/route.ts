// app/api/retell/transcribe/route.ts
// AssemblyAI transcription callback for call recordings.
// AssemblyAI POSTs back with a transcript_id + status; we fetch the
// completed transcript, format it with speaker labels, and post it as a
// Monday item update.
//
// URL: /api/retell/transcribe?itemId=12345678
// Body: { transcript_id: string, status: 'completed' | 'error' | 'queued' | 'processing' }

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const ASSEMBLYAI_KEY = process.env.ASSEMBLYAI_API_KEY;

  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });
  if (!ASSEMBLYAI_KEY) return NextResponse.json({ error: 'ASSEMBLYAI_API_KEY not configured' }, { status: 500 });

  const itemId = req.nextUrl.searchParams.get('itemId');
  if (!itemId) {
    return NextResponse.json({ error: 'itemId query parameter is required' }, { status: 400 });
  }

  let body: { transcript_id?: string; status?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { transcript_id, status } = body;
  if (!transcript_id) {
    return NextResponse.json({ error: 'transcript_id is required' }, { status: 400 });
  }

  if (status === 'error') {
    console.error(`[retell/transcribe] Transcription failed for item ${itemId}, transcript_id: ${transcript_id}`);
    await postMondayUpdate(
      itemId,
      '⚠️ Transcription failed — please re-upload the recording or check AssemblyAI.',
      MONDAY_API_KEY,
    );
    return NextResponse.json({ received: true });
  }

  if (status !== 'completed') {
    return NextResponse.json({ received: true, status });
  }

  try {
    const transcriptResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcript_id}`, {
      headers: { Authorization: ASSEMBLYAI_KEY },
    });

    const transcript = await transcriptResponse.json();

    if (!transcriptResponse.ok || transcript.status !== 'completed') {
      console.error('[retell/transcribe] AssemblyAI fetch error:', transcript);
      return NextResponse.json({ error: 'Failed to fetch transcript from AssemblyAI' }, { status: 500 });
    }

    const formatted = formatTranscript(transcript);
    await postMondayUpdate(itemId, formatted, MONDAY_API_KEY);

    console.log(`[retell/transcribe] Transcript posted to Monday item ${itemId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[retell/transcribe] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Transcript callback failed' },
      { status: 500 }
    );
  }
}

function formatTranscript(transcript: {
  utterances?: Array<{ speaker?: string; text?: string }>;
  text?: string;
}): string {
  const utterances = transcript.utterances || [];
  const lines = ['**Call Recording Transcript**', ''];

  if (utterances.length > 0) {
    for (const u of utterances) {
      const speaker = u.speaker === 'A' ? '**Stayful Agent:**' : '**Lead:**';
      lines.push(`${speaker} ${u.text}`);
      lines.push('');
    }
  } else {
    lines.push(transcript.text || 'No transcript text available.');
    lines.push('');
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { dateStyle: 'long' });
  const timeStr = now.toLocaleTimeString('en-GB', { timeStyle: 'short' });

  lines.push('---');
  lines.push(`*Transcribed: ${dateStr} at ${timeStr}*`);

  return lines.join('\n');
}

async function postMondayUpdate(itemId: string, body: string, token: string) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({
      query: `mutation { create_update(item_id: ${itemId}, body: ${JSON.stringify(body)}) { id } }`,
    }),
  });
  return response.json();
}
