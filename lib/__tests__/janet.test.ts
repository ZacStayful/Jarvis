import { describe, it, expect } from 'vitest';
import {
  csvField,
  toCsvRow,
  nextBriefId,
  briefToQueueFields,
  formatBriefMarkdown,
  decisionLine,
  todayIso,
  queueColumns,
  QUEUE_COLUMNS,
} from '@/lib/janet/ads-writer';
import { flagWeakening, rowFromInsights, formatAdPerformanceForPrompt, type AdPerformanceRow } from '@/lib/janet/meta';
import { parseCsv } from '@/lib/ads/department';
import { buildSystemPrompt } from '@/lib/jarvis-system-prompt';
import type { CreateAdBriefDetails } from '@/types/jarvis';

const brief: CreateAdBriefDetails = {
  angleId: '7',
  why: 'Landlords who are tired of voids, "it sat empty for two months"',
  format: 'photo',
  hook: 'Your flat is empty more than you think.',
  example: 'Example: a 2-bed. Every property is different.',
  primaryText: 'A short-term let, like an Airbnb — and you stay the owner.',
  headline: 'Fewer empty weeks',
  notes: 'Pair with the calendar screen',
};

describe('ads-writer pure helpers', () => {
  it('quotes CSV fields with commas, quotes and newlines', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a, b')).toBe('"a, b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
    expect(csvField(undefined)).toBe('');
  });

  it('writes a queue row that the department parser reads back', () => {
    const fields = briefToQueueFields('B007', brief, '2026-10-09');
    const csv = `${QUEUE_COLUMNS.join(',')}\n${toCsvRow(fields)}\n`;
    const [row] = parseCsv(csv);
    expect(row.brief_id).toBe('B007');
    expect(row.angle_id).toBe('7');
    expect(row.status).toBe('approved');
    expect(row.why).toBe(brief.why);
    expect(row.notes).toContain('briefs/B007.md');
  });

  it('follows the queue file\'s own column order', () => {
    const reordered = 'brief_id,status,angle_id,format,hook,example,why,date,look_group,voice,needed_by,concept_id,notes';
    expect(queueColumns(`${reordered}\nB001,approved,...`)).toEqual(reordered.split(','));
    expect(queueColumns('')).toEqual(QUEUE_COLUMNS);
    const row = toCsvRow(briefToQueueFields('B002', brief, '2026-10-09'), queueColumns(reordered));
    expect(row.startsWith('B002,approved,7,photo,')).toBe(true);
  });

  it('assigns the next brief id from the live queue', () => {
    expect(nextBriefId([])).toBe('B001');
    expect(nextBriefId([{ brief_id: 'B003' }, { brief_id: 'B011' }, { brief_id: 'junk' }])).toBe('B012');
  });

  it('builds a readable build sheet and a dated decision line', () => {
    const md = formatBriefMarkdown('B007', brief, '2026-10-09');
    expect(md).toContain('# B007 — photo ad, angle 7');
    expect(md).toContain('**Hook:** Your flat is empty more than you think.');
    expect(md).toContain('**Call to action:** Get quote');
    expect(md).not.toContain('**Voice:**'); // omitted when empty
    expect(decisionLine('2026-10-09', 'Zac approved brief B007')).toBe('- 2026-10-09 — Zac approved brief B007');
    expect(todayIso(new Date('2026-10-09T23:30:00Z'))).toBe('2026-10-10'); // BST
  });
});

describe('meta weakening rule', () => {
  const row = (over: Partial<AdPerformanceRow>): AdPerformanceRow => ({
    adId: 'a', adName: 'Ad A', spend: 100, impressions: 10000, clicks: 100, ctr: 1.0, leads: 4, costPerLead: 25, frequency: 1.5,
    ...over,
  });

  it('flags CTR drop with rising frequency', () => {
    const flags = flagWeakening([row({ ctr: 0.7, frequency: 2.1 })], [row({})]);
    expect(flags).toHaveLength(1);
    expect(flags[0].reasons.join(' ')).toMatch(/CTR down 30%/);
    expect(flags[0].reasons.join(' ')).toMatch(/frequency rising/);
  });

  it('flags cost per lead rise plus CTR drop even with flat frequency', () => {
    const flags = flagWeakening([row({ ctr: 0.7, costPerLead: 40 })], [row({})]);
    expect(flags).toHaveLength(1);
    expect(flags[0].reasons.join(' ')).toMatch(/cost per lead up 60%/);
  });

  it('does not flag a single signal with flat frequency, low spend, or a new ad', () => {
    expect(flagWeakening([row({ ctr: 0.7 })], [row({})])).toHaveLength(0);
    expect(flagWeakening([row({ ctr: 0.5, spend: 5, frequency: 3 })], [row({})])).toHaveLength(0);
    expect(flagWeakening([row({ adId: 'new', ctr: 0.1, frequency: 3 })], [row({})])).toHaveLength(0);
  });

  it('maps insights rows and formats the prompt block', () => {
    const mapped = rowFromInsights({
      ad_id: '1', ad_name: 'Voids', adset_name: 'Landlords', spend: '80.5', impressions: '9000', clicks: '90', ctr: '1', frequency: '1.4',
      actions: [{ action_type: 'link_click', value: '90' }, { action_type: 'lead', value: '3' }],
    });
    expect(mapped.leads).toBe(3);
    expect(mapped.costPerLead).toBeCloseTo(26.83, 2);
    const block = formatAdPerformanceForPrompt({
      connected: true, windowDays: 7, current: [mapped], previous: [], weakening: [], fetchedAt: '2026-10-09T08:00:00.000Z',
    });
    expect(block).toContain('LIVE AD PERFORMANCE');
    expect(block).toContain('Voids (Landlords)');
    expect(block).toContain('none flagged');
    expect(formatAdPerformanceForPrompt({ connected: false, windowDays: 7, current: [], previous: [], weakening: [], fetchedAt: '' })).toBe('');
  });
});

describe('prompt knows the brief flow', () => {
  it('lists the two action types and the write boundary', () => {
    const p = buildSystemPrompt({ persona: 'janet', marketingContext: '=== MARKETING CONTEXT ===\nx' });
    expect(p).toContain('create_ad_brief');
    expect(p).toContain('build_ad');
    expect(p).toContain('briefs/queue.csv');
    expect(p).toContain('do not invent one');
  });
});
