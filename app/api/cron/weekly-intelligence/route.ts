import type { NextRequest } from 'next/server';
import {
  fetchRecentCalls,
  fetchAllKBSources,
  fetchKBSourceContent,
  analyseIntelligence,
  checkConflicts,
  addSourceToLiveKB,
  sendReviewEmail,
  type ProposedSource,
} from '@/lib/intelligence';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response('Unauthorized', { status: 401 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://jarvis.stayful.co.uk';

  console.log(`[Intelligence] Starting weekly run — ${new Date().toISOString()}`);

  try {
    console.log('[Intelligence] Fetching recent calls...');
    const calls = await fetchRecentCalls(7);
    console.log(`[Intelligence] Found ${calls.length} calls`);

    if (calls.length === 0) {
      return Response.json({ success: true, message: 'No calls this week' });
    }

    console.log('[Intelligence] Fetching KB sources...');
    const kbSources = await fetchAllKBSources();
    const allSourceTitles: string[] = [];
    const allSourceContent: { title: string; text: string }[] = [];

    for (const [, sources] of Object.entries(kbSources)) {
      for (const source of sources.slice(0, 15)) {
        allSourceTitles.push(source.title);
        if (allSourceContent.length < 30) {
          const text = await fetchKBSourceContent(source.content_url);
          if (text) allSourceContent.push({ title: source.title, text });
        }
      }
    }

    console.log('[Intelligence] Running Claude analysis...');
    const analysis = await analyseIntelligence(calls, allSourceTitles);

    console.log('[Intelligence] Running conflict check...');
    const conflictResult = await checkConflicts(analysis.new_sources, allSourceContent);

    const conflictedTitles = new Set(
      conflictResult.conflicts.map((c) => c.proposed_source_title)
    );

    const autoPublish: ProposedSource[] = [];
    const reviewQueue: ProposedSource[] = [];

    for (const source of analysis.new_sources) {
      if (source.confidence === 'high' && !conflictedTitles.has(source.title)) {
        autoPublish.push(source);
      } else {
        reviewQueue.push(source);
      }
    }

    for (const update of analysis.source_updates) {
      reviewQueue.push({
        title: `UPDATE: ${update.existing_title}`,
        text: update.new_text,
        confidence: 'medium',
        evidence: [update.update_reason],
      });
    }

    const published: ProposedSource[] = [];

    for (const source of autoPublish) {
      const success = await addSourceToLiveKB({ title: source.title, text: source.text });
      if (success) {
        published.push(source);
      } else {
        reviewQueue.push(source);
      }
    }

    await sendReviewEmail(
      published,
      reviewQueue,
      conflictResult.conflicts,
      analysis.summary,
      analysis.call_count,
      baseUrl
    );

    return Response.json({
      success: true,
      week_ending: analysis.week_ending,
      calls_processed: analysis.call_count,
      auto_published: published.length,
      review_queue: reviewQueue.length,
      conflicts_detected: conflictResult.conflicts.length,
      summary: analysis.summary,
    });
  } catch (error: any) {
    console.error('[Intelligence] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
