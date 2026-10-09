// ─────────────────────────────────────────────────────────────────────────────
// JARVIS view routes + marketing-department and capacity detection
//
// The rich views that app/page.tsx can mount in the main panel. All routing
// is decided on the client (see the utterance chain in app/page.tsx); the
// chat route is told which view is open via `activeView` in the request
// body and uses detectMarketingCommand / isCapacityQuestion /
// detectAddressedDirector only to decide whether to attach the MARKETING
// CONTEXT block.
// ─────────────────────────────────────────────────────────────────────────────

import type { Director } from '@/lib/ads/types';
import { normalise } from '@/lib/intent-utils';

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

// Lead-database capacity: how many buyers the landlord leads support, the
// buyer enquiries and web meetings that takes, and the bottleneck. Answered
// from the snapshot's `capacity` block, and it's JARVIS's (the budget and
// scaling decision rest on it). Strict phrases only, matched anywhere; the
// word "capacity" counts only beside leads/buyers/customers/meetings, so
// "a meeting with a landlord about capacity at his flat" stays a sentence.
const CAPACITY_PATTERNS = [
  /\bbottlenecks?\b/,
  /\bcustomer ceiling\b/,
  /\bhow many (?:more )?(?:customers|buyers|(?:web )?meetings|leads) do (?:we|i) need\b/,
  /\bcan we sell (?:all )?(?:of )?(?:the |our )?leads\b/,
  /\bare (?:the |our )?buyers full\b/,
  /\bcredits? (?:are |is )?owed\b/,
  /\bsales per lead\b/,
  /\b(?:lead|buyer|customer|meeting)s? capacity\b/,
  /\bcapacity (?:for|of|to take|to sell|to handle) (?:more )?(?:the |our )?(?:leads|buyers|customers|meetings)\b/,
];

// A bottleneck in the ads studio is Janet's ("what's the bottleneck on the
// creative side?"), so creative words keep the marketing route.
const CREATIVE_WORK = /\b(?:creatives?|creative side|briefs?|angles?|scripts?|voice ?overs?|hooks?|studio)\b/;

/** True for a lead-database capacity question. */
export function isCapacityQuestion(message: string): boolean {
  const n = normalise(message);
  if (!n || CREATIVE_WORK.test(n)) return false;
  return CAPACITY_PATTERNS.some(r => r.test(n));
}

/** A capacity question goes to JARVIS unless Zac addressed Janet, either
 *  by switching to her this utterance (`addressed`) or by name in it. */
export function capacityGoesToJarvis(message: string, addressed: Director | null): boolean {
  if (addressed === 'janet' || detectAddressedDirector(message) === 'janet') return false;
  return isCapacityQuestion(message);
}

// "show me the department, what's the bottleneck?" — a capacity answer opens
// the department view only when Zac asks to see it.
const DEPARTMENT_VIEW_ASK =
  /\b(?:open|show(?: me)?|pull up|bring up|take me to|go to|let'?s see)\b.*\b(?:department|marketing)\b/;

export function asksToSeeDepartment(message: string): boolean {
  return DEPARTMENT_VIEW_ASK.test(normalise(message));
}
