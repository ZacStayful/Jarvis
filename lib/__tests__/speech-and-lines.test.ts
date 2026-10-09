import { describe, it, expect } from 'vitest';
import {
  nextSpeakableChunks,
  completeSentences,
  stripMarkdownForSpeech,
  speakablePortion,
} from '@/lib/speech-chunks';
import { buildGreeting, localTimeParts, timeBandForHour, thinkingLine } from '@/lib/jarvis-lines';
import { PERSONAS, PERSONA_IDS, getPersona } from '@/lib/personas';
import { buildSystemPrompt } from '@/lib/jarvis-system-prompt';

describe('speech-chunks', () => {
  it('finds complete sentences and ignores decimals', () => {
    const s = completeSentences('Conversion is 3.5% this week. Up from 2.1%. Still');
    expect(s.map(x => x.text)).toEqual(['Conversion is 3.5% this week.', 'Up from 2.1%.']);
  });

  it('speaks the first sentence as soon as it is complete', () => {
    const text = 'Good question, sir. There are three things worth';
    const r = nextSpeakableChunks(text, 0, { first: true });
    expect(r.chunks).toEqual(['Good question, sir.']);
    expect(text.slice(r.upTo)).toBe('There are three things worth');
  });

  it('batches later sentences to about minChars and flushes on final', () => {
    const text = 'One. Two. Three. Four is a much longer sentence that pushes us over the limit. Tail';
    // First call: the opening sentence goes out alone, then the rest batch up
    // once they pass minChars — two chunks from one tick is expected.
    const a = nextSpeakableChunks(text, 0, { first: true, minChars: 60 });
    expect(a.chunks).toEqual([
      'One.',
      'Two. Three. Four is a much longer sentence that pushes us over the limit.',
    ]);
    // Short complete sentences under minChars are held back…
    const held = 'Short one. Tiny. Then an incomplete';
    const h = nextSpeakableChunks(held, 0, { first: false, minChars: 60 });
    expect(h.chunks).toEqual([]);
    expect(h.upTo).toBe(0);
    // …and flushed on final along with the incomplete tail.
    const c = nextSpeakableChunks(text, a.upTo, { first: false, final: true });
    expect(c.chunks).toEqual(['Tail']);
    expect(c.upTo).toBe(text.length);
  });

  it('never speaks an action request or hand-off tag', () => {
    const text = 'Drafted, sir. <action_request>{"id":"x"}</action_request>';
    expect(speakablePortion(text)).toBe('Drafted, sir. ');
    const r = nextSpeakableChunks(text, 0, { first: true, final: true });
    expect(r.chunks).toEqual(['Drafted, sir.']);
  });

  it('strips markdown', () => {
    expect(stripMarkdownForSpeech('## Title\n- **Bold** item\n1. first `code`')).toBe(
      'Title Bold item first code'
    );
  });
});

describe('jarvis-lines', () => {
  it('maps hours to bands', () => {
    expect(timeBandForHour(3)).toBe('lateNight');
    expect(timeBandForHour(7)).toBe('earlyMorning');
    expect(timeBandForHour(10)).toBe('morning');
    expect(timeBandForHour(14)).toBe('afternoon');
    expect(timeBandForHour(19)).toBe('evening');
    expect(timeBandForHour(23)).toBe('lateNight');
  });

  it('uses London time', () => {
    // 2026-07-01T06:30Z is 07:30 BST
    const t = localTimeParts(new Date('2026-07-01T06:30:00Z'));
    expect(t.hour).toBe(7);
    expect(t.weekdayName).toBe('Wednesday');
  });

  it('greets per persona and band, deterministically', () => {
    const friday = new Date('2026-10-09T09:00:00Z'); // Friday morning
    const g = buildGreeting('jarvis', friday, 1);
    expect(PERSONAS.jarvis.greetings.morning).toContain(g);
    const g2 = buildGreeting('janet', friday, 0);
    expect(g2.startsWith(PERSONAS.janet.greetings.morning[0])).toBe(true);
    expect(g2).toContain('Friday');
  });

  it('every persona has every bank filled', () => {
    for (const id of PERSONA_IDS) {
      const p = getPersona(id);
      for (const band of Object.keys(p.greetings) as Array<keyof typeof p.greetings>) {
        expect(p.greetings[band].length).toBeGreaterThan(0);
      }
      expect(p.handoverLines.length).toBeGreaterThan(0);
      expect(p.presenceResponses.length).toBeGreaterThan(0);
      expect(p.thinkingLines.length).toBeGreaterThan(0);
      expect(p.errorLine.length).toBeGreaterThan(0);
      expect(thinkingLine(id, 0)).toBe(p.thinkingLines[0]);
    }
  });
});

describe('system prompt', () => {
  const now = new Date('2026-10-09T13:05:00Z');

  it('frames the team and never calls itself a narrow assistant', () => {
    const p = buildSystemPrompt({ persona: 'jarvis', now });
    expect(p).not.toContain('not a general assistant');
    expect(p).toContain('managing director');
    expect(p).toContain('marketing creative director');
    expect(p).toContain('WORKING TOGETHER');
    expect(p).toContain('<handoff to="janet">');
    expect(p).toContain('Friday');
  });

  it('follows the persona', () => {
    expect(buildSystemPrompt({ persona: 'janet', now })).toContain('You are Janet');
    expect(buildSystemPrompt({ persona: 'janet', now })).toContain('<handoff to="jarvis">');
  });

  it('is written for the ear in both modes, with length guidance by mode', () => {
    const voice = buildSystemPrompt({ persona: 'jarvis', now, inputMode: 'voice' });
    const text = buildSystemPrompt({ persona: 'jarvis', now, inputMode: 'text' });
    expect(voice).toContain('No markdown');
    expect(text).toContain('No markdown');
    expect(voice).toContain('SPOKE');
    expect(text).toContain('TYPED');
  });

  it('adds view and live-data blocks only when given', () => {
    const base = buildSystemPrompt({ now });
    expect(base).not.toMatch(/\nACTIVE VIEW\n/);
    expect(base).not.toMatch(/\nLIVE VIEW DATA\n/);
    const withView = buildSystemPrompt({ now, activeView: 'sales-dashboard', viewJustOpened: true, viewContext: 'Pipeline: 12 leads' });
    expect(withView).toMatch(/\nACTIVE VIEW\n/);
    expect(withView).toMatch(/\nLIVE VIEW DATA\n/);
    expect(withView).toContain('already spoken a one-line acknowledgement');
    expect(withView).toContain('Pipeline: 12 leads');
  });

  it('puts the current time last', () => {
    const p = buildSystemPrompt({ now, viewContext: 'x', handoffNote: 'note' });
    expect(p.lastIndexOf('CURRENT CONTEXT')).toBeGreaterThan(p.lastIndexOf('HAND-OFF'));
  });
});
