// app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllLeads,
  probeActivityLogs,
  buildPipeline,
  buildOutreach,
  buildOffers,
} from '@/lib/sales/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

type ChunkKey = 'pipeline' | 'outreach' | 'meetings' | 'offers';
const CHUNK_KEYS: ChunkKey[] = ['pipeline', 'outreach', 'meetings', 'offers'];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const chunkParam = searchParams.get('chunk');
    const chunk: ChunkKey | null = CHUNK_KEYS.includes(chunkParam as ChunkKey)
      ? (chunkParam as ChunkKey)
      : null;

    const [allItems, activityLogsAvailable] = await Promise.all([
      fetchAllLeads({ from, to }),
      probeActivityLogs(),
    ]);

    const out: Record<string, any> = {
      total: allItems.length,
      activityLogsAvailable,
      dateRange: { from, to, filtered: !!(from || to) },
    };

    if (!chunk || chunk === 'pipeline' || chunk === 'meetings') {
      out.pipeline = buildPipeline(allItems);
    }
    if (!chunk || chunk === 'outreach') {
      out.outreach = buildOutreach(allItems);
    }
    if (!chunk || chunk === 'offers') {
      out.offers = buildOffers(allItems);
    }

    return NextResponse.json(out, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (error) {
    console.error('[Sales API]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
