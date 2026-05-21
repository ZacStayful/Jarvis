// ─────────────────────────────────────────────────────────────────────────────
// POST /api/news/voice-summary
// Takes a list of analysed NewsArticles (optionally filtered by category)
// and returns a short JARVIS-voice summary. Used by app/page.tsx after the
// briefing finishes loading, and again whenever the user asks to focus on
// a specific category mid-conversation.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCategoryLabel } from '@/lib/newsCategories';

const anthropic = new Anthropic();

const VOICE_SUMMARY_SYSTEM_PROMPT = `You are JARVIS, the voice intelligence briefer for Stayful. You speak with a calm, formal British butler tone — Iron Man's JARVIS, not a marketing voice.

The user has just received their intelligence briefing visually; your job is to summarise it for the ear.

OUTPUT RULES:
- 3 to 5 sentences total. Hard cap 90 words.
- Synthesise the key signal across the stories. DO NOT read headlines or impact text verbatim.
- Identify the biggest theme and what it means for Stayful (a UK short-term-rental hospitality business) in plain language.
- Address the user as "sir" at most once, naturally placed.
- No bullet points, no markdown, no story numbers, no source citations — flowing speech only.
- End cleanly so the user knows you've finished.`;

interface RequestBody {
  articles: Array<{
    headline: string;
    summary?: string;
    stayfulImpact?: string;
    priority?: string;
    category?: string;
  }>;
  category?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const articles = body.articles ?? [];

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ summary: '' });
    }

    const category = body.category ?? null;
    const filtered = category
      ? articles.filter((a) => a.category === category)
      : articles;

    if (filtered.length === 0) {
      const label = category ? getCategoryLabel(category).toLowerCase() : 'priority';
      return NextResponse.json({
        summary: `No ${label} stories in the current briefing, sir.`,
      });
    }

    // Top 5 overall, top 4 when category-filtered (categories are narrower)
    const top = filtered.slice(0, category ? 4 : 5);

    const condensed = top.map((a) => ({
      headline: a.headline,
      summary: a.summary,
      stayfulImpact: a.stayfulImpact,
      priority: a.priority,
    }));

    const userPrompt = category
      ? `Summarise these ${condensed.length} ${getCategoryLabel(category)} stories for voice:\n${JSON.stringify(condensed)}`
      : `Summarise these top ${condensed.length} priority stories for voice:\n${JSON.stringify(condensed)}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: VOICE_SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    return NextResponse.json({ summary: text });
  } catch (err) {
    console.error('voice-summary error', err);
    return NextResponse.json({ summary: '' }, { status: 500 });
  }
}
