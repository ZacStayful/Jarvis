// ─────────────────────────────────────────────────────────────────────────────
// POST /api/news
// Fetches news from NewsAPI, runs Claude Opus deep analysis on each batch,
// detects cross-story patterns, and streams results back as SSE.
//
// SSE event types emitted:
//   { type: 'start', message: string }
//   { type: 'progress', message: string, count?: number }
//   { type: 'article', article: NewsArticle }
//   { type: 'patterns', patterns: NewsPattern[] }
//   { type: 'complete', total: number }
//   { type: 'error', message: string }
//   data: [DONE]
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  NEWS_CATEGORIES,
  ALL_CATEGORY_IDS,
  NewsCategory,
  sortByPriority,
} from '@/lib/newsCategories';
import {
  NEWS_ANALYSIS_SYSTEM_PROMPT,
  NEWS_PATTERN_SYSTEM_PROMPT,
} from '@/lib/intelligencePrompts';

const anthropic = new Anthropic();

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawArticle {
  title: string;
  description: string | null;
  content: string | null;
  url: string;
  source: { name: string };
  publishedAt: string;
  categoryId: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
  priority: 'red' | 'amber' | 'gold' | 'green';
  stayfulImpact: string;
  portfolioImpact: string;
  patternSpotting: string | null;
  actionSteps: string[];
  tags: string[];
}

export interface NewsPattern {
  id: string;
  title: string;
  signal: string;
  stayfulImplication: string;
  confidence: 'high' | 'medium' | 'low';
  timeframe: 'immediate' | 'weeks' | 'months' | 'quarters';
}

// ─── NewsAPI Fetcher ─────────────────────────────────────────────────────────

async function fetchCategoryArticles(
  cat: NewsCategory,
  errors: string[]
): Promise<RawArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  const articles: RawArticle[] = [];

  // Use first query only per category to respect free-tier rate limits
  const query = cat.queries[0];

  try {
    const url = new URL('https://newsapi.org/v2/everything');
    url.searchParams.set('q', query);
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('pageSize', String(cat.pageSize));
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      errors.push(
        `${cat.id}: NewsAPI ${res.status} ${res.statusText} — ${detail.slice(0, 160)}`
      );
      return [];
    }

    const data = await res.json();
    if (!data.articles) return [];

    for (const a of data.articles) {
      // Skip removed articles
      if (!a.title || a.title === '[Removed]') continue;
      articles.push({
        title: a.title,
        description: a.description ?? null,
        content: a.content ?? null,
        url: a.url,
        source: { name: a.source?.name ?? 'Unknown' },
        publishedAt: a.publishedAt,
        categoryId: cat.id,
      });
    }
  } catch (err) {
    errors.push(
      `${cat.id}: ${err instanceof Error ? err.message : 'fetch failed'}`
    );
  }

  return articles;
}

function deduplicateArticles(articles: RawArticle[]): RawArticle[] {
  const seen = new Set<string>();
  return articles.filter(a => {
    const key = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Claude Analysis ─────────────────────────────────────────────────────────

async function analyseArticleBatch(
  batch: RawArticle[],
  offset: number
): Promise<NewsArticle[]> {
  const input = batch.map((a, i) => ({
    id: `article_${offset + i}`,
    title: a.title,
    description: a.description ?? '',
    url: a.url,
    source: a.source.name,
    publishedAt: a.publishedAt,
    category: a.categoryId,
  }));

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    system: NEWS_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(input) }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';

  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) return [];
  return parsed as NewsArticle[];
}

async function detectPatterns(articles: NewsArticle[]): Promise<NewsPattern[]> {
  const condensed = articles.map(a => ({
    headline: a.headline,
    category: a.category,
    priority: a.priority,
    stayfulImpact: a.stayfulImpact,
    portfolioImpact: a.portfolioImpact,
  }));

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: NEWS_PATTERN_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(condensed) }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  const cleaned = text.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) return [];
  return parsed as NewsPattern[];
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { categories = ALL_CATEGORY_IDS } = body as { categories?: string[] };

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            // Client disconnected
          }
        };

        try {
          // Fail fast and loud if NewsAPI isn't configured. Free-tier
          // NewsAPI doesn't permit production server-side calls; you
          // need the paid plan or a different feed source.
          if (!process.env.NEWSAPI_KEY) {
            send({
              type: 'error',
              message:
                'NewsAPI key not configured. Add NEWSAPI_KEY to Vercel environment variables. Note: the free NewsAPI tier blocks server-side requests in production — a paid plan is required.',
            });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          send({ type: 'start', message: 'Accessing intelligence feeds, sir.' });

          // Fetch from NewsAPI in parallel
          const selectedCategories = NEWS_CATEGORIES.filter(c =>
            categories.includes(c.id)
          );

          const fetchErrors: string[] = [];
          const rawBatches = await Promise.all(
            selectedCategories.map(cat => fetchCategoryArticles(cat, fetchErrors))
          );

          const allRaw = deduplicateArticles(rawBatches.flat());

          if (allRaw.length === 0) {
            const detail =
              fetchErrors.length > 0
                ? ` Upstream errors: ${fetchErrors.slice(0, 3).join(' | ')}`
                : '';
            send({
              type: 'error',
              message: `No articles retrieved from NewsAPI.${detail}`,
            });
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          send({
            type: 'progress',
            message: `${allRaw.length} articles sourced. Running intelligence analysis...`,
            count: allRaw.length,
          });

          // Analyse in batches of 8 articles (token budget management)
          const BATCH_SIZE = 8;
          const allAnalysed: NewsArticle[] = [];

          for (let i = 0; i < allRaw.length; i += BATCH_SIZE) {
            const batch = allRaw.slice(i, i + BATCH_SIZE);

            try {
              const analysed = await analyseArticleBatch(batch, i);

              // Sort batch by priority before streaming
              const sorted = sortByPriority(analysed);

              for (const article of sorted) {
                allAnalysed.push(article);
                send({ type: 'article', article });
              }
            } catch (batchErr) {
              send({
                type: 'progress',
                message: `Batch ${Math.floor(i / BATCH_SIZE) + 1} analysis error — continuing...`,
              });
            }
          }

          // Cross-story pattern detection (only if we have enough data)
          if (allAnalysed.length >= 4) {
            send({
              type: 'progress',
              message: 'Detecting patterns across intelligence feeds...',
            });

            try {
              const patterns = await detectPatterns(allAnalysed);
              if (patterns.length > 0) {
                send({ type: 'patterns', patterns });
              }
            } catch {
              // Patterns are optional — skip on error
            }
          }

          send({ type: 'complete', total: allAnalysed.length });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          send({
            type: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Intelligence feed failure — unknown error',
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
