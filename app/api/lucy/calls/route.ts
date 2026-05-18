import { NextRequest, NextResponse } from 'next/server';

const BOARD_ID = process.env.MONDAY_BOARD_ID ?? '5891626711';
const MONDAY_KEY = process.env.MONDAY_API_KEY ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallRecord {
  id: string;
  name: string;
  updatedAt: string;
  outcome: string;
  notes: string;
  objections: string;
  duration: string;
  callNumber: string;
  profile: string;
  properties: string;
  email: string;
  phone: string;
}

// ─── Status detection ─────────────────────────────────────────────────────────
// These match the statuses that n8n/Retell writes back to Monday after a call.
// Adjust these to match your actual Monday.com column values.

const CALLED_STATUSES = [
  'Lucy Called',
  'Called',
  'No Answer',
  'Voicemail',
  'Callback Requested',
  'Not Interested',
  'Web Meeting Booked',
  'Left Message',
];

function hasBeenCalled(columnValues: Array<{ title: string; text: string }>): boolean {
  return columnValues.some(col => {
    const isStatusCol =
      col.title?.toLowerCase() === 'status' ||
      col.title?.toLowerCase().includes('lucy') ||
      col.title?.toLowerCase().includes('call status');
    if (!isStatusCol) return false;
    return CALLED_STATUSES.some(s =>
      col.text?.toLowerCase().includes(s.toLowerCase())
    );
  });
}

// ─── Column value extractor ───────────────────────────────────────────────────

function getColValue(
  cols: Array<{ title: string; text: string }>,
  ...keywords: string[]
): string {
  for (const keyword of keywords) {
    const col = cols.find(c =>
      c.title?.toLowerCase().includes(keyword.toLowerCase())
    );
    if (col?.text) return col.text;
  }
  return '';
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    if (!MONDAY_KEY) {
      return NextResponse.json(
        { error: 'MONDAY_API_KEY environment variable not configured' },
        { status: 500 }
      );
    }

    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          items_page(limit: 500) {
            items {
              id
              name
              updated_at
              column_values {
                id
                title
                text
                value
              }
            }
          }
        }
      }
    `;

    const res = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: MONDAY_KEY,
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) throw new Error(`Monday.com API error: ${res.status}`);
    const data = await res.json();

    if (data.errors) {
      throw new Error(`Monday.com query error: ${JSON.stringify(data.errors)}`);
    }

    const items: any[] = data.data?.boards?.[0]?.items_page?.items ?? [];

    // Filter to only leads that have been called by Lucy
    const calledItems = items.filter(item =>
      hasBeenCalled(item.column_values ?? [])
    );

    const callRecords: CallRecord[] = calledItems.map(item => {
      const cols: Array<{ title: string; text: string }> = item.column_values ?? [];

      return {
        id: item.id,
        name: item.name,
        updatedAt: item.updated_at,
        outcome: getColValue(cols, 'status', 'lucy status', 'call status', 'outcome'),
        notes: getColValue(cols, 'notes', 'note', 'update', 'lucy notes', 'call notes'),
        objections: getColValue(cols, 'objection', 'concern', 'objections'),
        duration: getColValue(cols, 'duration', 'call duration', 'length'),
        callNumber: getColValue(cols, 'call number', 'calls made', 'attempts', 'call count'),
        profile: getColValue(cols, 'profile', 'lead type', 'type', 'category'),
        properties: getColValue(cols, 'properties', 'property count', 'number of properties'),
        email: getColValue(cols, 'email'),
        phone: getColValue(cols, 'phone', 'mobile', 'telephone'),
      };
    });

    // Sort by most recently updated first
    callRecords.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Build outcome summary
    const outcomeCounts: Record<string, number> = {};
    callRecords.forEach(r => {
      const key = r.outcome || 'Unknown';
      outcomeCounts[key] = (outcomeCounts[key] ?? 0) + 1;
    });

    return NextResponse.json({
      calls: callRecords,
      total: callRecords.length,
      outcomeSummary: outcomeCounts,
      scanned: items.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Lucy/Calls]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch call data' },
      { status: 500 }
    );
  }
}
