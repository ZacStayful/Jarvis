import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compactHistory,
  extractOpenActions,
  lastCsvRows,
  parseSnapshot,
  withoutNumberedSection,
} from '@/lib/ads/department';
import { campaignsByLane, openAbTests, warmAudienceSize } from '@/lib/ads/lanes';
import { buildSystemPrompt } from '@/lib/jarvis-system-prompt';
import { LANES_SNAPSHOT } from './fixtures/lanes-snapshot';

describe('parseSnapshot: lanes and diagnosis blocks', () => {
  it('keeps the blocks as written', () => {
    const s = parseSnapshot(JSON.stringify(LANES_SNAPSHOT));
    expect(s?.campaigns).toHaveLength(4);
    expect(s?.audiences?.[0]?.size_known).toBe(false);
    expect(s?.journal_open?.[0]?.situation_id).toBe('S23');
    expect(s?.diagnosis?.situations?.map(x => x.id)).toEqual(['S05', 'S01']);
    expect(s?.scaling?.change).toBe('start_test');
    expect(s?.creative?.bench).toEqual(['C06', 'C07']);
    expect(s?.account_changes?.[0]?.by).toBe('you');
  });

  it('defaults missing blocks to null, like capacity', () => {
    const s = parseSnapshot(JSON.stringify({ week_ending: '2026-10-09' }));
    expect(s).not.toBeNull();
    for (const key of ['campaigns', 'audiences', 'journal_open', 'diagnosis', 'breakdowns', 'account_changes'] as const) {
      expect(s?.[key], key).toBeNull();
    }
  });
});

describe('campaignsByLane', () => {
  it('orders Main, Test, Retargeting and drops empty lanes', () => {
    const groups = campaignsByLane(LANES_SNAPSHOT.campaigns);
    expect(groups.map(g => g.lane)).toEqual(['main', 'test', 'retargeting']);
    expect(groups[1].campaigns).toHaveLength(2);
  });

  it('puts an unknown lane last and handles nothing at all', () => {
    expect(campaignsByLane([{ name: 'x', lane: 'scale' }, { name: 'y', lane: 'main' }]).map(g => g.lane)).toEqual([
      'main',
      'other',
    ]);
    expect(campaignsByLane(null)).toEqual([]);
    expect(campaignsByLane([])).toEqual([]);
  });
});

describe('openAbTests', () => {
  it('lists running tests with the control first, and skips ended ones', () => {
    const tests = openAbTests(LANES_SNAPSHOT.campaigns);
    expect(tests).toHaveLength(1);
    expect(tests[0].campaign.id).toBe('200');
    expect(tests[0].versions.map(v => v.name)).toEqual(['Interests', 'Broad']);
  });

  it('is empty without campaigns', () => {
    expect(openAbTests(undefined)).toEqual([]);
  });
});

describe('warmAudienceSize', () => {
  it('reads a floor value as small and unknown', () => {
    expect(warmAudienceSize(LANES_SNAPSHOT.audiences[0])).toBe('under ~1,000 (size unknown)');
  });
  it('shows a known range', () => {
    expect(warmAudienceSize(LANES_SNAPSHOT.audiences[1])).toBe('1,200–1,400');
    expect(warmAudienceSize({})).toBe('not measured');
  });
});

describe('lastCsvRows', () => {
  const csv = [
    'date,decision,change_detail',
    '2026-10-09,NOT_DUE,"Budget held, review not due"',
    '2026-10-16,HOLD,"Line one',
    'line two"',
    '2026-10-23,SCALE,Raise to £29',
    '2026-10-30,HOLD,plain',
  ].join('\n');

  it('keeps the header and the last n records, whole', () => {
    expect(lastCsvRows(csv, 2).split('\n')).toEqual([
      'date,decision,change_detail',
      '2026-10-23,SCALE,Raise to £29',
      '2026-10-30,HOLD,plain',
    ]);
  });

  it('keeps a quoted line break inside its record', () => {
    expect(lastCsvRows(csv, 3)).toContain('2026-10-16,HOLD,"Line one\nline two"');
  });

  it('returns everything when there are fewer rows than n', () => {
    expect(lastCsvRows('a,b\n1,2\n', 12)).toBe('a,b\n1,2');
    expect(lastCsvRows('', 12)).toBe('');
  });
});

