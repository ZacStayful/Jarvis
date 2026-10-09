import { describe, it, expect } from 'vitest';
import { UTTERANCES } from './fixtures/utterances';
import { isCommandShaped, normalise, isWholeUtterance } from '@/lib/intent-utils';
import { isPresenceCheck } from '@/lib/voice-presence';
import {
  isNewsRequest,
  isCategorySwitch,
  isStopPhrase,
  isNoMorePhrase,
  isSummariseRequest,
  detectCategoryFocus,
} from '@/lib/voice-news-intents';
import { routeCommand } from '@/lib/jarvis-design';
import { detectLucyCommand } from '@/lib/lucy-commands';
import { detectPortfolioCommand } from '@/lib/portfolio/commands';
import { detectSalesCommand, isSalesQuestion } from '@/lib/sales/commands';
import { detectInvestmentCommand } from '@/lib/investment-commands';
import { detectPersonaSwitch } from '@/lib/persona-commands';
import { detectMarketingCommand, detectAddressedDirector, isCapacityQuestion } from '@/lib/commandRouter';
import { detectRetentionCommand, isRetentionQuestion, OTHER_VIEW_RE } from '@/lib/retention/commands';

describe('intent-utils', () => {
  it('normalises wake words and politeness', () => {
    expect(normalise('Hey Jarvis, can you open the news please')).toBe('open the news');
    expect(normalise('Janet, what angle next?')).toBe('what angle next');
    expect(normalise('News!')).toBe('news');
  });

  it('recognises command shape', () => {
    expect(isCommandShaped('open the pipeline')).toBe(true);
    expect(isCommandShaped('news')).toBe(true);
    expect(isCommandShaped('can you pull up the news for me')).toBe(true);
    expect(isCommandShaped('I had a conversation with a landlord about the pipeline')).toBe(false);
    expect(isCommandShaped("what's your view on the pipeline")).toBe(false);
  });

  it('matches whole utterances only', () => {
    expect(isWholeUtterance('are you there?', /are you there/)).toBe(true);
    expect(isWholeUtterance('are you there for the meeting', /are you there/)).toBe(false);
  });
});

describe('local routing against the shared utterance table', () => {
  for (const { text, expect: want, note } of UTTERANCES) {
    it(`${JSON.stringify(text)} → ${want.kind}${note ? ` (${note})` : ''}`, () => {
      const presence = isPresenceCheck(text);
      const persona = detectPersonaSwitch(text, 'jarvis');
      const news = isNewsRequest(text);
      const category = detectCategoryFocus(normalise(text));
      const lucy = detectLucyCommand(text);
      const portfolio = detectPortfolioCommand(text);
      const sales = detectSalesCommand(text);
      const investment = detectInvestmentCommand(text);
      const pane = routeCommand(text);
      const marketing = detectMarketingCommand(text);
      const retention = detectRetentionCommand(text);
      const capacity = isCapacityQuestion(text);

      const fired = {
        presence,
        persona: persona?.persona ?? null,
        news,
        lucy: lucy === 'navigate',
        portfolio: portfolio === 'navigate',
        sales: sales === 'navigate',
        investment: !!investment,
        pane,
        marketing,
        retention: retention === 'navigate',
        capacity,
      };

      // The capacity check runs ahead of marketing, retention, news and the
      // nav intents, so it must not claim any phrasing routed elsewhere.
      if (want.kind !== 'capacity' && want.kind !== 'persona') {
        expect(fired.capacity).toBe(false);
      }

      switch (want.kind) {
        case 'presence':
          expect(fired.presence).toBe(true);
          break;
        case 'persona':
          expect(fired.persona).toBe(want.persona);
          if (want.remainder !== undefined) expect(persona?.remainder).toBe(want.remainder);
          break;
        case 'news':
          expect(fired.news).toBe(true);
          if (want.category !== undefined) expect(category).toBe(want.category);
          break;
        case 'lucy':
          expect(fired.lucy).toBe(true);
          break;
        case 'portfolio':
          expect(fired.portfolio).toBe(true);
          break;
        case 'sales':
          expect(fired.sales).toBe(true);
          break;
        case 'investment':
          expect(fired.investment).toBe(true);
          break;
        case 'marketing':
          expect(fired.marketing).toBe(true);
          break;
        case 'retention':
          expect(fired.retention).toBe(true);
          break;
        case 'capacity':
          expect(fired.capacity).toBe(true);
          break;
        case 'pane':
          expect(fired.pane).toBe(want.view);
          break;
        case 'claude':
          expect(fired).toEqual({
            presence: false,
            persona: null,
            news: false,
            lucy: false,
            portfolio: false,
            sales: false,
            investment: false,
            pane: null,
            marketing: false,
            retention: false,
            capacity: false,
          });
          break;
      }
    });
  }
});

