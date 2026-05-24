// app/api/calendly/availability/route.ts
// Returns Lucy's three offer slots (Day 1 AM, Day 1 PM, Day 2 anytime) plus a
// voice-ready summary line. Filters to Mon-Fri 09:00-17:00 BST and looks 3
// weeks ahead (Calendly caps each query at 7 days, so we issue 3 calls).
//
// Env: CALENDLY_API_KEY

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CALENDLY_USER_UUID = '4524c498-f081-4a94-b99d-e0122bb33215';
const CALENDLY_USER_URI = `https://api.calendly.com/users/${CALENDLY_USER_UUID}`;

export async function GET(req: NextRequest) {
  const timezone = req.nextUrl.searchParams.get('timezone') || 'Europe/London';
  return handle(timezone);
}

export async function POST(req: NextRequest) {
  let body: { timezone?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional for this endpoint — fall through to defaults.
  }
  const timezone = body.timezone || req.nextUrl.searchParams.get('timezone') || 'Europe/London';
  return handle(timezone);
}

async function handle(timezone: string) {
  const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
  if (!CALENDLY_API_KEY) return NextResponse.json({ error: 'Calendly API key not configured' }, { status: 500 });

  try {
    const eventTypesRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(CALENDLY_USER_URI)}&active=true`,
      { headers: { Authorization: `Bearer ${CALENDLY_API_KEY}`, 'Content-Type': 'application/json' } },
    );
    const eventTypesData = await eventTypesRes.json();

    if (!eventTypesData.collection?.length) {
      return NextResponse.json({ error: 'No active event types found' }, { status: 404 });
    }

    const callEvent =
      eventTypesData.collection.find((e: { slug?: string }) => e.slug === 'call') ||
      eventTypesData.collection.find(
        (e: { name?: string }) =>
          e.name?.toLowerCase().includes('airbnb profitability') ||
          e.name?.toLowerCase().includes('action plan'),
      ) ||
      eventTypesData.collection[0];

    const now = new Date();
    const allSlots: Array<{ start_time: string }> = [];

    for (let i = 0; i < 3; i++) {
      const start = new Date(now);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const availRes = await fetch(
        `https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(callEvent.uri)}&start_time=${start.toISOString()}&end_time=${end.toISOString()}`,
        { headers: { Authorization: `Bearer ${CALENDLY_API_KEY}`, 'Content-Type': 'application/json' } },
      );
      const availData = await availRes.json();
      if (availData.collection?.length) allSlots.push(...availData.collection);
    }

    if (!allSlots.length) {
      return NextResponse.json({
        success: true,
        available_slots: [],
        voice_summary: `I don't have any slots showing in the next three weeks — the best thing is for me to send you a direct booking link so you can pick a time. Could I take your email address?`,
      });
    }

    const filtered = allSlots.filter((slot) => {
      const d = new Date(slot.start_time);
      const hour = d.getUTCHours() + 1; // BST
      const day = d.getUTCDay();
      return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
    });

    if (!filtered.length) {
      return NextResponse.json({
        success: true,
        available_slots: [],
        voice_summary: `I don't have any slots showing right now — let me send you a direct booking link so you can pick a time that works.`,
      });
    }

    const byDate: Record<string, Array<{ start_time: string }>> = {};
    for (const slot of filtered) {
      const d = new Date(slot.start_time);
      const dateKey = d.toLocaleDateString('en-GB', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
      });
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push(slot);
    }

    const dates = Object.keys(byDate).sort((a, b) => {
      const [da, ma, ya] = a.split('/');
      const [db, mb, yb] = b.split('/');
      return new Date(`${ya}-${ma}-${da}`).getTime() - new Date(`${yb}-${mb}-${db}`).getTime();
    });

    const day1Key = dates[0];
    const day1Slots = byDate[day1Key];

    let amSlot: { start_time: string } | null =
      day1Slots.find((s) => {
        const h = new Date(s.start_time).getUTCHours() + 1;
        return h >= 9 && h < 12;
      }) || null;
    let pmSlot: { start_time: string } | null =
      day1Slots.find((s) => {
        const h = new Date(s.start_time).getUTCHours() + 1;
        return h >= 12 && h <= 17;
      }) || null;

    if (!amSlot) {
      amSlot = day1Slots[0] || null;
      pmSlot = day1Slots.find((s) => s.start_time !== day1Slots[0]?.start_time) || null;
    }
    if (!pmSlot) {
      amSlot = day1Slots[0] || null;
      pmSlot = day1Slots[1] || null;
    }

    const day2Key = dates[1] || null;
    const day2Slots = day2Key ? byDate[day2Key] : [];
    const day2Date = day2Slots.length ? new Date(day2Slots[0].start_time) : null;

    const fmt = (isoStr: string, includeTime = true) => {
      const d = new Date(isoStr);
      const dayName = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: timezone });
      const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: timezone });
      const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
      return includeTime ? `${dayName} ${date} at ${time}` : `${dayName} ${date}`;
    };

    const offerings: Array<{
      label: string;
      start_time: string;
      display: string;
      anytime?: boolean;
      all_slots?: Array<{ start_time: string; display: string }>;
    }> = [];

    if (amSlot) {
      offerings.push({ label: 'option_1_am', start_time: amSlot.start_time, display: fmt(amSlot.start_time) });
    }
    if (pmSlot) {
      offerings.push({ label: 'option_2_pm', start_time: pmSlot.start_time, display: fmt(pmSlot.start_time) });
    }
    if (day2Date) {
      offerings.push({
        label: 'option_3_following_day',
        start_time: day2Slots[0].start_time,
        display: fmt(day2Date.toISOString(), false),
        anytime: true,
        all_slots: day2Slots.slice(0, 8).map((s) => ({ start_time: s.start_time, display: fmt(s.start_time) })),
      });
    }

    let voiceSummary = '';
    const opt1 = offerings.find((o) => o.label === 'option_1_am');
    const opt2 = offerings.find((o) => o.label === 'option_2_pm');
    const opt3 = offerings.find((o) => o.label === 'option_3_following_day');

    if (opt1 && opt2 && opt3) {
      voiceSummary = `I've got ${opt1.display}, or ${opt2.display} — or if neither of those work, I can get you in anytime on ${opt3.display}. Which would suit you best?`;
    } else if (opt1 && opt2) {
      voiceSummary = `I've got ${opt1.display} or ${opt2.display}. Which works best for you?`;
    } else if (opt1 || opt2) {
      const only = opt1 || opt2;
      voiceSummary = `I've got ${only!.display} available. Does that work for you?`;
    }

    return NextResponse.json({
      success: true,
      event_type: callEvent.name,
      duration_minutes: callEvent.duration,
      timezone,
      available_slots: offerings,
      voice_summary: voiceSummary,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch availability', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
