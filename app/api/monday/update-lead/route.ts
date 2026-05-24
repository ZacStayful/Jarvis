// app/api/monday/update-lead/route.ts
// Full status-mutation helper used by Lucy at the end of every call.
// Writes status, lost reason, callback date, primary address, additional
// properties and a formatted call summary update. Supersedes get-updates;
// both routes coexist for URL compatibility with existing Retell config.
//
// Body actions:
//   - set_future            → status In the future + parse callback_phrase to date
//   - set_abandoned         → status Abandoned + lost_reason + due-to-call +200 days
//   - set_meeting_booked    → status Web meeting booked
//   - set_no_answer         → stamps no-answer date columns
//   - set_no_show_followup  → retry schedule 1/2/3/3 days, escalates to Abandoned at attempt 4

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// UK Bank Holidays 2025-2027 (England & Wales)
const UK_BANK_HOLIDAYS = [
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', '2025-05-26',
  '2025-08-25', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25',
  '2026-08-31', '2026-12-25', '2026-12-28',
  '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31',
  '2027-08-30', '2027-12-27', '2027-12-28',
];

const LOST_REASON_LABELS: Record<string, string> = {
  'long let': 'Decided to long let property',
  'long_let': 'Decided to long let property',
  'decided to sell': 'Decided to sell',
  'selling': 'Decided to sell',
  'sell': 'Decided to sell',
  'setup cost': 'Setup costs too high',
  'setup costs': 'Setup costs too high',
  'too expensive': 'Setup costs too high',
  'local company': 'Want local company',
  'local': 'Want local company',
  'another company': 'Gone with another company',
  'competitor': 'Gone with another company',
  'gone elsewhere': 'Gone with another company',
  'income': 'Income prediction too low',
  'low income': 'Income prediction too low',
  'not enough': 'Income prediction too low',
  'none': 'None',
};

function resolveLostReason(reason?: string): string {
  if (!reason) return 'None';
  const lower = reason.toLowerCase();
  for (const [key, label] of Object.entries(LOST_REASON_LABELS)) {
    if (lower.includes(key)) return label;
  }
  return 'None';
}

function isWorkingDay(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  if (UK_BANK_HOLIDAYS.includes(dateStr)) return false;
  return true;
}

function nextWorkingDay(fromDate: string): string {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  let dateStr = d.toISOString().split('T')[0];
  let attempts = 0;
  while (!isWorkingDay(dateStr) && attempts < 14) {
    d.setDate(d.getDate() + 1);
    dateStr = d.toISOString().split('T')[0];
    attempts++;
  }
  return dateStr;
}

function parseCallbackDate(phrase: string): string {
  const now = new Date();
  const lower = (phrase || '').toLowerCase().trim();

  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  for (let i = 0; i < months.length; i++) {
    if (lower.includes(months[i])) {
      const year = now.getMonth() >= i ? now.getFullYear() + 1 : now.getFullYear();
      const dateStr = `${year}-${String(i + 1).padStart(2, '0')}-01`;
      return isWorkingDay(dateStr) ? dateStr : nextWorkingDay(dateStr);
    }
  }

  const d = new Date(now);
  if (lower.includes('240 days') || lower.includes('240days')) d.setDate(d.getDate() + 240);
  else if (lower.includes('200 days') || lower.includes('200days')) d.setDate(d.getDate() + 200);
  else if (lower.includes('few days') || lower.includes('couple of days')) d.setDate(d.getDate() + 3);
  else if (lower.includes('next week') || lower.includes('week or so')) d.setDate(d.getDate() + 7);
  else if (lower.includes('couple of weeks') || lower.includes('two weeks') || lower.includes('2 weeks'))
    d.setDate(d.getDate() + 14);
  else if (lower.includes('few weeks') || lower.includes('three weeks') || lower.includes('3 weeks'))
    d.setDate(d.getDate() + 21);
  else if (lower.includes('month') && (lower.includes('couple') || lower.includes('two') || lower.includes('2')))
    d.setMonth(d.getMonth() + 2);
  else if (lower.includes('few months') || lower.includes('three months') || lower.includes('3 months'))
    d.setMonth(d.getMonth() + 3);
  else if (lower.includes('6 months') || lower.includes('six months') || lower.includes('half a year'))
    d.setMonth(d.getMonth() + 6);
  else if (lower.includes('month') || lower.includes('4 weeks') || lower.includes('four weeks'))
    d.setMonth(d.getMonth() + 1);
  else d.setMonth(d.getMonth() + 1);

  const dateStr = d.toISOString().split('T')[0];
  return isWorkingDay(dateStr) ? dateStr : nextWorkingDay(dateStr);
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function postItemUpdate(itemId: string | number, body: string, apiKey: string) {
  const mutation = `
    mutation {
      create_update(
        item_id: ${itemId},
        body: ${JSON.stringify(body)}
      ) { id }
    }
  `;
  return fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'API-Version': '2024-01',
    },
    body: JSON.stringify({ query: mutation }),
  });
}

