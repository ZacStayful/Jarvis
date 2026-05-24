// app/api/presentation/sync/route.ts
// Receives slide question responses from the Stayful pre-qualifier presentation.
// Called by sfSync() in the presentation JS on every answer — so responses
// land in Monday incrementally even if the lead abandons halfway through.
//
// Env: MONDAY_API_KEY

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BOARD_ID = '5891626711';
const RESPONSES_COL = 'long_text_mm2pse8d';
const SLIDE_PROGRESS_COL = 'text_mm2pfnft';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  if (!MONDAY_API_KEY) {
    return NextResponse.json(
      { error: 'MONDAY_API_KEY not configured' },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  let body: {
    item_id?: string | number;
    lead_name?: string;
    address?: string;
    responses?: Record<string, string>;
    formatted?: string;
    timestamp?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
  }

  const { item_id, lead_name, responses, formatted, timestamp } = body;

  if (!item_id || !responses) {
    return NextResponse.json(
      { error: 'Missing item_id or responses' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const answeredCount = Object.keys(responses).length;
  const timeStr = new Date(timestamp || Date.now()).toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const progressLabel = `${answeredCount} of 9 questions answered — ${timeStr}`;

  try {
    await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({
        query: `mutation ($itemId: ID!, $boardId: ID!, $values: JSON!) {
          change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $values) { id }
        }`,
        variables: {
          itemId: String(item_id),
          boardId: BOARD_ID,
          values: JSON.stringify({
            [RESPONSES_COL]: formatted || JSON.stringify(responses),
            [SLIDE_PROGRESS_COL]: progressLabel,
          }),
        },
      }),
    });

    console.log(`[presentation/sync] item ${item_id} (${lead_name}) — ${answeredCount} responses written`);
    return NextResponse.json({ ok: true, answers_written: answeredCount }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error('[presentation/sync] error:', err);
    return NextResponse.json({ error: 'Monday write failed' }, { status: 500, headers: CORS_HEADERS });
  }
}
