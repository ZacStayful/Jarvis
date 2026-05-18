import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// ─── Deep analysis system prompt ─────────────────────────────────────────────

const ANALYSIS_SYSTEM = `You are JARVIS performing a deep intelligence analysis of Lucy's call data for Stayful, a UK short-term rental property management company.

Your analysis must be rigorous, pattern-driven, and directly actionable. You are producing intelligence that will update Stayful's lead conversion playbook.

━━━ STAYFUL CONTEXT ━━━

LEAD PROFILES (priority order):
1. existing-property-stl   — Highest value. STL income consistency objection.
2. existing-stl-management — High + fast path. Local presence objection.
3. portfolio-landlord       — High + fast. Experienced, minimal objections.
4. purchasing-stl           — Medium. Mortgage complications risk.
5. selling-property         — Low. Impatience-driven.
6. moving-abroad            — Very low. Residential mortgage kills margin.

PRIMARY OBJECTIONS:
- Income consistency → certainty objection. Fix: revenue floor data, not ceiling projections.
- Setup cost → timing objection. Fix: break-even timeline (typically <1 month).

RESPONSE FRAMEWORK: VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION.

FAST-PATH SIGNALS: revenue questions early, clear timeline, no mortgage complications, profile 1–3.
SLOW-PATH SIGNALS: objections repeat after handling, no timeline, residential mortgage, profiles 5–6.

PERFORMANCE TARGETS:
- Conversion to web meeting: >50%
- Web meeting close rate: >15%
- Avg calls to convert (fast path): 1–2
- Avg calls to convert (slow path): should be <5 before qualifying out

━━━ OUTPUT FORMAT ━━━

Return ONLY valid JSON. No preamble. No markdown fences.

{
  "summary": {
    "totalCalls": 0,
    "conversions": 0,
    "conversionRate": 0.0,
    "avgCallsToConvert": 0.0,
    "topOutcome": "string",
    "periodInsight": "One sentence describing the overall pattern in this batch."
  },
  "profilePerformance": [
    {
      "profile": "existing-property-stl",
      "calls": 0,
      "conversions": 0,
      "conversionRate": 0.0,
      "avgCallsNeeded": 0.0,
      "recommendation": "One specific recommendation for this profile."
    }
  ],
  "objectionPatterns": [
    {
      "objection": "Short name for this objection",
      "frequency": 0,
      "resolvedRate": 0.0,
      "bestResponse": "What worked when this was resolved."
    }
  ],
  "fastPathSignals": ["Signal observed in leads that converted quickly"],
  "slowPathSignals": ["Signal observed in leads that cycled without converting"],
  "playbookRecommendations": [
    {
      "priority": 1,
      "recommendation": "Specific, concrete, actionable recommendation.",
      "impact": "Expected outcome if adopted.",
      "category": "qualification|objection|timing|profile|script"
    }
  ],
  "intelligenceUpdates": [
    {
      "category": "Lead Profile|Objection Handler|Conversion Pattern|Timing Intelligence|Disqualification Signal",
      "finding": "Specific new intelligence from this call batch.",
      "confidence": "high|medium|low",
      "obsidianPath": "Lead Intelligence/Patterns/[suggested-filename].md"
    }
  ]
}`;

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { calls } = body;

    if (!calls || !Array.isArray(calls)) {
      return NextResponse.json(
        { error: 'Request body must include a "calls" array' },
        { status: 400 }
      );
    }

    if (calls.length === 0) {
      return NextResponse.json(
        { error: 'No call records provided for analysis' },
        { status: 400 }
      );
    }

    // Use Opus for deep analysis — this is a strategic intelligence task
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: ANALYSIS_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Perform deep intelligence analysis on ${calls.length} Lucy call records. Extract all patterns, profile performance data, objection intelligence, and playbook recommendations.\n\nAnalysis date: ${new Date().toLocaleDateString('en-GB')}\n\nCall data:\n${JSON.stringify(calls, null, 2)}`,
        },
      ],
    });

    const text = response.content
      .filter(c => c.type === 'text')
      .map(c => (c as { type: 'text'; text: string }).text)
      .join('');

    const clean = text.replace(/```json|```/g, '').trim();

    let analysis;
    try {
      analysis = JSON.parse(clean);
    } catch {
      // If Claude wrapped anything, attempt extraction
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Failed to parse analysis response');
      analysis = JSON.parse(jsonMatch[0]);
    }

    return NextResponse.json({
      analysis,
      callsAnalysed: calls.length,
      model: 'claude-opus-4-6',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Lucy/Analyse]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to analyse call data' },
      { status: 500 }
    );
  }
}
