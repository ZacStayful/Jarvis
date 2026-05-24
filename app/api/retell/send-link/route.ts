// app/api/retell/send-link/route.ts
// Called by Lucy mid-call when a lead needs to check their calendar.
// Sends the Calendly booking link via email and appends a note to the Monday
// call summary so the next interaction sees the offer was made.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MONDAY_API_URL = 'https://api.monday.com/v2';
const CALL_SUMMARY_COLUMN = 'text_mm1v16ns';
const BOARD_ID = '5891626711';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

  let body: { lead_name?: string; email?: string; monday_item_id?: string | number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { lead_name, email, monday_item_id } = body;
  if (!email || !monday_item_id) {
    return NextResponse.json({ error: 'Missing required fields: email, monday_item_id' }, { status: 400 });
  }

  try {
    await sendCalendlyEmail(lead_name, email, RESEND_API_KEY);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const note = `[${dateStr}] Lead asked to check calendar. Calendly booking link sent via email.`;
    await appendMondaySummary(monday_item_id, note, MONDAY_API_KEY);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[retell/send-link] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'send-link failed' },
      { status: 500 }
    );
  }
}

async function getMondaySummary(itemId: string | number, token: string): Promise<string> {
  const query = `
    query {
      items(ids: [${itemId}]) {
        column_values(ids: ["${CALL_SUMMARY_COLUMN}"]) {
          text
        }
      }
    }
  `;

  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  return data?.data?.items?.[0]?.column_values?.[0]?.text || '';
}

async function appendMondaySummary(itemId: string | number, newNote: string, token: string) {
  const existing = await getMondaySummary(itemId, token);
  const updated = existing ? `${existing}\n\n${newNote}` : newNote;

  const mutation = `
    mutation {
      change_simple_column_value(
        board_id: ${BOARD_ID},
        item_id: ${itemId},
        column_id: "${CALL_SUMMARY_COLUMN}",
        value: ${JSON.stringify(updated)}
      ) {
        id
      }
    }
  `;

  await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query: mutation }),
  });
}

async function sendCalendlyEmail(leadName: string | undefined, email: string, resendKey: string) {
  const firstName = leadName?.split(' ')[0] || 'there';

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: 'Lucy at Stayful <lucy@stayful.co.uk>',
      to: email,
      subject: 'Your call with Zac — booking link',
      html: `
        <p>Hi ${firstName},</p>

        <p>Great speaking with you. Here's the link to book your call with Zac at a time that works for you:</p>

        <p><a href="https://calendly.com/zac-stayful/call" style="font-weight:bold;">Book your slot here</a></p>

        <p>The call takes around 30 minutes and Zac will walk you through exactly what your property could earn, based on comparable properties in your area.</p>

        <p>Speak soon,<br>Lucy<br>Stayful</p>
      `,
    }),
  });
}
