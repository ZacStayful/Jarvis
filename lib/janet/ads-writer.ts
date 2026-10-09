// lib/janet/ads-writer.ts
// ─── Writes to stayful-ads for Janet's approved actions (SERVER ONLY) ─────────
//
// The only writes the app ever makes to the private ZacStayful/stayful-ads
// repo, and only after Zac confirms an approval card:
//
//   create_ad_brief → append a row to briefs/queue.csv (status "approved"),
//                     write the build sheet briefs/B###.md, add a dated line
//                     to DECISIONS.md.
//   build_ad        → workflow_dispatch on the repo's build workflow (default
//                     build-ad.yml) and a dated DECISIONS.md line.
//
// Token: STAYFUL_ADS_GITHUB_WRITE_TOKEN (fine-grained, Contents read/write
// and Actions read/write on stayful-ads only), falling back to the read
// token so the error is explicit rather than silent. Never touches Meta.
//
// Pure helpers (csv row, brief id, markdown, decision line) are exported
// for tests; everything that talks to GitHub is at the bottom.

import { revalidateTag } from 'next/cache';
import type { BriefRow } from '@/lib/ads/types';
import type { CreateAdBriefDetails } from '@/types/jarvis';
import { ADS_CACHE_TAG, ADS_FILES, invalidateAdsCache, parseBriefQueue } from '@/lib/ads/department';

const REPO = process.env.STAYFUL_ADS_REPO || 'ZacStayful/stayful-ads';
const BRANCH = 'main';
const BUILD_WORKFLOW = process.env.STAYFUL_ADS_BUILD_WORKFLOW || 'build-ad.yml';
const DECISIONS_FILE = 'DECISIONS.md';

export const WRITE_TOKEN_MISSING_ERROR =
  'No GitHub token with write access to stayful-ads: set STAYFUL_ADS_GITHUB_WRITE_TOKEN (fine-grained, Contents read/write, Actions read/write)';