describe('withoutNumberedSection', () => {
  const plan = ['# Plan', '## Hard limits', 'L', '## 12. Bottlenecks', 'B', '## 13. Weekly snapshot', 'SPEC', '### 13a', 'MORE', '## 14. Marginal', 'M'].join('\n');

  it('replaces only that section with the note', () => {
    const out = withoutNumberedSection(plan, 13, '## 13. (left out)');
    expect(out).not.toContain('SPEC');
    expect(out).not.toContain('MORE');
    expect(out).toContain('## 13. (left out)');
    expect(out).toContain('## 12. Bottlenecks\nB');
    expect(out).toContain('## 14. Marginal\nM');
  });

  it('leaves the text alone when the section is missing', () => {
    expect(withoutNumberedSection(plan, 99, 'x')).toBe(plan);
  });
});

describe('compactHistory', () => {
  const week = (n: number) => ({
    ...LANES_SNAPSHOT,
    week_ending: `2026-12-${String(n).padStart(2, '0')}`,
    ads: Array.from({ length: 40 }, (_, i) => ({ concept_id: `C${i}`, reason: 'x'.repeat(200) })),
  });
  const history = Array.from({ length: 10 }, (_, i) => JSON.stringify(week(i + 1))).join('\n') + '\nnot json\n';

  it('keeps the newest weeks, oldest first, as compact lines', () => {
    const lines = compactHistory(history, 8, 1_000_000);
    expect(lines).toHaveLength(8);
    const weeks = lines.map(l => JSON.parse(l).week_ending);
    expect(weeks[0]).toBe('2026-12-03');
    expect(weeks[7]).toBe('2026-12-10');
    const first = JSON.parse(lines[0]);
    expect(first.ads).toBeUndefined();
    expect(first.capacity).toBeUndefined();
    expect(first.capacity_bottleneck).toBe('buyer_enquiries');
    expect(first.situations).toEqual(['S05 partial', 'S01 strong']);
    expect(first.campaigns[2].ab_test.versions).toHaveLength(2);
  });

  it('drops the oldest weeks first when the cap is tight', () => {
    const one = compactHistory(history, 8, 1_000_000)[0].length;
    const lines = compactHistory(history, 8, one * 3 + 3);
    expect(lines.map(l => JSON.parse(l).week_ending)).toEqual(['2026-12-08', '2026-12-09', '2026-12-10']);
  });

  it('always keeps the newest week, even over the cap', () => {
    expect(compactHistory(history, 8, 10)).toHaveLength(1);
  });
});

describe('extractOpenActions', () => {
  it('skips Done, Closed and Retired rows', () => {
    const md = [
      '## Lanes',
      '| # | Action | Status |',
      '|---|---|---|',
      '| A1 | Pause the 1% lookalike | Closed 10 Oct: all ad sets stay |',
      '| B4 | Rebuild 3%/5% | Retired 10 Oct |',
      '| F1 | Warm audiences | Done 10 Oct |',
      '| F2 | First A/B test | Open |',
    ].join('\n');
    const out = extractOpenActions(md) ?? '';
    expect(out).toContain('F2');
    expect(out).not.toContain('A1');
    expect(out).not.toContain('B4');
    expect(out).not.toContain('F1');
  });
});

