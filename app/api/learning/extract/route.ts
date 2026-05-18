/**
 * POST /api/learning/extract
 *
 * Accepts today's formatted transcript, passes it to Claude Opus,
 * and returns a structured JSON object of extracted learnings.
 */

import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = 'claude-opus-4-5'; // Opus for deep analysis

const SYSTEM_PROMPT = `You are JARVIS's learning extraction engine. Your sole purpose is to analyse a day's conversation between JARVIS and Zac (founder of Stayful, a short-term rental property management company), and extract strategically valuable learnings.

ABOUT ZAC & STAYFUL:
- Zac runs Stayful, a short-term rental (STR) property management company in Sheffield, UK
- He manages a sales pipeline of landlord leads via a system called Lucy (AI cold-calling agent)
- He holds an investment portfolio (stocks and property)
- He uses JARVIS to run his business, get news briefings, manage leads, and advise on investments
- His sales framework: VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION
- His property strategy: BRRR (Buy, Refurbish, Rent, Refinance)

YOUR TASK:
Extract ONLY genuinely strategic, high-value information. Be ruthless about what is noise.

IGNORE completely:
- Routine status checks ("what's on my calendar")
- Technical troubleshooting or error messages
- Simple factual lookups with no strategic implication
- Pleasantries and conversation filler
- Information that is already widely known or obvious
- Actions that were discussed but have no strategic learning

EXTRACT with CONFIDENCE = "confident" when:
- A clear business decision was made
- A new pattern was identified (leads, objections, market, competitor)
- A strategy was refined or changed
- A specific investment thesis was updated
- An action item with clear strategic importance emerged
- A significant piece of news was discussed with Stayful/portfolio implications
- A new insight about lead conversion, objection handling, or profile typing emerged

EXTRACT with CONFIDENCE = "uncertain" when:
- The information might be valuable but you're not sure it's signal vs noise
- An observation was made that could be worth tracking but wasn't confirmed as important
- A topic was touched on briefly without resolution

Return ONLY valid JSON. No preamble, no markdown fences, no explanation. Exactly this structure:

{
  "stayfulInsights": [{"content": "string", "confidence": "confident" | "uncertain"}],
  "investmentUpdates": [{"content": "string", "confidence": "confident" | "uncertain"}],
  "newsImpact": [{"content": "string", "confidence": "confident" | "uncertain"}],
  "leadKnowledge": [{"content": "string", "confidence": "confident" | "uncertain"}],
  "actionItems": [{"content": "string", "confidence": "confident" | "uncertain"}],
  "patternsDetected": [{"content": "string", "confidence": "confident" | "uncertain"}]
}

Empty arrays are correct for categories with nothing to report. Do not fabricate learnings.`;

export async function POST(req: NextRequest) {
  try {
    const { transcript, date } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Missing transcript' }, { status: 400 });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const userPrompt = `Today's date: ${date}

FULL CONVERSATION TRANSCRIPT:
─────────────────────────────
${transcript}
─────────────────────────────

Extract all strategically valuable learnings from this transcript. Return only the JSON object.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[JARVIS] Anthropic API error:', errBody);
      return NextResponse.json(
        { error: `Anthropic API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text ?? '';

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let learnings;
    try {
      learnings = JSON.parse(cleaned);
    } catch {
      console.error('[JARVIS] Failed to parse extraction output:', rawText);
      return NextResponse.json(
        { error: 'Failed to parse learnings from Claude response', raw: rawText },
        { status: 500 }
      );
    }

    // Validate structure
    const categories = [
      'stayfulInsights',
      'investmentUpdates',
      'newsImpact',
      'leadKnowledge',
      'actionItems',
      'patternsDetected',
    ];
    for (const cat of categories) {
      if (!Array.isArray(learnings[cat])) {
        learnings[cat] = [];
      }
    }

    // Count totals for logging
    const total = categories.reduce(
      (sum, cat) => sum + (learnings[cat] as unknown[]).length,
      0
    );
    const uncertain = categories.reduce(
      (sum, cat) =>
        sum +
        (learnings[cat] as { confidence: string }[]).filter(
          i => i.confidence === 'uncertain'
        ).length,
      0
    );

    console.log(
      `[JARVIS] Extraction complete: ${total} learnings (${uncertain} uncertain) for ${date}`
    );

    return NextResponse.json({ learnings, meta: { total, uncertain, date } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[JARVIS] Learning extraction error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
