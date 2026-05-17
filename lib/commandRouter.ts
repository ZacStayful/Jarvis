// ─────────────────────────────────────────────────────────────────────────────
// JARVIS Command Router
// Detects navigation and intelligence commands from Zac's messages.
// Called by /api/chat before Claude to inject route events into the SSE stream.
// ─────────────────────────────────────────────────────────────────────────────

export type ViewRoute =
  | 'news-briefing'
  | 'investment-dashboard'
  | 'command-centre'
  | 'lead-sales'
  | 'task-view'
  | 'intelligence-view'
  | 'conversation-log'
  | null;

export interface CommandResult {
  view: ViewRoute;
  params?: Record<string, unknown>;
  isDeep: boolean; // Whether to use Opus (deep analysis) or Sonnet (speed)
}

// ─────────────────────────────────────────────────────────────────────────────
// Command pattern maps
// ─────────────────────────────────────────────────────────────────────────────

const NEWS_PATTERNS = [
  /\bnews\b/i,
  /\bbriefing\b/i,
  /\bheadlines?\b/i,
  /\bwhat'?s happening\b/i,
  /\bintelligence feed\b/i,
  /\bshow( me)? (the )?news\b/i,
  /\bmorning briefing\b/i,
  /\bdaily briefing\b/i,
  /\bmarket news\b/i,
  /\blatest news\b/i,
  /\bregulatory (update|news|changes?)\b/i,
  /\bcompetitor (intel|news|update)\b/i,
];

const INVESTMENT_PATTERNS = [
  /\binvestment(s)?\b/i,
  /\bportfolio\b/i,
  /\bstocks?\b/i,
  /\bshares?\b/i,
  /\bmarket analysis\b/i,
  /\bfinancial (analysis|briefing|review)\b/i,
  /\btrading\b/i,
  /\binvest\b/i,
  /\bequit(y|ies)\b/i,
  /\bdividend\b/i,
  /\bsector analysis\b/i,
  /\badvise (me on|on)\b/i,
  /\bwhat should i (do with|buy|sell|hold)\b/i,
  /\bBRRR\b/i,
];

const LEAD_SALES_PATTERNS = [
  /\bleads?\b/i,
  /\bpipeline\b/i,
  /\bsales (view|pipeline|dashboard)\b/i,
  /\bweb meeting(s)?\b/i,
  /\bconversion(s)?\b/i,
  /\blucy\b/i,
  /\bprospect(s)?\b/i,
  /\bshow (me )?(the )?leads?\b/i,
];

const TASK_PATTERNS = [
  /\btasks?\b/i,
  /\bto.?do(s)?\b/i,
  /\baction items?\b/i,
  /\bmy priorities\b/i,
  /\bschedule\b/i,
  /\bwhat('?s| is) (on )?today\b/i,
  /\bshow (me )?(my )?tasks?\b/i,
];

const COMMAND_CENTRE_PATTERNS = [
  /\bcommand cent(re|er)\b/i,
  /\bdashboard\b/i,
  /\boverview\b/i,
  /\bhome( view)?\b/i,
  /\bsituation (report|overview)\b/i,
  /\bshow (me )?(the )?dashboard\b/i,
];

const INTELLIGENCE_PATTERNS = [
  /\bintelligence( view)?\b/i,
  /\bpattern(s)? (analysis|detection|spotting)\b/i,
  /\bcompetitive intelligence\b/i,
  /\blearning log\b/i,
  /\bshow (me )?(the )?intelligence\b/i,
];

const CONVERSATION_LOG_PATTERNS = [
  /\bconversation log\b/i,
  /\btranscript(s)?\b/i,
  /\bwhat (did )?(we|I) (say|discuss|talk about)\b/i,
  /\bshow (me )?(the )?(conversation|chat) log\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Main detection function
// ─────────────────────────────────────────────────────────────────────────────

export function detectCommand(message: string): CommandResult {
  const trimmed = message.trim();

  // News briefing
  if (NEWS_PATTERNS.some(r => r.test(trimmed))) {
    return { view: 'news-briefing', isDeep: false };
  }

  // Investment — but not if it's clearly about a lead's finances
  if (INVESTMENT_PATTERNS.some(r => r.test(trimmed))) {
    const isAboutLead = LEAD_SALES_PATTERNS.some(r => r.test(trimmed));
    if (!isAboutLead) {
      return {
        view: 'investment-dashboard',
        params: { query: trimmed },
        isDeep: true,
      };
    }
  }

  // Lead & Sales
  if (LEAD_SALES_PATTERNS.some(r => r.test(trimmed))) {
    return { view: 'lead-sales', isDeep: false };
  }

  // Tasks
  if (TASK_PATTERNS.some(r => r.test(trimmed))) {
    return { view: 'task-view', isDeep: false };
  }

  // Intelligence view
  if (INTELLIGENCE_PATTERNS.some(r => r.test(trimmed))) {
    return { view: 'intelligence-view', isDeep: false };
  }

  // Command centre
  if (COMMAND_CENTRE_PATTERNS.some(r => r.test(trimmed))) {
    return { view: 'command-centre', isDeep: false };
  }

  // Conversation log
  if (CONVERSATION_LOG_PATTERNS.some(r => r.test(trimmed))) {
    return { view: 'conversation-log', isDeep: false };
  }

  // No command detected — regular JARVIS conversation
  return { view: null, isDeep: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// JARVIS verbal responses to route commands
// These are what JARVIS says when navigating to a view.
// ─────────────────────────────────────────────────────────────────────────────

export const ROUTE_RESPONSES: Record<NonNullable<ViewRoute>, string> = {
  'news-briefing':
    'Pulling up your intelligence briefing now, sir. Fetching and analysing the latest feeds across all categories.',
  'investment-dashboard':
    'Opening the investment dashboard. Stand by while I pull current market data.',
  'command-centre':
    'Switching to command centre overview.',
  'lead-sales':
    'Opening the sales pipeline. Here is your current lead intelligence.',
  'task-view':
    "Pulling up your priorities for today.",
  'intelligence-view':
    'Opening the intelligence and pattern analysis view.',
  'conversation-log':
    "Here is your conversation log.",
};
