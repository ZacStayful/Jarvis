// app/api/tracking/presentation/route.ts
// Receives tracking events fired from Stayful presentation pages.
// Updates Monday columns in real time as the lead navigates slides.
//
// Events:
//   viewed         → stamps Presentation Viewed + logs first open
//   slide_viewed   → updates slide progress (no item update post — too noisy)
//   completed      → marks completion + posts an item update

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BOARD_ID = '5891626711';
const PRESENTATION_VIEWED_COL = 'date_mm2qppyp';
const SLIDE_PROGRESS_COL = 'text_mm2pfnft';
const PRESENTATION_RESPONSES_COL = 'long_text_mm2pse8d';

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
    monday_item_id?: string | number;
    event?: 'viewed' | 'slide_viewed' | 'completed';
    slide?: number;
    total?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
  }

  const { monday_item_id, event, slide, total } = body;

  if (!monday_item_id || !event) {
    return NextResponse.json(
      { error: 'Missing monday_item_id or event' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const slideNum = typeof slide === 'number' ? slide + 1 : null;
  const columnValues: Record<string, unknown> = {};
  let logLine = '';
  let updateText: string | null = null;

  if (event === 'viewed') {
    columnValues[PRESENTATION_VIEWED_COL] = { date: today };
    columnValues[SLIDE_PROGRESS_COL] = `Slide 1 / ${total || '?'} — opened ${timeStr}`;
    logLine = `👁 Presentation opened — ${timeStr}`;
    updateText = `👁 Presentation Opened — ${timeStr}\nSlide 1 of ${total || '?'}`;
  } else if (event === 'slide_viewed') {
    const progressLabel = slideNum === total
      ? `✅ Completed — ${timeStr}`
      : `Slide ${slideNum} / ${total} — last active ${timeStr}`;
    columnValues[SLIDE_PROGRESS_COL] = progressLabel;
    logLine = `→ Slide ${slideNum} / ${total} — ${timeStr}`;
  } else if (event === 'completed') {
    columnValues[SLIDE_PROGRESS_COL] = `✅ Completed all ${total} slides — ${timeStr}`;
    logLine = `✅ Presentation completed — ${timeStr}`;
    updateText = `✅ Presentation Completed — ${timeStr}\nLead viewed all ${total} slides.`;
  }

  try {
    const fetchRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({
        query: `query ($id: [ID!]!) {
          items(ids: $id) {
            column_values(ids: ["${PRESENTATION_RESPONSES_COL}"]) { text }
          }
        }`,
        variables: { id: [monday_item_id] },
      }),
    });

    const fetchData = await fetchRes.json();
    const existing: string = fetchData?.data?.items?.[0]?.column_values?.[0]?.text || '';
    const newLog = logLine ? [logLine, existing].filter(Boolean).join('\n') : existing;

    if (logLine) {
      columnValues[PRESENTATION_RESPONSES_COL] = newLog;
    }

    if (Object.keys(columnValues).length > 0) {
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
            itemId: String(monday_item_id),
            boardId: BOARD_ID,
            values: JSON.stringify(columnValues),
          },
        }),
      });
    }

    if (updateText) {
      await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: MONDAY_API_KEY,
          'API-Version': '2024-01',
        },
        body: JSON.stringify({
          query: `mutation ($itemId: ID!, $body: String!) {
            create_update(item_id: $itemId, body: $body) { id }
          }`,
          variables: { itemId: String(monday_item_id), body: updateText },
        }),
      });
    }

    console.log(`[presentation-track] item ${monday_item_id} — ${event} — slide ${slideNum}/${total}`);
    return NextResponse.json({ ok: true, event, slide: slideNum }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error('[presentation-track] error:', err);
    return NextResponse.json({ error: 'Tracking write failed' }, { status: 500, headers: CORS_HEADERS });
  }
}
