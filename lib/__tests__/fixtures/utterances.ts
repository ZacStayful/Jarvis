// Zac's real phrasings, with what each one must do. Shared by the matcher
// tests so a change to one matcher is checked against the whole set.

export type Expected =
  | { kind: 'news'; category?: string | null }
  | { kind: 'lucy' }
  | { kind: 'portfolio' }
  | { kind: 'investment' }
  | { kind: 'sales' }
  | { kind: 'marketing' }
  | { kind: 'retention' }
  | { kind: 'capacity' } // lead-database capacity question → JARVIS, no view change
  | { kind: 'pane'; view: string }
  | { kind: 'presence' }
  | { kind: 'persona'; persona: 'jarvis' | 'janet'; remainder?: string }
  | { kind: 'claude' }; // nothing local fires — the message goes to Claude

export const UTTERANCES: Array<{ text: string; expect: Expected; note?: string }> = [
  // ── Must route locally ───────────────────────────────────────────────────
  { text: 'Jarvis, open the news', expect: { kind: 'news', category: null } },
  { text: 'news please', expect: { kind: 'news', category: null } },
  { text: 'open the briefing', expect: { kind: 'news', category: null } },
  { text: "what's the latest in AI news", expect: { kind: 'news', category: 'ai-tech' } },
  { text: 'take me to political news', expect: { kind: 'news', category: 'uk-politics' } },
  { text: 'can you pull up the news for me', expect: { kind: 'news', category: null } },
  { text: 'show me my leads', expect: { kind: 'lucy' } },
  { text: 'open monday', expect: { kind: 'lucy' } },
  { text: 'open the pipeline', expect: { kind: 'lucy' } },
  { text: 'how are we doing', expect: { kind: 'sales' } },
  { text: 'open sales', expect: { kind: 'sales' } },
  { text: 'open portfolio', expect: { kind: 'portfolio' } },
  { text: 'show my holdings', expect: { kind: 'portfolio' } },
  { text: 'open the investment dashboard', expect: { kind: 'investment' } },
  { text: 'how are the ads doing?', expect: { kind: 'marketing' } },
  { text: 'department briefing', expect: { kind: 'marketing' } },
  { text: 'which ads are getting weaker?', expect: { kind: 'marketing' } },
  { text: 'should we scale the budget', expect: { kind: 'marketing' } },
  { text: 'show me customer retention', expect: { kind: 'retention' } },
  { text: 'open the lead database', expect: { kind: 'retention' }, note: 'Lucy also matches "open … lead"; the retention handler runs first in the chain' },
  { text: "what's our churn rate", expect: { kind: 'retention' } },
  { text: 'how many new leads have come into the lead database', expect: { kind: 'retention' } },
  { text: 'how is the lead database doing', expect: { kind: 'retention' } },
  { text: 'retention', expect: { kind: 'retention' } },
  { text: "what's the bottleneck?", expect: { kind: 'capacity' } },
  { text: "Jarvis, what's the bottleneck right now?", expect: { kind: 'capacity' } },
  { text: "what's our customer ceiling", expect: { kind: 'capacity' } },
  { text: 'how many customers do we need?', expect: { kind: 'capacity' } },
  { text: 'how many buyers do we need this month', expect: { kind: 'capacity' } },
  { text: 'how many web meetings do we need?', expect: { kind: 'capacity' } },
  { text: 'how many meetings do we need', expect: { kind: 'capacity' } },
  { text: 'how many leads do we need', expect: { kind: 'capacity' } },
  { text: 'can we sell all the leads?', expect: { kind: 'capacity' } },
  { text: 'are buyers full?', expect: { kind: 'capacity' } },
  { text: 'how many credits are owed', expect: { kind: 'capacity' } },
  { text: "what's the sales per lead", expect: { kind: 'capacity' } },
  { text: 'do we have the buyer capacity for more leads', expect: { kind: 'capacity' } },
  { text: 'is there capacity for more buyers', expect: { kind: 'capacity' } },
  { text: "what's the bottleneck on the creative side?", expect: { kind: 'marketing' }, note: 'a creative bottleneck is Janet\'s' },
  { text: 'open tasks', expect: { kind: 'pane', view: 'tasks' } },
  { text: 'show the command centre', expect: { kind: 'pane', view: 'command' } },
  { text: 'are you there?', expect: { kind: 'presence' } },
  { text: 'Jarvis?', expect: { kind: 'presence' } },
  { text: 'hey jarvis', expect: { kind: 'presence' } },
  { text: 'switch to Janet', expect: { kind: 'persona', persona: 'janet' } },
  { text: 'let me talk to Janet please', expect: { kind: 'persona', persona: 'janet' } },
  { text: 'Janet, what angle should we run next?', expect: { kind: 'persona', persona: 'janet', remainder: 'what angle should we run next?' } },
  { text: 'Janet what do you think of the hook', expect: { kind: 'persona', persona: 'janet', remainder: 'what do you think of the hook' } },
  { text: "Janet, what's the bottleneck on the creative side?", expect: { kind: 'persona', persona: 'janet', remainder: "what's the bottleneck on the creative side?" }, note: 'stays with Janet' },

  // ── Must reach Claude untouched ──────────────────────────────────────────
  { text: 'I had a conversation with a landlord about the pipeline', expect: { kind: 'claude' } },
  { text: 'what do you think about Tesla stock', expect: { kind: 'claude' } },
  { text: 'are you ready to go through the leads?', expect: { kind: 'claude' } },
  { text: "I'll do it on Monday", expect: { kind: 'claude' } },
  { text: 'any recent calls from landlords?', expect: { kind: 'claude' } },
  { text: 'the technology is improving quickly these days', expect: { kind: 'claude' } },
  { text: 'what to do about the Leeds property', expect: { kind: 'claude' } },
  { text: 'any news from the landlord in Leeds?', expect: { kind: 'claude' } },
  { text: 'what does this mean for our business?', expect: { kind: 'claude' }, note: 'briefing open' },
  { text: 'wait, explain that bit about rates to me again', expect: { kind: 'claude' }, note: 'briefing open' },
  { text: 'Janet mentioned the hook yesterday', expect: { kind: 'claude' }, note: 'talking about Janet' },
  { text: 'tell me a joke', expect: { kind: 'claude' } },
  { text: "what's the capital of Peru", expect: { kind: 'claude' } },
  { text: "how's your day going", expect: { kind: 'claude' } },
  { text: "what's your conviction on the Leeds deal?", expect: { kind: 'claude' } },
  { text: 'can you share the doc with me', expect: { kind: 'claude' } },
  { text: 'the landlord asked about retention of the deposit', expect: { kind: 'claude' } },
  { text: 'we lost a subscriber to churn last month', expect: { kind: 'claude' } },
  { text: 'I had a meeting with a landlord about capacity at his flat', expect: { kind: 'claude' }, note: 'capacity, but not of leads/buyers/meetings' },
  { text: 'what should I do about my schedule this week', expect: { kind: 'claude' } },
];
