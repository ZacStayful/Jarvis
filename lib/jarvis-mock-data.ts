// Placeholder data for Phase 3 view scaffolding.
// Replaced by live MCP integrations in Phase 4 (Monday.com, Gmail, etc.)
// and Phase 5 (news/investment intelligence).

export const MOCK_NEWS = [
  {
    headline: 'Bank of England holds base rate at 4.25%',
    category: 'MONETARY POLICY',
    time: '2h ago',
    stayfulImpact:
      'Rate hold reduces refinancing pressure on overleveraged landlord prospects. Extends your window to acquire properties before competition intensifies.',
    action:
      'Accelerate outreach to landlords refinancing Q3 — their stress point remains high.',
    severity: 'amber' as const,
  },
  {
    headline: 'Airbnb announces UK property management partner programme',
    category: 'COMPETITOR',
    time: '5h ago',
    stayfulImpact:
      'Direct competitive threat. Airbnb is building the infrastructure Stayful already operates. Your advantage: local human relationships they cannot replicate at scale.',
    action:
      "Prepare a competitive positioning response. Activate the 'we're your local expert, not a platform' reframe in Lucy's script.",
    severity: 'red' as const,
  },
  {
    headline: 'Short-term rental licensing framework delayed to 2026 Q3',
    category: 'REGULATORY',
    time: '8h ago',
    stayfulImpact:
      'Gives Stayful additional runway before compliance burden affects landlord acquisition economics. Build moat now while barrier is lower.',
    action:
      'No immediate action required. Update regulatory tracker. Revisit in 90 days.',
    severity: 'green' as const,
  },
];

export const MOCK_LEADS = [
  { name: 'David Thornton', status: 'Web meeting booked', properties: 3, location: 'Sheffield S10', score: 92, flag: 'high' as const },
  { name: 'Sarah Mitchell',  status: 'Contacted',          properties: 2, location: 'Rotherham',     score: 78, flag: 'mid'  as const },
  { name: 'James Hartley',   status: 'Qualified',          properties: 5, location: 'Sheffield S11', score: 88, flag: 'high' as const },
  { name: 'Karen Patel',     status: 'New',                properties: 1, location: 'Doncaster',     score: 62, flag: 'low'  as const },
  { name: 'Tom Aldridge',    status: 'Proposal sent',      properties: 4, location: 'Sheffield S7',  score: 85, flag: 'high' as const },
];

export const MOCK_TASKS = [
  { id: 1, text: "Review Lucy call recordings — yesterday's campaign",    priority: 'high' as const,   due: 'Today',      done: false },
  { id: 2, text: 'Send follow-up to David Thornton post web meeting',     priority: 'high' as const,   due: 'Today',      done: false },
  { id: 3, text: 'Update PMI analysis template with new utility rates',   priority: 'mid'  as const,   due: 'Today',      done: true  },
  { id: 4, text: 'Review Tom Aldridge proposal — 4 properties',           priority: 'high' as const,   due: 'Tomorrow',   done: false },
  { id: 5, text: 'Quarterly n8n workflow audit',                          priority: 'low'  as const,   due: 'This week',  done: false },
  { id: 6, text: 'Prepare Host & Scale webinar content',                  priority: 'mid'  as const,   due: 'Friday',     done: false },
];

export const MOCK_HOLDINGS = [
  { ticker: 'NVDA', name: 'Nvidia',      weight: '22%', chg: '+1.8%', dir: 'up'   as const, note: 'Hold — AI capex cycle intact. Reduce 5% on next 12% rally.' },
  { ticker: 'MSFT', name: 'Microsoft',   weight: '18%', chg: '+0.4%', dir: 'up'   as const, note: 'Core. Hold. Azure AI premium strengthening.' },
  { ticker: 'VUSA', name: 'S&P 500 ETF', weight: '35%', chg: '-0.2%', dir: 'dn'   as const, note: 'Accumulate on dips below prior ATH. Macro headwinds modest.' },
  { ticker: 'LLOY', name: 'Lloyds',      weight: '10%', chg: '-0.9%', dir: 'dn'   as const, note: 'Watch. Rate cut cycle will compress NIM. Review in 30 days.' },
  { ticker: 'CASH', name: 'Reserve',     weight: '15%', chg: '—',     dir: 'flat' as const, note: 'Deploy on confirmed BoE cut signal. Target: VUSA or NVDA.' },
];

export const MOCK_INTELLIGENCE = [
  { title: 'High-converter profile: Sheffield S10/S11 landlord, 3-5 properties, 45-60yrs', tag: 'LEAD PATTERN', entry: '037' },
  { title: "Lucy objection: 'I manage myself' converts 34% when quantified with PMI tool", tag: 'OBJECTION',    entry: '031' },
  { title: 'Airbnb partner programme — watch for landlord recruitment ads on Facebook',    tag: 'COMPETITIVE',  entry: 'new' },
  { title: 'Leads from Host & Scale webinar convert 2.3× better than cold outreach',       tag: 'CHANNEL',      entry: '029' },
];
