// app/api/email/zac-send/route.ts
// Sends a tracked email from Zac directly to a lead.
// Completely separate from Lucy's email system.
//
// Env: MONDAY_API_KEY, RESEND_API_KEY, (optional) ZAC_FROM_EMAIL

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BOARD_ID = '5891626711';
const EMAIL_COLUMN_ID = 'text_mkygb5xx';
const EMAIL_SENT_COLUMN = 'date_mm2q9b8g';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

  let body: { monday_item_id?: string | number; subject?: string; body?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { monday_item_id, subject, body: emailBody } = body;
  if (!monday_item_id || !subject || !emailBody) {
    return NextResponse.json(
      { error: 'Missing required fields: monday_item_id, subject, body' },
      { status: 400 },
    );
  }

  // ── 1. Fetch lead from Monday ────────────────────────────────────────────
  let lead: { id: string; name: string; email: string | null };
  try {
    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({
        query: `query ($id: [ID!]!) {
          items(ids: $id) {
            id
            name
            column_values {
              id
              text
            }
          }
        }`,
        variables: { id: [monday_item_id] },
      }),
    });

    const mondayData = await mondayRes.json();
    if (mondayData.errors || !mondayData.data?.items?.length) {
      return NextResponse.json({ error: 'Lead not found in Monday' }, { status: 404 });
    }

    const item = mondayData.data.items[0];
    const cols: Record<string, string> = {};
    for (const col of item.column_values) cols[col.id] = col.text;

    lead = {
      id: item.id,
      name: item.name,
      email: cols[EMAIL_COLUMN_ID] || null,
    };
  } catch (err) {
    console.error('[zac-send] Monday fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch lead from Monday' }, { status: 500 });
  }

  if (!lead.email) {
    return NextResponse.json(
      { error: 'No email address on file for this lead', lead_name: lead.name },
      { status: 400 },
    );
  }

  // ── 2. Send via Resend ───────────────────────────────────────────────────
  const fromAddress = process.env.ZAC_FROM_EMAIL
    ? `Zac at Stayful <${process.env.ZAC_FROM_EMAIL}>`
    : 'Zac at Stayful <zac@stayful.co.uk>';

  let emailId: string | undefined;
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [lead.email],
        subject,
        text: emailBody,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;color:#1a1a1a;line-height:1.6;">
            ${emailBody
              .split('\n')
              .filter(Boolean)
              .map((line) => `<p style="margin:0 0 12px 0;">${line}</p>`)
              .join('')}
          </div>
        `,
        tags: [
          { name: 'monday_item_id', value: String(lead.id) },
          { name: 'trigger', value: 'zac_manual' },
        ],
      }),
    });

    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error('[zac-send] Resend error:', JSON.stringify(emailData));
      return NextResponse.json({ error: 'Email send failed', detail: emailData }, { status: emailRes.status });
    }

    emailId = emailData.id;
    console.log(`[zac-send] Sent to ${lead.email} — Resend ID: ${emailId}`);
  } catch (err) {
    console.error('[zac-send] send error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  // ── 3. Log update + stamp date ───────────────────────────────────────────
  const sentAt = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const updateText = `📧 Email from Zac — ${sentAt}\nTo: ${lead.email}\nSubject: ${subject}\n\n---\n\n${emailBody}`;

  try {
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

    const today = new Date().toISOString().split('T')[0];
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
          values: JSON.stringify({ [EMAIL_SENT_COLUMN]: { date: today } }),
        },
      }),
    });
  } catch (err) {
    console.error('[zac-send] Monday write error:', err);
  }

  return NextResponse.json({
    success: true,
    email_id: emailId,
    sent_to: lead.email,
    lead_name: lead.name,
  });
}
