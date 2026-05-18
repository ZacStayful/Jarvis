// Portfolio Intelligence Dashboard — Framework V2.0 constants.
// The single source of truth for thresholds, scenario rates, and stage
// checklists. Components must read from here, not hardcode.
// Update only when the framework itself changes — then bump
// `frameworkVersion` in portfolio-meta.json.

export const FRAMEWORK = {
  // Section 2: Stage 2 checks
  STAGE_2_PASS_THRESHOLD: 8,         // 8/8 to pass clean
  STAGE_2_WATCHLIST_THRESHOLD: 5,    // 5–7 = watchlist

  // Section 5: Portfolio rules
  MAX_POSITION_SIZE: 0.35,           // 35% — redirect contributions above this
  INDEX_FLOOR: 0.25,                 // 25% — never reduce below
  MONTHLY_CONTRIBUTION_GBP: 1666,    // ISA max

  // Section 5: Entry requirements
  MIN_DIMENSIONS_FOR_REPLACEMENT: 3, // candidate must beat incumbent on 3+ of 4
  REPLACEMENT_TIMELINE_MONTHS: [3, 6] as const, // [min, max]

  // Section 6: Monitoring
  MILESTONE_ABANDONED_YELLOW: 1,     // 1 abandoned = yellow flag
  MILESTONE_ABANDONED_RED: 2,        // 2+ abandoned = red flag

  // Section 7: Projection rates
  PROJECTION_SCENARIOS: {
    conservative: { rate: 0.11, label: 'Conservative 11% p.a.' },
    realistic:    { rate: 0.16, label: 'Realistic 16% p.a.' },
    optimistic:   { rate: 0.22, label: 'Optimistic 22% p.a.' },
  },

  // Section 3: Stage 2 checklist (qualitative gate)
  STAGE_2_CHECKS: [
    { id: 'charisma-inverse',  label: 'Founder is quiet operator, not public personality' },
    { id: 'metrics-over-vision', label: 'Communicates operational metrics, not narrative' },
    { id: 'famous-investors',  label: 'Famous investors are coincidence, not the reason' },
    { id: 'revenue-ipq',       label: '3+ years revenue · 2+ years post-IPO' },
    { id: 'cleantech',         label: 'Not in cleantech 1.0 pattern (capital + subsidy + China state)' },
    { id: 'timing',            label: 'Commercially viable now (not 5+ years away)' },
    { id: 'spac',              label: 'Not a SPAC (automatic fail if SPAC)' },
    { id: 'mission-ops',       label: '5+ year track record operationalising stated mission' },
  ],

  // Section 3: Stage 4 financial filter
  STAGE_4_CHECKS: [
    { id: 'fcf',           label: 'FCF positive OR credible 3-year path' },
    { id: 'balance-sheet', label: 'Balance sheet strengthening · net debt low/declining' },
    { id: 'leadership',    label: 'Leadership has built profitable business before' },
    { id: 'moat',          label: 'Durable moat widening, not narrowing' },
    { id: 'sector',        label: 'Sector is permanent (energy/health/connectivity/compute/space/transport)' },
  ],
} as const;

export type StageCheck = (typeof FRAMEWORK.STAGE_2_CHECKS)[number];
export type ScenarioKey = keyof typeof FRAMEWORK.PROJECTION_SCENARIOS;
