// lib/sales/commands.ts
// Voice/text command detection for the Sales Intelligence Dashboard.
//
// Two detectors:
//   - detectSalesCommand(text)  — used by the global app/page.tsx interceptor
//                                 to route the user TO /sales.
//   - detectSalesAction(text)   — used inside the /sales page to dispatch
//                                 focus / summarise / next / previous / close
//                                 actions on a focused chunk.

import type { ChunkId } from "@/components/sales/types";

const SALES_PATTERNS = [
  /\bsales?\s+dashboard\b/i,
  /\bshow\s+sales\b/i,
  /\bopen\s+sales\b/i,
  /\bsales\s+intelligence\b/i,
  /\bshow\s*(me\s+)?the\s+pipeline\b/i,
  /\bshow\s*(me\s+)?the\s+funnel\b/i,
  /\bhow\s+are\s+we\s+doing\b/i,
  /\bwhat'?s?\s+our\s+conversion\s+rate\b/i,
  /\bconversion\s+rate\b/i,
  /\bshow\s*(me\s+)?outreach\b/i,
  /\bshow\s*(me\s+)?offers\b/i,
  /\bspecial\s+offers\b/i,
  /\boffers?\s+expiring\b/i,
  /\bweb\s+meeting\s*(performance|metrics|stats)\b/i,
  /\bfocus\s+on\s+(pipeline|outreach|meetings?|offers?)\b/i,
];

export type SalesCommand = "navigate" | null;

export function detectSalesCommand(text: string): SalesCommand {
  const lower = text.toLowerCase().trim();
  for (const pattern of SALES_PATTERNS) {
    if (pattern.test(lower)) return "navigate";
  }
  return null;
}

export type SalesAction =
  | { kind: "focus"; chunk: ChunkId }
  | { kind: "summarise" }
  | { kind: "next" }
  | { kind: "previous" }
  | { kind: "close" };

const FOCUS_RE =
  /\bfocus\s+on\s+(pipeline|funnel|outreach|calls\s+and\s+emails|web\s+meetings?|meetings?|offers?|special\s+offers?)\b/i;
const SHOW_FOCUS_RE =
  /\b(show\s*(me\s+)?(the\s+)?)(pipeline|funnel|outreach|web\s+meetings?|meetings?|special\s+offers?|offers?)\b/i;
const SUMMARISE_RE =
  /\b(summari[sz]e|brief\s+me|give\s+me\s+(an?\s+)?(ai\s+)?briefing)\b/i;
const NEXT_RE = /\bnext\s+(section|chunk)\b/i;
const PREV_RE = /\b(previous|prev|back)\s+(section|chunk)\b/i;
const CLOSE_RE =
  /\b(close|exit|leave)\s+(sales|dashboard|pipeline)\b|\bback\s+to\s+(jarvis|main|home)\b/i;

function mapTargetToChunk(target: string): ChunkId | null {
  const t = target.toLowerCase().trim();
  if (t.includes("pipeline") || t.includes("funnel")) return "pipeline";
  if (t.includes("outreach") || t.includes("calls")) return "outreach";
  if (t.includes("meeting")) return "meetings";
  if (t.includes("offer")) return "offers";
  return null;
}

export function detectSalesAction(text: string): SalesAction | null {
  const lower = text.toLowerCase().trim();

  if (CLOSE_RE.test(lower)) return { kind: "close" };
  if (NEXT_RE.test(lower)) return { kind: "next" };
  if (PREV_RE.test(lower)) return { kind: "previous" };
  if (SUMMARISE_RE.test(lower)) return { kind: "summarise" };

  const focusMatch = lower.match(FOCUS_RE);
  if (focusMatch && focusMatch[1]) {
    const chunk = mapTargetToChunk(focusMatch[1]);
    if (chunk) return { kind: "focus", chunk };
  }

  const showMatch = lower.match(SHOW_FOCUS_RE);
  if (showMatch) {
    const target = showMatch[showMatch.length - 1];
    const chunk = mapTargetToChunk(target);
    if (chunk) return { kind: "focus", chunk };
  }

  return null;
}
