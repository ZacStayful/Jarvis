import crypto from 'crypto';

const RETELL_API_KEY = process.env.RETELL_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zac@stayful.co.uk';
const REVIEW_SECRET = process.env.REVIEW_SECRET || RETELL_API_KEY;
const LIVE_INTELLIGENCE_KB_ID = 'knowledge_base_4424f29674d51142';
const LUCY_AGENT_ID = 'agent_82f187b32e8f5e7913da1c506f';

// The email endpoint lives in the separate stayful-voice-api project (it
// supports `to_override`, which Jarvis's own /api/email/send does not). Call
// it cross-project.
const EMAIL_SEND_URL = 'https://stayful-voice-api.vercel.app/api/email/send';

const ALL_KB_IDS = [
  'knowledge_base_fd85ddad761cb7f4',
  'knowledge_base_831440252faeee75',
  'knowledge_base_ae4803060811bdae',
  'knowledge_base_4cda5d82416e7133',
  'knowledge_base_4424f29674d51142',
];

export interface ProposedSource {
  title: string;
  text: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface ConflictAlert {
  proposed_source_title: string;
  existing_source_title: string;
  conflict_type: 'factual' | 'guidance' | 'tone' | 'duplicate';
  description: string;
  recommendation: 'reject_new' | 'update_existing' | 'merge' | 'keep_both';
}

export interface IntelligenceResult {
  new_sources: ProposedSource[];
  source_updates: { existing_title: string; update_reason: string; new_text: string }[];
  summary: string;
  call_count: number;
  week_ending: string;
}

export interface ConflictResult {
  conflicts: ConflictAlert[];
  clean_sources: string[];
}

export async function fetchRecentCalls(daysBack = 7): Promise<any[]> {
  const since = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const body = {
    filter_criteria: {
      agent: { agent_id: LUCY_AGENT_ID },
      start_timestamp: { op: 'gt', type: 'number', value: since },
      call_status: { op: 'in', type: 'enum', value: ['ended'] },
    },
    limit: 100,
    sort_order: 'descending',
  };

  const res = await fetch('https://api.retellai.com/v2/list-calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Retell calls fetch failed: ${res.status}`);
  const data = await res.json();
  return data.calls || data.items || [];
}

export async function fetchAllKBSources(): Promise<Record<string, { title: string; content_url: string }[]>> {
  const result: Record<string, { title: string; content_url: string }[]> = {};

  await Promise.all(
    ALL_KB_IDS.map(async (kbId) => {
      const res = await fetch(`https://api.retellai.com/get-knowledge-base/${kbId}`, {
        headers: { Authorization: `Bearer ${RETELL_API_KEY}` },
      });
      if (!res.ok) return;
      const kb = await res.json();
      result[kb.knowledge_base_name] = (kb.knowledge_base_sources || [])
        .filter((s: any) => s.type === 'text')
        .map((s: any) => ({ title: s.title, content_url: s.content_url }));
    })
  );

  return result;
}

export async function fetchKBSourceContent(contentUrl: string): Promise<string> {
  try {
    const res = await fetch(contentUrl);
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

export async function addSourceToLiveKB(source: { title: string; text: string }): Promise<boolean> {
  const res = await fetch(
    `https://api.retellai.com/add-knowledge-base-sources/${LIVE_INTELLIGENCE_KB_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ knowledge_base_texts: [source] }),
    }
  );
  return res.ok;
}

export async function callClaude(prompt: string, systemPrompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API failed: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

export async function analyseIntelligence(
  calls: any[],
  existingSourceTitles: string[]
): Promise<IntelligenceResult> {
  const callSummaries = calls
    .filter((c) => c.call_analysis || c.transcript)
    .map((c) => ({
      call_id: c.call_id,
      duration_ms: c.duration_ms,
      call_outcome: c.call_analysis?.call_outcome,
      lead_profile: c.call_analysis?.lead_profile_identified,
      summary: c.call_analysis?.call_summary,
      sentiment: c.call_analysis?.user_sentiment,
      transcript_snippet: c.transcript ? c.transcript.slice(0, 2000) : null,
    }))
    .slice(0, 30);

  const systemPrompt = `You are the intelligence analyst for Stayful's AI voice agent Lucy.
Your job is to process weekly call data and identify new knowledge that should be added to Lucy's knowledge base.

Lucy uses a specific format for all knowledge base sources:
- RECOGNITION: exact phrases/signals that identify this situation
- VALIDATE: one sentence acknowledging the concern
- REFRAME: one sentence shifting the comparison
- QUANTIFY: specific figure or range
- PROOF: real portfolio reference
- QUESTION: gate-check question to test if resolved
- NEVER: prohibited responses for this scenario

Lucy's tone: warm, confident, locally knowledgeable, never pushy. Always 2-3 sentences max per response element.
All figures in pounds. All language written for voice (spoken naturally, not read).

Return ONLY valid JSON, no preamble or markdown.`;

  const prompt = `Analyse this week's call data and identify knowledge gaps.

EXISTING KB SOURCE TITLES (what Lucy already knows - do not duplicate):
${existingSourceTitles.map((t) => `- ${t}`).join('\n')}

THIS WEEK'S CALLS (${callSummaries.length} calls):
${JSON.stringify(callSummaries, null, 2)}

TASK:
1. Identify objection patterns appearing in 2+ calls NOT covered by existing sources
2. Identify single notable patterns worth watching (confidence: low)
3. Identify any existing sources that need updating based on new language patterns
4. Write new KB sources in Lucy's exact format

CONFIDENCE RULES:
- HIGH: pattern in 3+ calls, clear and specific, no ambiguity → auto-publish
- MEDIUM: pattern in 2 calls, or 1 call but very significant → review queue
- LOW: 1 call, emerging pattern worth watching → review queue

Return JSON:
{
  "new_sources": [
    {
      "title": "string",
      "text": "string (full KB source in Lucy format)",
      "confidence": "high|medium|low",
      "evidence": ["call_id or description of evidence"]
    }
  ],
  "source_updates": [
    {
      "existing_title": "string",
      "update_reason": "string",
      "new_text": "string"
    }
  ],
  "summary": "2-3 sentence summary of this week's key patterns"
}`;

  const raw = await callClaude(prompt, systemPrompt);
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    ...parsed,
    call_count: callSummaries.length,
    week_ending: new Date().toISOString().split('T')[0],
  };
}

export async function checkConflicts(
  proposedSources: ProposedSource[],
  existingContent: { title: string; text: string }[]
): Promise<ConflictResult> {
  if (proposedSources.length === 0) return { conflicts: [], clean_sources: [] };

  const systemPrompt = `You are a quality assurance reviewer for Lucy, Stayful's AI voice agent.
Your job is to identify conflicts, contradictions, and confusions that could cause Lucy to give inconsistent or incorrect responses.
Return ONLY valid JSON, no preamble or markdown.`;

  const prompt = `Review these proposed new KB sources for conflicts with existing content.

EXISTING KNOWLEDGE BASE SOURCES:
${existingContent
  .slice(0, 40)
  .map((s) => `\n### ${s.title}\n${s.text.slice(0, 500)}`)
  .join('\n')}

PROPOSED NEW SOURCES:
${proposedSources.map((s) => `\n### ${s.title}\n${s.text}`).join('\n')}

CHECK FOR:
1. FACTUAL CONFLICTS: New source states a fact contradicting an existing source
2. GUIDANCE CONFLICTS: New source gives different advice for the same scenario
3. TONE CONFLICTS: New source uses language contradicting Lucy's established voice
4. DUPLICATE COVERAGE: New source covers exactly the same ground as an existing source

Return JSON:
{
  "conflicts": [
    {
      "proposed_source_title": "string",
      "existing_source_title": "string",
      "conflict_type": "factual|guidance|tone|duplicate",
      "description": "specific description of the conflict",
      "recommendation": "reject_new|update_existing|merge|keep_both"
    }
  ],
  "clean_sources": ["titles of proposed sources with no conflicts detected"]
}`;

  const raw = await callClaude(prompt, systemPrompt);
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(cleaned);
}

export function signPayload(data: string): string {
  return crypto.createHmac('sha256', REVIEW_SECRET).update(data).digest('hex');
}

export function verifySignature(data: string, sig: string): boolean {
  const expected = signPayload(data);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export function encodeSource(source: { title: string; text: string }): string {
  return Buffer.from(JSON.stringify(source)).toString('base64url');
}

export function decodeSource(encoded: string): { title: string; text: string } {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
}

export function buildApproveUrl(source: { title: string; text: string }, baseUrl: string): string {
  const encoded = encodeSource(source);
  const sig = signPayload(encoded);
  return `${baseUrl}/api/intelligence/approve?source=${encoded}&sig=${sig}`;
}

export function buildRejectUrl(title: string, baseUrl: string): string {
  const encoded = Buffer.from(title).toString('base64url');
  const sig = signPayload(encoded);
  return `${baseUrl}/api/intelligence/reject?title=${encoded}&sig=${sig}`;
}

export async function sendReviewEmail(
  autoPublished: ProposedSource[],
  reviewQueue: ProposedSource[],
  conflicts: ConflictAlert[],
  summary: string,
  callCount: number,
  baseUrl: string
): Promise<void> {
  const weekEnding = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const reviewItemsHtml = reviewQueue
    .map((s) => {
      const approveUrl = buildApproveUrl({ title: s.title, text: s.text }, baseUrl);
      const rejectUrl = buildRejectUrl(s.title, baseUrl);
      return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:16px 0;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <h3 style="margin:0 0 8px;font-size:15px;color:#111;">${s.title}</h3>
          <span style="font-size:12px;padding:2px 8px;border-radius:12px;background:${s.confidence === 'medium' ? '#fef3c7' : '#ede9fe'};color:${s.confidence === 'medium' ? '#92400e' : '#5b21b6'};">${s.confidence.toUpperCase()}</span>
        </div>
        <p style="font-size:13px;color:#6b7280;margin:0 0 12px;">Evidence: ${s.evidence.join(', ')}</p>
        <details style="margin-bottom:16px;">
          <summary style="cursor:pointer;font-size:13px;color:#374151;font-weight:500;">View source content</summary>
          <pre style="font-size:12px;background:#f9fafb;padding:12px;border-radius:6px;white-space:pre-wrap;margin:8px 0 0;">${s.text}</pre>
        </details>
        <div style="display:flex;gap:12px;">
          <a href="${approveUrl}" style="background:#10b981;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">✓ Approve — Publish to Lucy</a>
          <a href="${rejectUrl}" style="background:#f3f4f6;color:#374151;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">✕ Reject</a>
        </div>
      </div>`;
    })
    .join('');

  const conflictsHtml = conflicts.length > 0
    ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:20px;margin:16px 0;">
        <h3 style="margin:0 0 12px;color:#b91c1c;font-size:15px;">⚠ Conflicts Detected (${conflicts.length})</h3>
        ${conflicts.map((c) => `
          <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #fca5a5;">
            <strong style="font-size:13px;">${c.conflict_type.toUpperCase()}</strong>
            <p style="font-size:13px;margin:4px 0;">"${c.proposed_source_title}" conflicts with "${c.existing_source_title}"</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0;">${c.description}</p>
            <p style="font-size:12px;font-weight:500;color:#b91c1c;">Recommendation: ${c.recommendation.replace(/_/g, ' ')}</p>
          </div>`).join('')}
      </div>`
    : '';

  const autoPublishedHtml = autoPublished.length > 0
    ? `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:16px 0;">
        <h3 style="margin:0 0 8px;color:#15803d;font-size:15px;">✓ Auto-Published This Week (${autoPublished.length})</h3>
        ${autoPublished.map((s) => `<p style="font-size:13px;margin:4px 0;color:#166534;">• ${s.title}</p>`).join('')}
      </div>`
    : '';

  const emailBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#f9fafb;color:#111;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="margin-bottom:24px;">
      <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;">STAYFUL INTELLIGENCE SYSTEM</p>
      <h1 style="margin:0 0 4px;font-size:22px;">Weekly Intelligence Report</h1>
      <p style="margin:0;font-size:14px;color:#6b7280;">Week ending ${weekEnding} · ${callCount} calls processed</p>
    </div>
    <div style="background:#f0f9ff;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#0369a1;">${summary}</p>
    </div>
    ${autoPublishedHtml}
    ${conflictsHtml}
    ${reviewQueue.length > 0
      ? `<h2 style="font-size:16px;margin:24px 0 8px;">Review Queue (${reviewQueue.length} items)</h2>
         <p style="font-size:13px;color:#6b7280;margin:0 0 16px;">Click approve to publish directly to Lucy.</p>
         ${reviewItemsHtml}`
      : '<p style="color:#15803d;font-size:14px;">No items in review queue this week.</p>'}
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">Lucy — Stayful AI Agent Intelligence System · Automated weekly report</p>
    </div>
  </div>
</body>
</html>`;

  await fetch(EMAIL_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      monday_item_id: 'system',
      trigger: 'intelligence_report',
      subject: `Lucy Intelligence Report — ${weekEnding} · ${callCount} calls · ${reviewQueue.length} items for review`,
      body: emailBody,
      to_override: ADMIN_EMAIL,
    }),
  });
}

export { LIVE_INTELLIGENCE_KB_ID, ADMIN_EMAIL };
