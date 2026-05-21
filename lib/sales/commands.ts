// lib/sales/commands.ts
// Detects sales-related voice/text commands and returns navigation intent.

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

export type SalesCommand = 'navigate' | null;

export function detectSalesCommand(text: string): SalesCommand {
  const lower = text.toLowerCase().trim();
  for (const pattern of SALES_PATTERNS) {
    if (pattern.test(lower)) return 'navigate';
  }
  return null;
}
