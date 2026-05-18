/**
 * JARVIS Transcript Store
 * Manages daily conversation transcripts in localStorage.
 * Keyed by YYYY-MM-DD. Retains up to 30 days.
 */

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string
  model?: string;
}

export interface StoredTranscript {
  date: string;           // YYYY-MM-DD
  messages: StoredMessage[];
  sessionCount: number;   // how many page loads contributed
  lastUpdated: string;    // ISO string
  eodProcessed: boolean;  // has end-of-day been run on this date
  eodTimestamp?: string;  // when EOD was processed
}

const KEY_PREFIX = 'jarvis_transcript_';
const MAX_DAYS = 30;

// ─── Key helpers ─────────────────────────────────────────────────────────────

export function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function storageKey(date: string): string {
  return `${KEY_PREFIX}${date}`;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function loadTranscript(date: string): StoredTranscript | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return null;
    return JSON.parse(raw) as StoredTranscript;
  } catch {
    return null;
  }
}

export function getTodayTranscript(): StoredTranscript {
  const date = todayKey();
  return (
    loadTranscript(date) ?? {
      date,
      messages: [],
      sessionCount: 0,
      lastUpdated: new Date().toISOString(),
      eodProcessed: false,
    }
  );
}

export function listStoredDates(): string[] {
  if (typeof window === 'undefined') return [];
  const dates: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) {
      dates.push(key.replace(KEY_PREFIX, ''));
    }
  }
  return dates.sort().reverse(); // newest first
}

// ─── Write ────────────────────────────────────────────────────────────────────

function saveTranscript(transcript: StoredTranscript): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(transcript.date), JSON.stringify(transcript));
  } catch (err) {
    console.error('[JARVIS] Transcript save failed:', err);
  }
}

/**
 * Appends new finalised messages to today's transcript.
 * Skips streaming placeholders and duplicates.
 */
export function appendMessages(
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    model?: string;
    isStreaming?: boolean;
  }>
): void {
  const today = getTodayTranscript();
  const existingIds = new Set(today.messages.map(m => m.id));

  const incoming = messages.filter(
    m => !m.isStreaming && m.content.trim().length > 0 && !existingIds.has(m.id)
  );

  if (incoming.length === 0) return;

  const updated: StoredTranscript = {
    ...today,
    messages: [
      ...today.messages,
      ...incoming.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp:
          m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
        model: m.model,
      })),
    ],
    lastUpdated: new Date().toISOString(),
  };

  saveTranscript(updated);
}

export function markEODProcessed(date: string): void {
  const transcript = loadTranscript(date);
  if (!transcript) return;
  saveTranscript({
    ...transcript,
    eodProcessed: true,
    eodTimestamp: new Date().toISOString(),
  });
}

export function incrementSessionCount(): void {
  const today = getTodayTranscript();
  saveTranscript({ ...today, sessionCount: today.sessionCount + 1 });
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export function pruneOldTranscripts(): void {
  if (typeof window === 'undefined') return;
  const dates = listStoredDates();
  if (dates.length <= MAX_DAYS) return;
  dates.slice(MAX_DAYS).forEach(d => localStorage.removeItem(storageKey(d)));
}

// ─── Format helpers ──────────────────────────────────────────────────────────

/**
 * Returns today's transcript as a plain-text conversation for the Claude API.
 */
export function formatTranscriptForExtraction(transcript: StoredTranscript): string {
  if (transcript.messages.length === 0) return '(No messages recorded today.)';

  return transcript.messages
    .map(m => {
      const time = new Date(m.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const speaker = m.role === 'user' ? 'ZAC' : 'JARVIS';
      return `[${time}] ${speaker}: ${m.content}`;
    })
    .join('\n\n');
}

/**
 * Generates a formatted markdown learning entry for Obsidian / Google Drive.
 */
export function formatLearningsAsMarkdown(
  learnings: ExtractedLearnings,
  date: string
): string {
  const sections: string[] = [`# End of Day Learning — ${date}\n`];

  const add = (title: string, items: LearningItem[]) => {
    const confirmed = items.filter(i => i.confidence === 'confident');
    if (confirmed.length === 0) return;
    sections.push(`## ${title}`);
    confirmed.forEach(i => sections.push(`- ${i.content}`));
    sections.push('');
  };

  add('Stayful Insights', learnings.stayfulInsights);
  add('Investment Thesis Updates', learnings.investmentUpdates);
  add('News Impact Summaries', learnings.newsImpact);
  add('Lead Knowledge Base', learnings.leadKnowledge);
  add('Action Items & Decisions Made', learnings.actionItems);
  add('Patterns Detected', learnings.patternsDetected);

  sections.push(`---\n_Generated by JARVIS at ${new Date().toLocaleString('en-GB')}_`);

  return sections.join('\n');
}

// ─── Types (shared) ───────────────────────────────────────────────────────────

export interface LearningItem {
  content: string;
  confidence: 'confident' | 'uncertain';
  approved?: boolean; // set during review
}

export interface ExtractedLearnings {
  stayfulInsights: LearningItem[];
  investmentUpdates: LearningItem[];
  newsImpact: LearningItem[];
  leadKnowledge: LearningItem[];
  actionItems: LearningItem[];
  patternsDetected: LearningItem[];
}

export const EMPTY_LEARNINGS: ExtractedLearnings = {
  stayfulInsights: [],
  investmentUpdates: [],
  newsImpact: [],
  leadKnowledge: [],
  actionItems: [],
  patternsDetected: [],
};
