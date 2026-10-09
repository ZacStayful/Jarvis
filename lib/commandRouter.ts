// ─────────────────────────────────────────────────────────────────────────────
// JARVIS view routes + marketing-department detection
//
// The rich views that app/page.tsx can mount in the main panel. All routing
// is decided on the client (see the utterance chain in app/page.tsx); the
// chat route is told which view is open via `activeView` in the request
// body and uses detectMarketingCommand / detectAddressedDirector only to
// decide whether to attach the MARKETING CONTEXT block.
// ─────────────────────────────────────────────────────────────────────────────

import type { Director } from '@/lib/ads/types';

export type ViewRoute =
  | 'marketing-department'
  | 'news-briefing'
  | 'investment-dashboard'
  | 'retention-dashboard'
  | null;

// Marketing department (read-only stayful-ads data). Checked before the news
// handler on the client: "department briefing" would otherwise be read as a
// news request. Kept specific so it doesn't steal other intents — no bare
// "scale" (Stayful's growth), "brief me", "campaign" (Lucy campaigns) or
// "script" (Lucy's script). Neither name is in here: addressing Janet or
// JARVIS is handled by lib/persona-commands.ts, and a sentence *about* Janet
// ("Janet mentioned the hook yesterday") must not open the department.
const MARKETING_PATTERNS = [
  /\bads\b/i,
  /\badverts?\b/i,
  /\badvertising\b/i,
  /\bad (spend|sets?|accounts?|campaigns?|budget|creatives?|angles?|scripts?|copy|performance|results?)\b/i,
  /\b(facebook|meta)\b/i,
  /\bbudget\b/i,
  /\bcost per (lead|enquiry)\b/i,
  /\b(cpl|cpm|ctr)\b/i,
  /\bscaling\b/i,
  /\bshould (i|we) scale\b/i,
  /\bscale (it|up|the (ads|budget|campaign))\b/i,
  /\bmarketing\b/i,
  /\bdepartment\b/i,
  /\bcreatives?\b/i,
  /\bbriefs\b/i,
  /\b(the|a|new|next|creative|ad) brief\b/i,
  /\bb\d{3}\b/i,
  /\bangles\b/i,
  /\bangle \d+[a-z]?\b/i,
  /\bwhat are we (making|building)\b/i,
  /\bvoice ?overs?\b/i,
  /\blookalikes?\b/i,
  /\blead forms?\b/i,
  /\bwhich ads?\b/i,
  /\b(weak|weakening|strongest|winning|losing) ads?\b/i,
];

/** True when the message is for the marketing department. */
export function detectMarketingCommand(message: string): boolean {
  const trimmed = message.trim();
  return MARKETING_PATTERNS.some(r => r.test(trimmed));
}

// Creative words that mean Janet's files are needed even when Zac opens with
// "Jarvis, …" (it's also the app's wake word).
const CREATIVE_TOPIC =
  /\b(creatives?|briefs?|angles?|scripts?|voice ?overs?|hooks?|making|building|studio|carousel|video|photo|which ads?|weak(?:er|ening)?)\b/i;

/** Which marketing director Zac addressed, for scoping the context files.
 *  'both' when neither (or both) is named, or Jarvis is named but the
 *  question is about creative. */
export function detectAddressedDirector(message: string): Director | 'both' {
  const janet = /\bjanet\b/i.test(message);
  const jarvis = /\bjarvis\b/i.test(message);
  if (janet && !jarvis) return 'janet';
  if (jarvis && !janet && !CREATIVE_TOPIC.test(message)) return 'jarvis';
  return 'both';
}
