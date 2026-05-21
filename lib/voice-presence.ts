// Presence-check matcher — "are you there?", "Jarvis?", etc.
// Intercepted locally so JARVIS acknowledges in <500ms instead of waiting
// 3+ seconds for Claude to round-trip. Used by app/page.tsx before any
// other routing.

const PRESENCE_PATTERNS: RegExp[] = [
  /\bare you there\b/,
  /\bare you listening\b/,
  /\bcan you hear me\b/,
  /\bstill there\b/,
  /\byou there\b/,
  /\bdo you read me\b/,
  /\bare you online\b/,
  /\bare you ready\b/,
  // Wake-word-only calls: "Jarvis?", "Hey Jarvis", "Hello Jarvis"
  /^\s*(hello|hi|hey|yo|ok|okay)\s+jarvis\s*[?.!]*\s*$/,
  /^\s*jarvis\s*[?.!]*\s*$/,
];

const RESPONSES: string[] = [
  "Yes, sir. Listening.",
  "Online, sir. Awaiting your command.",
  "Here, sir. Ready when you are.",
  "Standing by, sir.",
  "Listening, sir.",
];

export function isPresenceCheck(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return PRESENCE_PATTERNS.some((p) => p.test(lower));
}

export function presenceResponse(): string {
  return RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
}
