/**
 * POST /api/learning/save
 *
 * Sends approved learnings to n8n, which writes to:
 *   - Google Drive: JARVIS/End of Day Summaries/YYYY-MM-DD-learnings.md
 *   - Obsidian staging: JARVIS/Obsidian Staging/YYYY-MM-DD-learnings.md
 *     (until GitHub sync is configured, this also goes to Drive)
 *
 * Required env vars:
 *   N8N_WEBHOOK_LEARNING_SAVE  — n8n webhook URL for the learning-save workflow
 *
 * The n8n workflow should:
 *   1. Receive this payload
 *   2. Write the markdown to Google Drive at the correct path
 *   3. Optionally mirror to an Obsidian staging folder in Drive
 *   4. Return { drive: { path }, obsidian: { path }, errors: [] }
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ExtractedLearnings } from '../../../../lib/transcript-store';

interface SaveRequest {
  date: string;
  markdown: string;
  destination: 'drive' | 'obsidian' | 'both';
  learnings: ExtractedLearnings;
}

interface SaveResult {
  drive?: { path: string };
  obsidian?: { path: string };
  errors: string[];
}

const N8N_WEBHOOK = process.env.N8N_WEBHOOK_LEARNING_SAVE;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveRequest;
    const { date, markdown, destination, learnings } = body;

    if (!date || !markdown || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: date, markdown, destination' },
        { status: 400 }
      );
    }

    if (!N8N_WEBHOOK) {
      // Development fallback: return the markdown so the UI can show it
      console.warn('[JARVIS] N8N_WEBHOOK_LEARNING_SAVE not configured — returning markdown only');
      return NextResponse.json({
        drive: null,
        obsidian: null,
        errors: ['n8n webhook not configured. Copy the markdown below and save manually.'],
        markdown, // returned so the UI can offer a download
        fallback: true,
      });
    }

    // Build file paths
    const driveFolder = 'JARVIS/End of Day Summaries';
    const obsidianFolder = 'JARVIS Learning Log/End of Day Summaries';
    const filename = `${date}-learnings.md`;

    const payload = {
      date,
      filename,
      markdown,
      destination,
      paths: {
        drive: `${driveFolder}/${filename}`,
        obsidian: `${obsidianFolder}/${filename}`,
      },
      // Count for logging
      meta: {
        totalLearnings: Object.values(learnings).reduce(
          (sum, items) => sum + (items as unknown[]).length,
          0
        ),
      },
    };

    const n8nRes = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      console.error('[JARVIS] n8n webhook error:', errText);
      return NextResponse.json(
        { error: `n8n returned ${n8nRes.status}: ${errText}` },
        { status: 502 }
      );
    }

    const result = (await n8nRes.json()) as SaveResult;

    console.log(`[JARVIS] Learning saved: ${date} → ${destination}`);

    return NextResponse.json({
      drive: result.drive ?? null,
      obsidian: result.obsidian ?? null,
      errors: result.errors ?? [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[JARVIS] Learning save error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