describe('buildMarketingContext: the scaling layers', () => {
  const JOURNAL = [
    'date,lane,decision',
    ...Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')},main,ROW${i + 1}`),
  ].join('\n');
  const FILES: Record<string, string> = {
    'scaling/weekly_snapshot.json': JSON.stringify(LANES_SNAPSHOT),
    'scaling/weekly_history.jsonl': JSON.stringify(LANES_SNAPSHOT),
    'MARKETING_DEPARTMENT.md': 'DEPARTMENT-TEXT',
    'scaling/SCALING_PLAN.md': '# Plan\n## Hard limits\nLIMITS-TEXT\n## 13. Weekly snapshot\nSPEC-TEXT\n## 14. Marginal\nMARGINAL-TEXT',
    'scaling/ACTIONS.md': '## Lanes\n| # | Action | Status |\n|---|---|---|\n| F2 | First A/B test | Open |',
    'scaling/HOW_META_SCALES.md': 'HOW-TEXT',
    'scaling/READING_THE_NUMBERS.md': 'READING-TEXT',
    'scaling/SITUATIONS.md': '### S01 Improving',
    'scaling/ACCOUNT_LEARNINGS.md': 'RULES-TEXT',
    'scaling/decision_journal.csv': JOURNAL,
  };

  async function contextFor(who: 'jarvis' | 'janet' | 'both', missing: string[] = []) {
    vi.resetModules();
    vi.stubEnv('STAYFUL_ADS_GITHUB_TOKEN', 'test-token');
    vi.stubGlobal('fetch', async (url: string) => {
      const path = decodeURIComponent(new URL(url).pathname.replace(/^\/repos\/[^/]+\/[^/]+\/contents\//, ''));
      const body = missing.includes(path) ? undefined : FILES[path];
      return body === undefined ? new Response('missing', { status: 404 }) : new Response(body, { status: 200 });
    });
    const { buildMarketingContext } = await import('@/lib/ads/department');
    return buildMarketingContext(who);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('gives JARVIS the four layers and the latest journal rows', async () => {
    const ctx = await contextFor('jarvis');
    for (const text of ['HOW-TEXT', 'READING-TEXT', '### S01 Improving', 'RULES-TEXT', 'LIMITS-TEXT', 'MARGINAL-TEXT']) {
      expect(ctx, text).toContain(text);
    }
    expect(ctx).toContain('BEGIN scaling/HOW_META_SCALES.md');
    expect(ctx).toContain('scaling/decision_journal.csv (header and the last 12 rows)');
    expect(ctx).toContain('ROW15');
    expect(ctx).toContain('ROW4');
    expect(ctx).not.toMatch(/ROW3\b/);
  });

  it('leaves the snapshot format spec out of the scaling plan', async () => {
    const ctx = await contextFor('jarvis');
    expect(ctx).not.toContain('SPEC-TEXT');
    expect(ctx).toContain('section 13, the snapshot format, left out');
  });

  it('quotes history compactly', async () => {
    const ctx = await contextFor('jarvis');
    expect(ctx).toContain('key fields only, the latest full snapshot is above');
    expect(ctx).toContain('"capacity_bottleneck":"buyer_enquiries"');
  });

  it("doesn't give Janet the scaling layers", async () => {
    const ctx = await contextFor('janet');
    expect(ctx).not.toContain('HOW-TEXT');
    expect(ctx).not.toContain('RULES-TEXT');
    expect(ctx).not.toContain('decision_journal.csv');
  });

  it('lists a missing layer file as unavailable', async () => {
    const ctx = await contextFor('jarvis', ['scaling/SITUATIONS.md']);
    expect(ctx).toContain('UNAVAILABLE THIS TURN');
    expect(ctx).toContain('scaling/SITUATIONS.md: not found in stayful-ads (404)');
    expect(ctx).toContain('HOW-TEXT');
  });
});

describe('prompt: HOW JARVIS DECIDES', () => {
  const now = new Date('2026-10-16T09:00:00Z');
  const ctx = '=== MARKETING CONTEXT ===\nx';

  it('appears with the marketing context and not without it', () => {
    expect(buildSystemPrompt({ now, persona: 'jarvis' })).not.toContain('HOW JARVIS DECIDES');
    const p = buildSystemPrompt({ now, persona: 'jarvis', marketingContext: ctx });
    expect(p).toContain('HOW JARVIS DECIDES');
    expect(p).toContain('You reason from the data, not a fixed rule book.');
    expect(p).toContain('S99');
    expect(p).toContain('six parts');
    expect(p).toContain('£18 pause line');
    expect(p).toContain('never Facebook Page or Instagram engagers');
    expect(p).toContain('starting or ending an A/B test');
  });

  it('tells Janet the lanes and verdicts are JARVIS’s', () => {
    const p = buildSystemPrompt({ now, persona: 'janet', marketingContext: ctx });
    expect(p).toContain('This is how JARVIS reasons.');
    expect(p).toContain('the lanes, verdicts and timing are JARVIS');
    expect(p).toContain('<handoff>');
  });
});
