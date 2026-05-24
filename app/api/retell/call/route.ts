// app/api/retell/call/route.ts
// Creates an outbound Retell call for a given Monday.com lead item.
// Fetches lead name, phone, address, profile, prior call summary, last-answered
// date and any "Web Meeting Summary" from Monday, then passes them to Lucy as
// dynamic variables so she can open the conversation with the right context.
//
// POST body: { "monday_item_id": "12345678" }
//
// Env: MONDAY_API_KEY, RETELL_API_KEY, RETELL_FROM_NUMBER, (optional) RETELL_AGENT_ID

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const DEFAULT_AGENT_ID = 'agent_82f187b32e8f5e7913da1c506f';

export async function POST(req: NextRequest) {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const RETELL_API_KEY = process.env.RETELL_API_KEY;
  const RETELL_FROM_NUMBER = process.env.RETELL_FROM_NUMBER;
  const AGENT_ID = process.env.RETELL_AGENT_ID || DEFAULT_AGENT_ID;

  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });
  if (!RETELL_API_KEY) return NextResponse.json({ error: 'RETELL_API_KEY not configured' }, { status: 500 });
  if (!RETELL_FROM_NUMBER) return NextResponse.json({ error: 'RETELL_FROM_NUMBER not configured' }, { status: 500 });

  let body: { monday_item_id?: string | number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { monday_item_id } = body;
  if (!monday_item_id) {
    return NextResponse.json({ error: 'monday_item_id is required' }, { status: 400 });
  }

  try {
    const leadData = await getMondayLeadData(monday_item_id, MONDAY_API_KEY);
    const { name, phone, address, lead_profile, call_summary, last_phoned_answered, web_meeting_summary } = leadData;

    if (!phone) {
      return NextResponse.json({ error: 'No phone number found for this lead' }, { status: 400 });
    }

    const lastCallDate = formatDateForSpeech(last_phoned_answered);

    const retellResponse = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        from_number: RETELL_FROM_NUMBER,
        to_number: `+${phone.replace(/\D/g, '')}`,
        retell_llm_dynamic_variables: {
          monday_item_id: String(monday_item_id),
          lead_name: name || '',
          address: address || '',
          lead_profile: lead_profile || '',
          call_summary: call_summary || '',
          last_call_date: lastCallDate || '',
          web_meeting_summary: web_meeting_summary || '',
        },
      }),
    });

    const retellData = await retellResponse.json();

    if (!retellResponse.ok) {
      console.error('[retell/call] Retell API error:', retellData);
      return NextResponse.json({ error: 'Failed to create call', details: retellData }, { status: 500 });
    }

    console.log(`[retell/call] Outbound call created for item ${monday_item_id}, call_id: ${retellData.call_id}`);
    return NextResponse.json({ success: true, call_id: retellData.call_id });
  } catch (err) {
    console.error('[retell/call] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Call creation failed' },
      { status: 500 }
    );
  }
}

// ─── Monday data fetch ────────────────────────────────────────────────────────

async function getMondayLeadData(itemId: string | number, token: string) {
  const query = `
    query {
      items(ids: [${itemId}]) {
        name
        column_values(ids: [
          "phone_mm1hp0a8",
          "text6",
          "text_mm1x8cgy",
          "long_text_mm239abs",
          "date_mm1vpqam"
        ]) {
          id
          text
        }
        updates(limit: 50) {
          text_body
        }
      }
    }
  `;

  const data = await mondayRequest(query, token);
  const item = data?.data?.items?.[0];
  if (!item) throw new Error(`No Monday item found for ID ${itemId}`);

  const colMap: Record<string, string> = {};
  for (const col of item.column_values) {
    colMap[col.id] = col.text || '';
  }

  const updates: Array<{ text_body?: string }> = item.updates || [];
  const webMeetingUpdate = updates.find(
    (u) => u.text_body && u.text_body.trim().toLowerCase().startsWith('web meeting summary')
  );

  return {
    name: item.name,
    phone: colMap['phone_mm1hp0a8'],
    address: colMap['text6'],
    lead_profile: colMap['text_mm1x8cgy'],
    call_summary: colMap['long_text_mm239abs'],
    last_phoned_answered: colMap['date_mm1vpqam'],
    web_meeting_summary: webMeetingUpdate ? webMeetingUpdate.text_body!.trim() : '',
  };
}

async function mondayRequest(query: string, token: string) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

function formatDateForSpeech(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });

  const suffix =
    day === 1 || day === 21 || day === 31 ? 'st' :
    day === 2 || day === 22 ? 'nd' :
    day === 3 || day === 23 ? 'rd' : 'th';

  return `${day}${suffix} ${month}`;
}