describe('news conversation matchers', () => {
  it('stop / no-more only as short utterances', () => {
    expect(isStopPhrase('stop')).toBe(true);
    expect(isStopPhrase('ok stop')).toBe(true);
    expect(isStopPhrase('wait, explain that bit about rates to me again')).toBe(false);
    expect(isNoMorePhrase("no thanks")).toBe(true);
    expect(isNoMorePhrase("that's all")).toBe(true);
    expect(isNoMorePhrase('have we done the Leeds deal?')).toBe(false);
  });

  it('category switch needs a news noun, a switch verb, a bare word, or the awaiting state', () => {
    expect(isCategorySwitch('political', false)).toBe('uk-politics');
    expect(isCategorySwitch('switch to AI news', false)).toBe('ai-tech');
    expect(isCategorySwitch('what about property', false)).toBe('str-property');
    expect(isCategorySwitch('what does this mean for our business?', false)).toBeNull();
    expect(isCategorySwitch('business', true)).toBe('uk-business');
    expect(isCategorySwitch('the political one', true)).toBe('uk-politics');
  });

  it('summarise only when short or naming the news', () => {
    expect(isSummariseRequest('summarise the news')).toBe(true);
    expect(isSummariseRequest('recap')).toBe(true);
    expect(isSummariseRequest("walk me through how you'd approach the Leeds deal with the landlord")).toBe(false);
  });
});

describe('sales', () => {
  it('isSalesQuestion', () => {
    expect(isSalesQuestion("what's our conversion rate")).toBe(true);
    expect(isSalesQuestion('how many no shows this month')).toBe(true);
    expect(isSalesQuestion("what's the capital of Peru")).toBe(false);
    expect(isSalesQuestion("I'll get back to him")).toBe(false);
  });
});

describe('lead-database retention', () => {
  it('does not take the landlord pipeline phrases', () => {
    expect(detectRetentionCommand('how are we doing')).toBeNull();
    expect(detectRetentionCommand("what's our conversion rate")).toBeNull();
    expect(detectRetentionCommand('show me my leads')).toBeNull();
    expect(detectRetentionCommand('open the pipeline')).toBeNull();
  });

  it('bare nouns only when command-shaped', () => {
    expect(detectRetentionCommand('show me churn')).toBe('navigate');
    expect(detectRetentionCommand('subscribers')).toBe('navigate');
    expect(detectRetentionCommand('the churn of the river was loud and we talked for hours')).toBeNull();
  });

  it('isRetentionQuestion routes follow-ups to Claude while the view is open', () => {
    expect(isRetentionQuestion("what's the conversion rate")).toBe(true);
    expect(isRetentionQuestion('how many customers have cancelled')).toBe(true);
    expect(isRetentionQuestion('tell me a joke')).toBe(false);
    expect(OTHER_VIEW_RE.test('open the news')).toBe(true);
    expect(OTHER_VIEW_RE.test('how many meetings were booked')).toBe(false);
  });
});

describe('marketing department', () => {
  it('scopes the context by who was addressed', () => {
    expect(detectAddressedDirector('Janet, which ads are weakening?')).toBe('janet');
    expect(detectAddressedDirector('Jarvis, should we scale the budget?')).toBe('jarvis');
    expect(detectAddressedDirector('Jarvis, what are we building next?')).toBe('both');
    expect(detectAddressedDirector('how are the ads doing?')).toBe('both');
  });

  it('a name alone is not a marketing question', () => {
    expect(detectMarketingCommand('Janet mentioned the hook yesterday')).toBe(false);
    expect(detectMarketingCommand('is Janet there?')).toBe(false);
  });
});

describe('persona switching', () => {
  it('bare switches and addresses', () => {
    expect(detectPersonaSwitch('switch to janet', 'jarvis')).toEqual({ persona: 'janet', remainder: '' });
    expect(detectPersonaSwitch('get jarvis', 'janet')).toEqual({ persona: 'jarvis', remainder: '' });
    expect(detectPersonaSwitch('is janet there?', 'jarvis')).toEqual({ persona: 'janet', remainder: '' });
    expect(detectPersonaSwitch('JARVIS, what is on today?', 'janet')).toEqual({
      persona: 'jarvis',
      remainder: 'what is on today?',
    });
  });

  it('does not switch when already talking to them or when talking about them', () => {
    expect(detectPersonaSwitch('Jarvis, open the news', 'jarvis')).toBeNull();
    expect(detectPersonaSwitch('Janet said the hook was weak', 'jarvis')).toBeNull();
    expect(detectPersonaSwitch('thanks janet', 'janet')).toBeNull();
  });
});
