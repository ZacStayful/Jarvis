// app/api/calendly/book/route.ts
// Books a Calendly slot directly via create_scheduled_events so the slot is
// confirmed immediately and Lucy's call summary pre-fills Zac's required prep
// question on the booking form.
//
// Env: CALENDLY_API_KEY, (optional) MONDAY_API_KEY

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CALENDLY_USER_UUID = '4524c498-f081-4a94-b99d-e0122bb33215';
const CALENDLY_USER_URI = `https://api.calendly.com/users/${CALENDLY_USER_UUID}`;
const CALENDLY_CUSTOM_QUESTION =
  'Please add in what we have been discussing even if i have been responding and know what this is about, this helps me to prepare for our call';

export async function POST(req: NextRequest) {
  const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;

  if (!CALENDLY_API_KEY) {
    return NextResponse.json({ error: 'Calendly API key not configured' }, { status: 500 });
  }

  let body: {
    start_time?: string;
    lead_name?: string;
    lead_email?: string;
    lead_phone?: string;
    monday_item_id?: string | number;
    call_summary?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { start_time, lead_name, lead_email, lead_phone, monday_item_id, call_summary } = body;

  if (!start_time || !lead_name || !lead_email) {
    return NextResponse.json(
      { error: 'Missing required fields: start_time, lead_name, lead_email' },
      { status: 400 },
    );
  }

  try {
    const eventTypesRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(CALENDLY_USER_URI)}&active=true`,
      { headers: { Authorization: `Bearer ${CALENDLY_API_KEY}`, 'Content-Type': 'application/json' } },
    );

    const eventTypesData = await eventTypesRes.json();
    const callEvent =
      eventTypesData.collection?.find((e: { slug?: string }) => e.slug === 'call') ||
      eventTypesData.collection?.find(
        (e: { name?: string }) =>
          e.name?.toLowerCase().includes('airbnb profitability') ||
          e.name?.toLowerCase().includes('action plan'),
      ) ||
      eventTypesData.collection?.[0];

    if (!callEvent) {
      return NextResponse.json({ error: 'Could not find call event type on Calendly' }, { status: 404 });
    }

    const inviteePayload = {
      event_type: callEvent.uri,
      start_time: new Date(start_time).toISOString(),
      invitee: {
        name: lead_name,
        email: lead_email,
        timezone: 'Europe/London',
        ...(lead_phone && { text_reminder_number: lead_phone }),
      },
      location: { kind: 'google_conference' },
      questions_and_answers: [
        {
          question: CALENDLY_CUSTOM_QUESTION,
          answer: call_summary || `Booked via Lucy AI. Lead: ${lead_name}.`,
          position: 0,
        },
      ],
    };

    const bookingRes = await fetch('https://api.calendly.com/scheduled_events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${CALENDLY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteePayload),
    });

    const bookingData = await bookingRes.json();

    if (!bookingRes.ok) {
      return NextResponse.json({ error: 'Calendly booking failed', details: bookingData }, { status: 500 });
    }

    const confirmedDate = new Date(start_time);
    const displayTime = confirmedDate.toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    });

    if (monday_item_id && MONDAY_API_KEY) {
      const mondayDate = confirmedDate.toISOString().split('T')[0];
      const mutation = `
        mutation {
          change_multiple_column_values(
            board_id: 5891626711,
            item_id: ${monday_item_id},
            column_values: "{\\"status5\\": {\\"label\\": \\"Web meeting booked\\"}, \\"date_mm1vpqam\\": {\\"date\\": \\"${mondayDate}\\"}, \\"date_mm1nmb17\\": {\\"date\\": \\"${mondayDate}\\"}}"
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
        body: JSON.stringify({ query: mutation }),
      });
    }

    return NextResponse.json({
      success: true,
      confirmed_time: start_time,
      confirmed_time_display: displayTime,
      lead_name,
      lead_email,
      lead_phone: lead_phone || null,
      monday_updated: !!monday_item_id,
      voice_confirmation: `Perfect, I've booked that in for ${displayTime}. You'll get a confirmation email with the meeting link shortly. Zac will walk you through a full income projection for your property and some local case studies. It's about 45 minutes and well worth it. Is there anything else you'd like to know before then?`,
    });
  } catch (err) {
    console.error('[calendly/book] error:', err);
    return NextResponse.json(
      { error: 'Failed to create booking', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