export function writeToken(): string | undefined {
  return process.env.STAYFUL_ADS_GITHUB_WRITE_TOKEN || process.env.STAYFUL_ADS_GITHUB_TOKEN || undefined;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export const QUEUE_COLUMNS = [
  'brief_id', 'date', 'angle_id', 'why', 'format', 'look_group', 'hook',
  'example', 'voice', 'needed_by', 'status', 'concept_id', 'notes',
] as const;

/** RFC 4180 field: quote when it contains a comma, quote or newline. */
export function csvField(value: string | undefined | null): string {
  const v = (value ?? '').replace(/\r\n|\r/g, '\n').trim();
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsvRow(fields: Record<string, string | undefined | null>, columns: readonly string[] = QUEUE_COLUMNS): string {
  return columns.map(c => csvField(fields[c])).join(',');
}

/** Column order from the queue's header line (falls back to QUEUE_COLUMNS). */
export function queueColumns(csvText: string): readonly string[] {
  const header = csvText.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  const cols = header.split(',').map(h => h.trim().replace(/^"|"$/g, '')).filter(Boolean);
  return cols.length >= 3 ? cols : QUEUE_COLUMNS;
}

/** Next B### after the highest numeric brief id in the queue (B001 if empty). */
export function nextBriefId(rows: Array<Pick<BriefRow, 'brief_id'>>): string {
  let max = 0;
  for (const r of rows) {
    const m = /^B?(\d+)$/i.exec((r.brief_id ?? '').trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `B${String(max + 1).padStart(3, '0')}`;
}

export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function briefToQueueFields(briefId: string, d: CreateAdBriefDetails, date: string): Record<string, string> {
  const notes = [d.notes?.trim(), `Build sheet: briefs/${briefId}.md`, 'Approved by Zac in the JARVIS app']
    .filter(Boolean)
    .join(' · ');
  return {
    brief_id: briefId,
    date,
    angle_id: d.angleId.trim(),
    why: d.why.trim(),
    format: d.format,
    look_group: d.lookGroup?.trim() ?? '',
    hook: d.hook.trim(),
    example: d.example.trim(),
    voice: d.voice?.trim() ?? '',
    needed_by: d.neededBy?.trim() ?? '',
    status: 'approved',
    concept_id: '',
    notes,
  };
}

export function formatBriefMarkdown(briefId: string, d: CreateAdBriefDetails, date: string): string {
  const line = (label: string, value?: string) => (value && value.trim() ? `- **${label}:** ${value.trim()}` : null);
  const lines = [
    `# ${briefId} — ${d.format} ad, angle ${d.angleId.trim()}`,
    '',
    `Approved by Zac in the JARVIS app on ${date}. Status: approved (queued for the ads studio).`,
    '',
    '## Brief',
    line('Angle', d.angleId),
    line('Why', d.why),
    line('Format', d.format),
    line('Look group', d.lookGroup),
    line('Hook', d.hook),
    line('Example', d.example),
    line('Voice', d.voice),
    line('Needed by', d.neededBy),
    line('Notes', d.notes),
    '',
    '## Ads Manager copy',
    line('Primary text', d.primaryText),
    line('Headline', d.headline),
    line('Description', d.description),
    line('Call to action', d.cta || 'Get quote'),
    line('Link', 'calculator.stayful.co.uk'),
    '',
    '## Rules checked',
    '- One real example, never a town. Report figures are projections.',
    '- No income ranges; never "you will earn"; "you stay the owner".',
    '- "A short-term let, like an Airbnb" — never "by the night".',
    '- Hook is about the property, not the viewer\'s finances.',
    '',
    `_Build in the ads studio: "Janet, start ${briefId}"._`,
    '',
  ].filter((l): l is string => l !== null);
  return lines.join('\n');
}

export function decisionLine(date: string, text: string): string {
  return `- ${date} — ${text}`;
}

// ─── GitHub Contents API ──────────────────────────────────────────────────────

type ReadResult =
  | { ok: true; text: string; sha: string }
  | { ok: true; text: null; sha: null } // not found
  | { ok: false; error: string };

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function describeRefusal(path: string, status: number): string {
  if (status === 401 || status === 403) {
    return `${path}: GitHub refused the write (${status}) — the token lacks write access; set STAYFUL_ADS_GITHUB_WRITE_TOKEN with Contents read/write on stayful-ads`;
  }
  return `${path}: GitHub returned ${status}`;
}

async function readWithSha(token: string, path: string): Promise<ReadResult> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: headers(token),
    cache: 'no-store',
  });
  if (res.status === 404) return { ok: true, text: null, sha: null };
  if (!res.ok) return { ok: false, error: describeRefusal(path, res.status) };
  const body = (await res.json()) as { content?: string; sha?: string; encoding?: string };
  if (!body.sha) return { ok: false, error: `${path}: unexpected GitHub response` };
  const text = body.content ? Buffer.from(body.content.replace(/\n/g, ''), 'base64').toString('utf8') : '';
  return { ok: true, text, sha: body.sha };
}

async function putFile(
  token: string,
  path: string,
  content: string,
  message: string,
  sha: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, error: `${describeRefusal(path, res.status)}${detail ? ` — ${detail.slice(0, 200)}` : ''}` };
  }
  invalidateAdsCache(path);
  return { ok: true };
}