interface UpdateBody {
  item_id?: string | number;
  action?: 'set_future' | 'set_abandoned' | 'set_meeting_booked' | 'set_no_answer' | 'set_no_show_followup';
  callback_phrase?: string;
  lost_reason?: string;
  call_summary?: string;
  keep_in_touch?: boolean;
  primary_address?: string;
  additional_properties?: Array<{ address: string; notes?: string }>;
  attempt_number?: number;
}

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'Monday API key not configured' }, { status: 500 });

  let payload: UpdateBody = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    item_id,
    action,
    callback_phrase,
    lost_reason,
    call_summary,
    keep_in_touch,
    primary_address,
    additional_properties,
    attempt_number,
  } = payload;

  if (!item_id) return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  const today = new Date().toISOString().split('T')[0];

  try {
    let columnValues: Record<string, unknown> = {};
    let callbackDate: string | null = null;
    let responseMessage = '';

    if (action === 'set_future') {
      callbackDate = callback_phrase ? parseCallbackDate(callback_phrase) : addDays(30);
      columnValues = {
        status5: { label: 'In the future' },
        date_mkwts3mz: { date: callbackDate },
        date_mm1vpqam: { date: today },
      };
      responseMessage = `Status set to In the future. Callback scheduled for ${callbackDate}.`;
    } else if (action === 'set_abandoned') {
      callbackDate = addDays(200);
      const resolvedLostReason = resolveLostReason(lost_reason);
      columnValues = {
        status5: { label: 'Abandoned' },
        date_mkwts3mz: { date: callbackDate },
        date_mm1vpqam: { date: today },
        color_mm1v2s3m: { label: resolvedLostReason },
      };
      responseMessage = `Status set to Abandoned. Lost reason: ${resolvedLostReason}. Due to call set to ${callbackDate}.`;
    } else if (action === 'set_no_answer') {
      columnValues = {
        date_mm0fv708: { date: today },
        date6: { date: today },
        date_mm1jj0vr: { date: today },
      };
      responseMessage = 'No answer columns updated.';
    } else if (action === 'set_meeting_booked') {
      columnValues = {
        status5: { label: 'Web meeting booked' },
        date_mm1vpqam: { date: today },
      };
      responseMessage = 'Status set to Web meeting booked.';
    } else if (action === 'set_no_show_followup') {
      const attempt = attempt_number || 1;

      if (attempt >= 4) {
        callbackDate = addDays(200);
        columnValues = {
          status5: { label: 'Abandoned' },
          date_mkwts3mz: { date: callbackDate },
          date_mm1vpqam: { date: today },
          color_mm1v2s3m: { label: 'None' },
        };
        responseMessage = `No-show followup attempt ${attempt} — max attempts reached. Status set to Abandoned. Due to call: ${callbackDate}.`;
      } else {
        const retryDays = [1, 2, 3, 3];
        const daysUntilNext = retryDays[attempt - 1] || 3;
        callbackDate = addDays(daysUntilNext);
        columnValues = {
          date_mm0fv708: { date: today },
          date_mkwts3mz: { date: callbackDate },
        };
        responseMessage = `No-show followup attempt ${attempt}. Next call: ${callbackDate}.`;
      }
    }

    if (primary_address) {
      columnValues['text6'] = primary_address;
      responseMessage += ` Address updated to: ${primary_address}.`;
    }

    const mutation = `
      mutation {
        change_multiple_column_values(
          board_id: 5891626711,
          item_id: ${item_id},
          column_values: ${JSON.stringify(JSON.stringify(columnValues))}
        ) { id }
      }
    `;

    const mutRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_API_KEY,
        'API-Version': '2024-01',
      },
      body: JSON.stringify({ query: mutation }),
    });

    const mutData = await mutRes.json();
    if (mutData.errors) {
      return NextResponse.json(
        { error: 'Monday column update failed', details: mutData.errors },
        { status: 500 },
      );
    }

    if (action === 'set_no_show_followup' && attempt_number) {
      const attemptTag = `**🔁 No-Show Followup Attempt ${attempt_number} — ${today}**`;
      const attemptBody = call_summary
        ? `${attemptTag}\n\n${call_summary}`
        : `${attemptTag}\n\nCall attempted — no answer.`;
      await postItemUpdate(item_id, attemptBody, MONDAY_API_KEY);
    }

    if (call_summary && action !== 'set_no_show_followup') {
      const keepInTouchNote = keep_in_touch === true
        ? '\n✅ Lead agreed to keep in touch.'
        : keep_in_touch === false
          ? '\n❌ Lead did not want to keep in touch.'
          : '';

      const addressNote = primary_address
        ? `\n📍 Primary address updated to: ${primary_address}`
        : '';

      const summaryBody = `**Call Summary — ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })}**\n\n${call_summary}${keepInTouchNote}${addressNote}${callbackDate ? `\n\n📅 Next contact: ${callbackDate}` : ''}`;

      await postItemUpdate(item_id, summaryBody, MONDAY_API_KEY);
    }

    if (additional_properties && additional_properties.length > 0) {
      const propLines = additional_properties
        .map((p, i) => `${i + 1}. ${p.address}${p.notes ? ` — ${p.notes}` : ''}`)
        .join('\n');

      const propertyBody = `**Additional Properties Mentioned — ${new Date().toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })}**\n\nThe lead mentioned the following additional properties during the call:\n\n${propLines}\n\nThese should be reviewed on the next call. Primary property focus: ${primary_address || 'as per Address column'}.`;

      await postItemUpdate(item_id, propertyBody, MONDAY_API_KEY);
    }

    return NextResponse.json({
      success: true,
      action,
      callback_date: callbackDate,
      callback_date_display: callbackDate
        ? new Date(callbackDate).toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })
        : null,
      primary_address_updated: !!primary_address,
      additional_properties_logged: additional_properties?.length || 0,
      lost_reason: action === 'set_abandoned' ? resolveLostReason(lost_reason) : null,
      message: responseMessage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to update lead', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
