import { describe, it, expect } from 'vitest';
import { toApiMessages, stripHandoff, extractActionRequest } from '@/hooks/useJARVIS';
import type { Message } from '@/types/jarvis';

const msg = (over: Partial<Message> & { role: 'user' | 'assistant'; content: string }): Message =>
  ({
    id: Math.random().toString(36).slice(2),
    type: 'text',
    timestamp: new Date(),
    isStreaming: false,
    ...over,
  }) as Message;

describe('toApiMessages', () => {
  it('drops local messages, empties and streaming placeholders', () => {
    const history: Message[] = [
      msg({ role: 'assistant', content: 'Good morning, sir.', local: true }),
      msg({ role: 'user', content: 'hello' }),
      msg({ role: 'assistant', content: '' }),
      msg({ role: 'assistant', content: 'Hello.', isStreaming: true }),
      msg({ role: 'assistant', content: 'Hello, sir.' }),
    ];
    expect(toApiMessages(history)).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'Hello, sir.' },
    ]);
  });

  it('never starts with an assistant turn', () => {
    const history: Message[] = [
      msg({ role: 'assistant', content: 'restored reply' }),
      msg({ role: 'user', content: 'next question' }),
    ];
    expect(toApiMessages(history)[0]).toEqual({ role: 'user', content: 'next question' });
  });

  it('returns nothing when there is no user turn', () => {
    expect(toApiMessages([msg({ role: 'assistant', content: 'hi' })])).toEqual([]);
  });
});

describe('stripHandoff / extractActionRequest', () => {
  it('strips a trailing hand-off tag', () => {
    expect(stripHandoff('Janet, your call.\n<handoff to="janet">which angle next</handoff>')).toBe(
      'Janet, your call.'
    );
  });

  it('leaves text without a tag alone', () => {
    expect(stripHandoff('Plain reply.')).toBe('Plain reply.');
  });

  it('pulls an action request out of the text', () => {
    const { cleanText, actionRequest } = extractActionRequest(
      'Drafted.\n<action_request>{"id":"req_1","type":"send_email","description":"d","details":{"to":"a","subject":"s","body":"b"}}</action_request>'
    );
    expect(cleanText).toBe('Drafted.');
    expect(actionRequest?.type).toBe('send_email');
  });
});
