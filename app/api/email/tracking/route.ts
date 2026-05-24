// app/api/email/tracking/route.ts
// Receives Resend webhook events for email opens.
// When a lead opens an email, this endpoint:
//   1. Extracts the monday_item_id from the email's tags
//   2. Checks the "Email Opened" boolean on the Monday item
//   3. Stamps the "Email Opened At" date column
//   4. Posts an update note on the item so Lucy sees it on the next call

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BOARD_ID = '5891626711';
const EMAIL_OPENED_COLUMN = 'boolean_mm20x8nz';
const EMAIL_OPENED_AT_COLUMN = 'date_mm208xzd';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (event?.type !== 'email.opened') {
    return NextResponse.json({ skipped: true, event: event?.type });
  }

  const emailData = event.data;
  if (!emailData) {
    return NextResponse.json({ error: 'No email data in webhook payload' }, { status: 400 });
  }

  let mondayItemId: string | null = null;

  const tags = emailData.tags;
  if (tags) {
    if (Array.isArray(tags)) {
      const tag = tags.find((t: { name?: string }) => t.name === 'monday_item_id') as
        | { value?: string }
        | undefined;
      mondayItemId = tag?.value || null;
    } else if (typeof tags === 'object') {
      mondayItemId = (tags as Record<string, string>).monday_item_id || null;
    }
  }

  if (!mondayItemId) {
    console.warn('[email/tracking] No monday_item_id in email tags. Email ID:', emailData.email_id);
    return NextResponse.json({ skipped: true, reason: 'No monday_item_id tag' });
  }

  const createdAt = (emailData.created_at as string | undefined) || null;
  const openedAt = createdAt ? new Date(createdAt) : new Date();
  const openedDate = openedAt.toISOString().split('T')[0];
  const openedFormatted = openedAt.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  try {
    const columnMutation = `
      mutation UpdateEmailOpened($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          item_id: $itemId,
          board_id: $boardId,
          column_values: $columnValues
        ) {
          id
        }
      }
    `;

    await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({
        query: columnMutation,
        variables: {
          itemId: String(mondayItemId),
          boardId: BOARD_ID,
          columnValues: JSON.stringify({
            [EMAIL_OPENED_COLUMN]: true,
            [EMAIL_OPENED_AT_COLUMN]: { date: openedDate },
          }),
        },
      }),
    });

    const updateMutation = `
      mutation CreateUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `;

    await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({
        query: updateMutation,
        variables: {
          itemId: String(mondayItemId),
          body: `📬 Email Opened — ${openedFormatted}\nThe lead opened the email sent by Lucy. This is a strong intent signal — prioritise follow-up call.`,
        },
      }),
    });

    console.log(`[email/tracking] Opened by lead on Monday item ${mondayItemId} at ${openedFormatted}`);

    return NextResponse.json({
      success: true,
      monday_item_id: mondayItemId,
      opened_at: openedFormatted,
    });
  } catch (err) {
    console.error('[email/tracking] Monday update failed:', err);
    return NextResponse.json({ error: 'Failed to update Monday' }, { status: 500 });
  }
}
