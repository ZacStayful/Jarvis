// app/api/monday/lead/route.ts
// Fetches full lead context for Lucy at the start of every call.
// Includes previous communications, email open status, and property details.
//
// GET or POST with ?item_id=12345678 or { "item_id": "12345678" }

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BOARD_ID = '5891626711';

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('item_id');
  return handle(itemId);
}

export async function POST(req: NextRequest) {
  let body: { item_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const itemId = body.item_id || req.nextUrl.searchParams.get('item_id');
  return handle(itemId);
}

async function handle(itemId: string | null) {
  if (!itemId) {
    return NextResponse.json({ error: 'Missing item_id parameter' }, { status: 400 });
  }

  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  if (!MONDAY_API_KEY) return NextResponse.json({ error: 'MONDAY_API_KEY not configured' }, { status: 500 });

  try {
    const query = `
      query GetLeadWithHistory($itemId: [ID!]!) {
        items(ids: $itemId) {
          id
          name
          group { id title }
          board { id name }
          column_values { id text value }
          updates(limit: 5) {
            id
            body
            created_at
            creator { name }
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
      body: JSON.stringify({ query, variables: { itemId: [itemId] } }),
    });

    const data = await mondayRes.json();

    if (data.errors || !data.data?.items?.length) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const item = data.data.items[0];
    const cols: Record<string, string> = {};
    for (const col of item.column_values) {
      cols[col.id] = col.text;
    }

    const previousCommunications = (item.updates || []).map(
      (update: { body?: string; created_at?: string }) => {
        const body = update.body || '';
        const createdAt = new Date(update.created_at || Date.now()).toLocaleString('en-GB', {
          timeZone: 'Europe/London',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        let type: 'call' | 'email' | 'whatsapp' | 'email_opened' | 'note' = 'note';
        if (body.startsWith('📞')) type = 'call';
        if (body.startsWith('📧')) type = 'email';
        if (body.startsWith('💬')) type = 'whatsapp';
        if (body.startsWith('📬')) type = 'email_opened';

        const summaryRaw = body.split('---')[0].trim();
        const summary = summaryRaw.length > 400 ? summaryRaw.substring(0, 400) + '...' : summaryRaw;

        let emailContent: string | null = null;
        if (type === 'email') {
          const parts = body.split('---');
          if (parts.length > 1) emailContent = parts[1]?.trim() || null;
        }

        return {
          type,
          date: createdAt,
          summary,
          email_content: emailContent || undefined,
        };
      }
    );

    const emailOpened = cols['boolean_mm20x8nz'] === 'true' || cols['boolean_mm20x8nz'] === 'v';
    const emailOpenedAt = cols['date_mm208xzd'] || null;

    let communicationContext = 'No previous contact recorded.';
    if (previousCommunications.length > 0) {
      const lines = previousCommunications.map(
        (c: { type: string; date: string; summary: string; email_content?: string }, i: number) => {
          if (c.type === 'email_opened') return `${i + 1}. ${c.summary}`;
          if (c.type === 'call') return `${i + 1}. Call on ${c.date}: ${c.summary}`;
          if (c.type === 'email')
            return `${i + 1}. Email sent on ${c.date}: ${c.summary}${
              c.email_content ? `\n   Content: "${c.email_content.substring(0, 200)}..."` : ''
            }`;
          return `${i + 1}. ${c.type} on ${c.date}: ${c.summary}`;
        }
      );
      communicationContext = lines.join('\n');
    }

    const lead = {
      item_id: item.id,
      name: item.name,
      group: item.group?.title || null,
      board: item.board?.name || null,

      address: cols['text6'] || null,
      email: cols['text_mkygb5xx'] || null,
      phone: cols['phone_mm1hp0a8'] || null,

      lead_profile: cols['dropdown_mm0wabga'] || null,
      status: cols['status5'] || null,
      estimated_airbnb_rent: cols['numbers_mkn25e0y'] || null,
      description: cols['text5'] || null,
      special_offer: cols['text_mm1v16ns'] || null,
      stayful_analyser_info: cols['text_mm1ymftc'] || null,
      lost_reason: cols['color_mm1v2s3m'] || null,

      last_phoned_no_answer: cols['date_mkwts3mz'] || null,
      last_phoned_answered: cols['date_mm1jj0vr'] || null,
      last_email: cols['date_mm1vpqam'] || null,
      last_text: cols['date_mm1nmb17'] || null,
      due_to_call: cols['date6'] || null,
      date_added: cols['date'] || null,

      email_opened: emailOpened,
      email_opened_at: emailOpenedAt,

      previous_communications: previousCommunications,
      last_communication: previousCommunications.length > 0 ? previousCommunications[0] : null,
      communication_context: communicationContext,
    };

    return NextResponse.json({ success: true, lead, board_id: BOARD_ID });
  } catch (err) {
    console.error('[monday/lead] fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch lead data' }, { status: 500 });
  }
}
