import { describe, it, expect } from 'vitest';
import { parseSnapshot } from '@/lib/ads/department';
import { asksToSeeDepartment, capacityGoesToJarvis, isCapacityQuestion } from '@/lib/commandRouter';
import { buildSystemPrompt } from '@/lib/jarvis-system-prompt';
import { SNAPSHOT_WITH_CAPACITY, SNAPSHOT_WITHOUT_CAPACITY } from './fixtures/capacity-snapshot';

describe('parseSnapshot: capacity block', () => {
  it('keeps the block as written', () => {
    const snapshot = parseSnapshot(SNAPSHOT_WITH_CAPACITY);
    expect(snapshot?.capacity?.bottleneck?.stage).toBe('buyer_enquiries');
    expect(snapshot?.capacity?.stages).toHaveLength(9);
    expect(snapshot?.capacity?.demand?.customers_unpaused).toBe(44);
    expect(snapshot?.capacity?.pipeline?.low_sample).toEqual(['close_rate_pct']);
    expect(snapshot?.creative?.reserve_count).toBe(4);
  });

  it('defaults a missing block to null, like creative', () => {
    const snapshot = parseSnapshot(SNAPSHOT_WITHOUT_CAPACITY);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.capacity).toBeNull();
    expect(snapshot?.creative).toBeNull();
  });

  it('keeps an explicit null', () => {
    expect(parseSnapshot(JSON.stringify({ capacity: null }))?.capacity).toBeNull();
  });
});

describe('isCapacityQuestion', () => {
  it('matches the strict capacity phrases anywhere', () => {
    for (const text of [
      "what's the bottleneck?",
      'where are the bottlenecks in the lead database',
      "what's our customer ceiling",
      'how many more buyers do we need',
      'how many web meetings do we need to hit that?',
      'can we sell all of the leads',
      'are our buyers full?',
      'credits owed this week',
      "what's sales per lead running at",
      'have we got the meeting capacity for that',
      'do we have capacity to take more leads',
    ]) {
      expect(isCapacityQuestion(text), text).toBe(true);
    }
  });

  it('leaves sentences and other topics alone', () => {
    for (const text of [
      'I had a meeting with a landlord about capacity at his flat',
      'the venue has a capacity of two hundred',
      "what's the bottleneck on the creative side?",
      'is the studio the bottleneck on briefs?',
      "what's our churn rate",
      'how are the ads doing?',
      'how many new leads have come into the lead database',
      'we need more leads',
    ]) {
      expect(isCapacityQuestion(text), text).toBe(false);
    }
  });
});

describe('capacityGoesToJarvis', () => {
  it('goes to JARVIS unless Janet was addressed', () => {
    expect(capacityGoesToJarvis("what's the bottleneck?", null)).toBe(true);
    expect(capacityGoesToJarvis("what's the bottleneck?", 'jarvis')).toBe(true);
    expect(capacityGoesToJarvis("Jarvis, what's the bottleneck?", null)).toBe(true);
    // "Janet, …" switched this utterance (remainder) or already talking to her (name kept)
    expect(capacityGoesToJarvis("what's the bottleneck?", 'janet')).toBe(false);
    expect(capacityGoesToJarvis("Janet, what's the bottleneck?", null)).toBe(false);
    expect(capacityGoesToJarvis("Janet, what's the bottleneck on the creative side?", null)).toBe(false);
  });
});

describe('asksToSeeDepartment', () => {
  it('only when Zac asks to see it', () => {
    expect(asksToSeeDepartment("show me the department, what's the bottleneck?")).toBe(true);
    expect(asksToSeeDepartment('open marketing and tell me how many buyers we need')).toBe(true);
    expect(asksToSeeDepartment("what's the bottleneck?")).toBe(false);
    expect(asksToSeeDepartment('how many buyers does the department need?')).toBe(false);
  });
});

describe('prompt: CAPACITY rules', () => {
  const now = new Date('2026-10-16T09:00:00Z');
  const ctx = '=== MARKETING CONTEXT ===\nx';

  it('appear with the MARKETING DEPARTMENT block and not without it', () => {
    const plain = buildSystemPrompt({ now, persona: 'jarvis' });
    expect(plain).not.toContain('CAPACITY (the lead database');
    expect(plain).not.toContain('Lead database:');

    const withCtx = buildSystemPrompt({ now, persona: 'jarvis', marketingContext: ctx });
    expect(withCtx).toMatch(/\nMARKETING DEPARTMENT\n/);
    expect(withCtx).toContain('CAPACITY (the lead database');
    expect(withCtx).toContain('the landlord leads decide the ceiling');
    expect(withCtx).toContain('leads landing where no buyer covers');
    expect(withCtx).toContain('small sample');
    expect(withCtx).toContain("hasn't measured it yet");
    expect(withCtx).toContain('Essential Scents');
    expect(withCtx).toContain('Lead database: <capacity.demand.customers_unpaused>');
    expect(withCtx).toContain('Capacity questions are yours');
  });

  it('tells Janet to hand capacity to JARVIS', () => {
    const janet = buildSystemPrompt({ now, persona: 'janet', marketingContext: ctx });
    expect(janet).toContain("Capacity questions are JARVIS's");
    expect(janet).toContain('<handoff>');
  });
});
