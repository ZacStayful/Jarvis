import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const BOARD_ID = process.env.MONDAY_BOARD_ID ?? '5891626711';
const MONDAY_KEY = process.env.MONDAY_API_KEY ?? '';

// ─── Monday.com data fetch ────────────────────────────────────────────────────

async function fetchBoardLeads() {
  const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        items_page(limit: 200) {
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

  return data.data?.boards?.[0]?.items_page?.items ?? [];
}

// ─── Claude scoring system prompt ────────────────────────────────────────────

const RECOMMEND_SYSTEM = `You are JARVIS, the AI intelligence engine for Stayful — a UK short-term rental property management company.

Analyse Monday.com lead data to recommend which leads Lucy (Stayful's Retell AI cold-calling agent) should call today.

━━━ LEAD PROFILES — priority order for Lucy ━━━

1. existing-property-stl   — Landlord switching LTL → STR. HIGHEST conversion. Fast and slow path. Key objection: income consistency.
2. existing-stl-management — Already doing STR, wants management. HIGH + FAST. Key objection: local presence / competitor price.
3. portfolio-landlord      — Multiple properties. HIGH across all. Fast path. Experienced buyer, minimal objections.
4. purchasing-stl          — Buying to let short-term. MEDIUM. May have STR mortgage complications.
5. selling-property        — STR as bridge before sale. LOW. Often impatient. Rarely converts.
6. moving-abroad           — Going overseas, wants income. VERY LOW. Residential mortgage usually kills margin. Qualify out early.

━━━ FAST-PATH SIGNALS → prioritise immediately ━━━
- Profile 1, 2, or 3
- Has clear timeline or trigger event
- No mortgage complications noted
- Asks specific revenue questions
- 3–7 days since last contact (optimal re-engagement window)
- Status: "New", "Contacted", "Follow Up"

━━━ DEPRIORITISE / SKIP ━━━
- Status already: Web Meeting Booked, Customer, Disqualified, Not Interested
- Profile 5 or 6
- 5+ call attempts without conversion
- Contacted within last 24h (too fresh)
- No clear property or intent signal

━━━ SCORING RULES ━━━
conversionProbability (integer 0–100):

Profile baseline:
- existing-property-stl:   65–85%
- existing-stl-management: 60–80%
- portfolio-landlord:       55–75%
- purchasing-stl:           35–60%
- selling-property:         10–30%
- moving-abroad:             5–20%

Adjust:
- +10 if 3–7 days since contact (optimal window)
- +8  if fast-path signals present
- +5  if multiple properties
- -10 if >14 days since contact (gone cold)
- -5  if contacted today (too fresh)
- -15 if mortgage complications noted
- -20 if called 4+ times

━━━ OUTPUT FORMAT ━━━
Return ONLY a valid JSON array. No preamble. No explanation. No markdown fences.

[
  {
    "id": "monday_item_id",
    "name": "Lead Full Name",
    "profile": "existing-property-stl",
    "conversionProbability": 74,
    "reason": "Single sentence: specific reason Lucy should call this lead today.",
    "daysSinceContact": 4,
    "properties": 2,
    "status": "Current Monday status text",
    "priority": 1
  }
]

Maximum 8 leads. Sort by conversionProbability descending. Omit any lead that should be skipped.`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  try {
    if (!MONDAY_KEY) {
      return NextResponse.json(
        { error: 'MONDAY_API_KEY environment variable not configured' },
        { status: 500 }
      );
    }

    const rawLeads = await fetchBoardLeads();

    if (rawLeads.length === 0) {
      return NextResponse.json({
        leads: [],
        total: 0,
        message: 'No leads found on board',
        timestamp: new Date().toISOString(),
      });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: RECOMMEND_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Analyse ${rawLeads.length} leads and return the top recommendations for Lucy to call today.\n\nToday's date: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n\nLead data:\n${JSON.stringify(rawLeads, null, 2)}`,
        },
      ],
    });

    const text = response.content
      .filter(c => c.type === 'text')
      .map(c => (c as { type: 'text'; text: string }).text)
      .join('');

    const clean = text.replace(/```json|```/g, '').trim();
    const leads = JSON.parse(clean);

    return NextResponse.json({
      leads,
      total: leads.length,
      scanned: rawLeads.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Lucy/Recommend]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
