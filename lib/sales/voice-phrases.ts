// lib/sales/voice-phrases.ts
// Phrase libraries for JARVIS conversational voice system.
// All phrases are varied so consecutive interactions feel natural.

export function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Opening the sales view ──────────────────────────────────────
export const SALES_OPEN = [
  "Opening Sales Intelligence, sir.",
  "Pulling up Sales Intelligence now, sir.",
  "Right away, sir — loading Sales Intelligence.",
  "On it, sir. Bringing up the sales dashboard.",
];

// ── Loading messages (spoken every 3s then every 5s) ───────────
export const LOADING = [
  "Still loading your pipeline data, sir.",
  "Compiling your metrics, sir.",
  "Just a moment — pulling from the board, sir.",
  "Still processing, sir.",
  "Almost there, sir.",
  "Working on that for you, sir.",
  "Gathering the data now, sir.",
  "One moment, sir.",
  "Still crunching the numbers, sir.",
  "Bear with me, sir — nearly done.",
];

// ── Data ready ─────────────────────────────────────────────────
export const DATA_READY = [
  "Sales Intelligence is ready, sir.",
  "All data loaded, sir.",
  "Pipeline data is in, sir.",
  "Ready, sir.",
];

// ── Section navigation acknowledgements ───────────────────────
export const SECTION_ACK: Record<string, string[]> = {
  funnel: [
    "Here's your sales funnel, sir.",
    "Funnel view, sir.",
    "Your pipeline breakdown, sir.",
  ],
  pipeline: [
    "Pipeline snapshot, sir.",
    "Here's the current state of your pipeline, sir.",
    "Live pipeline view, sir.",
  ],
  outreach: [
    "Outreach activity, sir.",
    "Pulling up your outreach metrics, sir.",
    "Here's your outreach data, sir.",
  ],
  efficiency: [
    "Efficiency metrics, sir.",
    "Here's how much activity it's taking to convert, sir.",
    "Activity-to-conversion data, sir.",
  ],
  abandonment: [
    "Drop-off intelligence, sir.",
    "Here's why leads are dropping off, sir.",
    "Abandonment analysis, sir.",
  ],
  offers: [
    "Active offers, sir.",
    "Here are your special offers, sir.",
    "Offer management, sir.",
  ],
  query: [
    "Ready for your questions, sir.",
    "Ask away, sir.",
    "What would you like to know, sir?",
  ],
};

// ── Query / hypothetical processing ───────────────────────────
export const QUERY_START = [
  "Calculating that for you, sir.",
  "On it, sir.",
  "Working on that now, sir.",
  "Let me run that for you, sir.",
  "Analysing that, sir.",
  "One moment, sir — running the numbers.",
];

export const QUERY_LOADING = [
  "Still working on that, sir.",
  "Almost there, sir.",
  "Just a moment more, sir.",
  "Processing your query, sir.",
  "Nearly done, sir.",
];

// ── Follow-up suggestions after answering ─────────────────────
export const FOLLOW_UP: string[] = [
  "Would you like me to dig deeper into any of those figures, sir?",
  "Shall I identify which leads are closest to converting, sir?",
  "Would you like a recommended action plan based on that, sir?",
  "Is there a specific lead or metric you'd like me to focus on, sir?",
  "Want me to model a different scenario, sir?",
  "Anything else from the pipeline you'd like to explore, sir?",
];

// ── Silence prompt (after 30s of no interaction) ───────────────
export const SILENCE_PROMPT = [
  "Anything you'd like to explore further, sir?",
  "Is there anything else I can help you with, sir?",
  "Ready when you are, sir.",
];

// ── General acknowledgements ──────────────────────────────────
export const ACK = [
  "Of course, sir.",
  "Right away.",
  "Understood.",
  "Certainly, sir.",
  "On it.",
  "Sure thing, sir.",
];

// ── Closing the sales view ─────────────────────────────────────
export const SALES_CLOSE = [
  "Closing Sales Intelligence, sir.",
  "Right, closing the dashboard, sir.",
  "Returning to the main view, sir.",
];

// ── Priority alert prefix (spoken before auto-briefing) ────────
export const PRIORITY_PREFIX = [
  "Before I run through the full picture —",
  "One thing to flag first, sir —",
  "Heads up before the briefing, sir —",
];

// ── "Focus on today" command ──────────────────────────────────
export const FOCUS_TODAY_START = [
  "Let me assess your priorities for today, sir.",
  "Reviewing the pipeline for today's focus, sir.",
  "Analysing what needs attention today, sir.",
];
