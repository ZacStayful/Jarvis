// app/api/email/send/route.ts
// Sends a follow-up email to a lead and logs it as a Monday update.
// Open tracking enabled via Resend tags so the tracking webhook can write
// back to the correct Monday item when the email is opened.
//
// Env: MONDAY_API_KEY, RESEND_API_KEY, (optional) STAYFUL_FROM_EMAIL

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BOARD_ID = '5891626711';
const EMAIL_COLUMN_ID = 'text_mkygb5xx';
const LAST_EMAIL_DATE_COLUMN = 'date_mm1vpqam';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

  let body: { monday_item_id?: string | number; subject?: string; body?: string; trigger?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { monday_item_id, subject, body: emailBody, trigger } = body;

  if (!monday_item_id || !subject || !emailBody) {
    return NextResponse.json(
      { error: 'Missing required fields: monday_item_id, subject, body' },
      { status: 400 },
    );
  }

  // ── 1. Fetch lead email and name from Monday ─────────────────────────────
  let lead: { name: string; email: string | null; monday_item_id: string };
  try {
    const query = `
      query GetLead($itemId: [ID!]!) {
        items(ids: $itemId) {
          id
          name
          column_values {
            id
            text
          }
        }
      }
    `;

    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({ query, variables: { itemId: [monday_item_id] } }),
    });

    const mondayData = await mondayRes.json();
    if (mondayData.errors || !mondayData.data?.items?.length) {
      return NextResponse.json({ error: 'Lead not found in Monday' }, { status: 404 });
    }

    const item = mondayData.data.items[0];
    const cols: Record<string, string> = {};
    for (const col of item.column_values) cols[col.id] = col.text;

    lead = {
      name: item.name,
      email: cols[EMAIL_COLUMN_ID] || null,
      monday_item_id: item.id,
    };
  } catch (err) {
    console.error('[email/send] Monday fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch lead from Monday' }, { status: 500 });
  }

  if (!lead.email) {
    return NextResponse.json(
      { error: 'No email address found for this lead in Monday', lead_name: lead.name },
      { status: 400 },
    );
  }

  // ── 2. Send via Resend ───────────────────────────────────────────────────
  let emailId: string | null = null;
  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.STAYFUL_FROM_EMAIL || 'Lucy at Stayful <lucy@stayful.co.uk>',
        to: [lead.email],
        subject,
        text: emailBody,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1a1a1a; line-height: 1.6;">
            ${emailBody
              .split('\n')
              .filter(Boolean)
              .map((line) => `<p style="margin: 0 0 12px 0;">${line}</p>`)
              .join('')}
          </div>
        `,
        tags: [
          { name: 'monday_item_id', value: String(lead.monday_item_id) },
          { name: 'trigger', value: trigger || 'unknown' },
        ],
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error('[email/send] Resend error:', JSON.stringify(emailData));
      return NextResponse.json({ error: 'Email sending failed', detail: emailData }, { status: emailRes.status });
    }

    emailId = emailData.id;
    console.log(`[email/send] sent to ${lead.email} — Resend ID: ${emailId}`);
  } catch (err) {
    console.error('[email/send] send error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  // ── 3. Log update + stamp Last Email date ────────────────────────────────
  const sentAt = new Date().toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const triggerLabel = (
    {
      end_of_call: 'Post-call follow-up',
      mid_call_request: 'Sent during call (lead requested)',
      follow_up_sequence: '24hr follow-up sequence',
    } as Record<string, string>
  )[trigger || ''] || 'Email';

  const updateBody = `📧 Email Sent — ${sentAt}
Type: ${triggerLabel}
To: ${lead.email}
Subject: ${subject}

---

${emailBody}`;

  try {
    const updateMutation = `
      mutation CreateUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) { id }
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
        variables: { itemId: String(monday_item_id), body: updateBody },
      }),
    });

    const today = new Date().toISOString().split('T')[0];
    const columnMutation = `
      mutation UpdateLastEmail($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(item_id: $itemId, board_id: $boardId, column_values: $columnValues) { id }
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
          itemId: String(monday_item_id),
          boardId: BOARD_ID,
          columnValues: JSON.stringify({ [LAST_EMAIL_DATE_COLUMN]: { date: today } }),
        },
      }),
    });
  } catch (err) {
    console.error('[email/send] Monday logging failed:', err);
    // Don't fail the request — the email was sent successfully.
  }

  return NextResponse.json({
    success: true,
    email_id: emailId,
    sent_to: lead.email,
    lead_name: lead.name,
    subject,
  });
}
