// app/api/qualifier/response/route.ts
// Receives individual pre-qualifier answers from the Stayful presentation and
// writes them to Monday in real time. Called on every "Next" press so partial
// data is captured even if the lead abandons the form.
//
// Env: MONDAY_API_KEY

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BOARD_ID = '5891626711';

const FIELD_MAP: Record<string, string> = {
  address: 'text6',
  bedrooms: 'numeric_mm2qm5xw',
  property_type: 'text_mm2qhtqa',
  property_situation: 'text_mm2qwqm8',
  ltl_income: 'text_mm2dsnw7',
  mortgage: 'text_mm26pf4c',
  stl_goal: 'text_mm2qwqxd',
  timeline: 'text5',
};

const PROGRESS_COL = 'text_mm2qmww2';
const COMPLETED_COL = 'date_mm2qryq5';
const RESPONSES_COL = 'long_text_mm2pse8d';

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
    field?: string;
    value?: string | number;
    question_num?: number;
    total_questions?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: CORS_HEADERS });
  }

  const { monday_item_id, field, value, question_num, total_questions } = body;

  if (!monday_item_id || !field || value === undefined) {
    return NextResponse.json(
      { error: 'Missing monday_item_id, field, or value' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const columnId = FIELD_MAP[field];
  if (!columnId) {
    return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400, headers: CORS_HEADERS });
  }

  const today = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const isCompleted = !!(question_num && total_questions && question_num >= total_questions);
  const progressLabel = question_num && total_questions
    ? isCompleted
      ? `✅ Completed all ${total_questions} questions — ${timeStr}`
      : `${question_num} of ${total_questions} answered — ${timeStr}`
    : `In progress — ${timeStr}`;

  const columnValues: Record<string, unknown> = {
    [columnId]: field === 'bedrooms' ? Number(value) || 0 : String(value),
    [PROGRESS_COL]: progressLabel,
  };

  if (isCompleted) {
    columnValues[COMPLETED_COL] = { date: today };
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
            column_values(ids: ["${RESPONSES_COL}"]) { text }
          }
        }`,
        variables: { id: [monday_item_id] },
      }),
    });
    const fetchData = await fetchRes.json();
    const existing: string = fetchData?.data?.items?.[0]?.column_values?.[0]?.text || '';

    const logLine = `[${timeStr}] ${field}: ${value}`;
    columnValues[RESPONSES_COL] = [logLine, existing].filter(Boolean).join('\n');

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

    if (isCompleted) {
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
          variables: {
            itemId: String(monday_item_id),
            body: `✅ Pre-Qualifier Completed — ${timeStr}\nAll ${total_questions} questions answered. Ready to build presentation.`,
          },
        }),
      });
    }

    console.log(`[qualifier] item ${monday_item_id} — ${field}: ${value} (Q${question_num}/${total_questions})`);
    return NextResponse.json({ ok: true, field, progress: progressLabel }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error('[qualifier] error:', err);
    return NextResponse.json({ error: 'Write failed' }, { status: 500, headers: CORS_HEADERS });
  }
}