async function appendLine(token: string, path: string, line: string, message: string) {
  const current = await readWithSha(token, path);
  if (!current.ok) return current;
  const base = current.text ?? '';
  const next = base.length === 0 ? `${line}\n` : `${base.replace(/\s*$/, '')}\n${line}\n`;
  return putFile(token, path, next, message, current.sha);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export interface WriteOutcome {
  ok: boolean;
  briefId?: string;
  message: string; // Janet's spoken confirmation (or the failure, plainly)
  warnings: string[];
}

export async function createAdBrief(details: CreateAdBriefDetails, now: Date = new Date()): Promise<WriteOutcome> {
  const token = writeToken();
  if (!token) return { ok: false, message: `I couldn't save the brief, Zac. ${WRITE_TOKEN_MISSING_ERROR}.`, warnings: [] };

  const missing = (['angleId', 'why', 'format', 'hook', 'example'] as const).filter(k => !details[k] || !String(details[k]).trim());
  if (missing.length) {
    return { ok: false, message: `The brief is missing ${missing.join(', ')}, Zac — I'll redraft it.`, warnings: [] };
  }

  const date = todayIso(now);
  const warnings: string[] = [];

  // 1. Queue row. The id comes from the queue as it is right now (never from
  //    the model), and the row follows the file's own header order.
  const queue = await readWithSha(token, ADS_FILES.briefQueue);
  if (!queue.ok) return { ok: false, message: `I couldn't update the brief queue, Zac. ${queue.error}`, warnings };
  const existing = queue.text && queue.text.trim() ? queue.text : QUEUE_COLUMNS.join(',');
  const columns = queueColumns(existing);
  const briefId = nextBriefId(parseBriefQueue(existing));
  const row = toCsvRow(briefToQueueFields(briefId, details, date), columns);
  const nextQueue = `${existing.replace(/\s*$/, '')}\n${row}\n`;
  const putQueue = await putFile(token, ADS_FILES.briefQueue, nextQueue, `brief: queue ${briefId} (angle ${details.angleId.trim()}, ${details.format}) via JARVIS`, queue.sha);
  if (!putQueue.ok) return { ok: false, message: `I couldn't update the brief queue, Zac. ${putQueue.error}`, warnings };

  // 2. Build sheet
  const sheet = await putFile(token, `briefs/${briefId}.md`, formatBriefMarkdown(briefId, details, date), `brief: build sheet ${briefId} via JARVIS`, null);
  if (!sheet.ok) warnings.push(sheet.error);

  // 3. Decision log
  const decision = await appendLine(
    token,
    DECISIONS_FILE,
    decisionLine(date, `Zac approved brief ${briefId} (angle ${details.angleId.trim()}, ${details.format}) in the JARVIS app; queued for the ads studio.`),
    `decisions: ${briefId} approved via JARVIS`
  );
  if (!decision.ok) warnings.push(decision.error);

  revalidateTag(ADS_CACHE_TAG, 'max');

  return {
    ok: true,
    briefId,
    warnings,
    message: `Saved ${briefId} to the queue, Zac — angle ${details.angleId.trim()}, ${details.format}. The build sheet is in the briefs folder. When you want it made, say "build ${briefId}", or open the ads studio and say "Janet, start ${briefId}".`,
  };
}

export async function buildAd(briefId: string, note: string | undefined, now: Date = new Date()): Promise<WriteOutcome> {
  const token = writeToken();
  const id = briefId.trim().toUpperCase();
  if (!token) return { ok: false, message: `I can't start the build, Zac. ${WRITE_TOKEN_MISSING_ERROR}.`, warnings: [] };
  if (!/^B\d{3,}$/.test(id)) return { ok: false, message: `"${briefId}" isn't a brief id I recognise, Zac.`, warnings: [] };

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${BUILD_WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ref: BRANCH, inputs: { brief_id: id, ...(note ? { note } : {}) } }),
  });

  if (res.status === 404) {
    return {
      ok: false,
      message: `The build pipeline isn't connected yet, Zac — stayful-ads has no ${BUILD_WORKFLOW} workflow. For now, open the ads studio and say "Janet, start ${id}".`,
      warnings: [],
    };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, message: `GitHub wouldn't start the build, Zac (${res.status}). ${detail.slice(0, 200)}`, warnings: [] };
  }

  const warnings: string[] = [];
  const decision = await appendLine(
    token,
    DECISIONS_FILE,
    decisionLine(todayIso(now), `Zac approved the build of ${id} in the JARVIS app; ${BUILD_WORKFLOW} dispatched.`),
    `decisions: build ${id} dispatched via JARVIS`
  );
  if (!decision.ok) warnings.push(decision.error);
  revalidateTag(ADS_CACHE_TAG, 'max');

  return { ok: true, briefId: id, warnings, message: `Build started for ${id}, Zac. I'll have the frames for you to approve when the studio has them.` };
}
