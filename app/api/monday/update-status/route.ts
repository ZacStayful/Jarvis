// app/api/monday/update-status/route.ts
// Updates a lead's status and due-to-call date in Monday.com.
// Called by Lucy at the end of purchase-lead calls.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BOARD_ID = '5891626711';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });

  let body: { item_id?: string | number; status_index?: number; days_until_due?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { item_id, status_index, days_until_due } = body;
  if (!item_id || status_index === undefined) {
    return NextResponse.json({ error: 'Missing required fields: item_id and status_index' }, { status: 400 });
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (days_until_due || 0));
  const dueDateStr = dueDate.toISOString().split('T')[0];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: MONDAY_API_KEY,
  };

  try {
    const statusRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `mutation { change_column_value(board_id: ${BOARD_ID}, item_id: ${item_id}, column_id: "status5", value: "{\\"index\\": ${status_index}}") { id } }`,
      }),
    });

    const statusData = await statusRes.json();
    if (statusData.errors) {
      return NextResponse.json({ error: 'Status update failed', details: statusData.errors }, { status: 500 });
    }

    const dateRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: `mutation { change_column_value(board_id: ${BOARD_ID}, item_id: ${item_id}, column_id: "date_mkwts3mz", value: "{\\"date\\": \\"${dueDateStr}\\"}") { id } }`,
      }),
    });

    const dateData = await dateRes.json();
    if (dateData.errors) {
      return NextResponse.json({ error: 'Due date update failed', details: dateData.errors }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      item_id,
      status_index,
      due_date_set: dueDateStr,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'update-status failed' },
      { status: 500 }
    );
  }
}
