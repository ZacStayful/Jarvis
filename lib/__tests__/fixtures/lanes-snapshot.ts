// A weekly snapshot carrying the campaign lanes and diagnosis blocks, in the shape
// stayful-ads writes from 16 Oct 2026 (scaling/SCALING_PLAN.md section 13).
// SYNTHETIC: every number and name is made up for the tests. Never paste real ad
// or customer data here.

export const LANES_SNAPSHOT = {
  schema_version: 1,
  generated_by: 'Friday ad fatigue check (scheduled)',
  week_ending: '2026-11-13',
  data_window_days: 7,
  campaign: { id: '100', name: 'Main campaign', daily_budget_gbp: 33 },
  week: { spend_gbp: 231, leads: 40, cost_per_lead_gbp: 5.78 },
  scaling: { decision: 'HOLD', change: 'start_test', recommended_daily_budget_gbp: 33, next_review: '2026-11-20' },
  ads: [{ concept_id: 'C02', verdict: 'Winner', quality_ranking: 'AVERAGE', engagement_ranking: null, conversion_ranking: null }],
  creative: { reserve_count: 5, reserve_needed: 3, bench: ['C06', 'C07'] },
  capacity: { bottleneck: { stage: 'buyer_enquiries' } },
  campaigns: [
    { id: '300', name: 'RETARGETING | warm', lane: 'retargeting', daily_budget_gbp: 5, spend_gbp: 35, leads: 4, cost_per_lead_gbp: 8.75, learning_status: 'learning', learning_source: 'meta', ab_test: null },
    { id: '100', name: 'Main campaign', lane: 'main', daily_budget_gbp: 33, spend_gbp: 231, leads: 40, cost_per_lead_gbp: 5.78, learning_status: 'learning limited', learning_source: 'estimated', ab_test: null },
    {
      id: '200', name: 'TEST | interests vs broad | 2026-11-06', lane: 'test', daily_budget_gbp: 50, spend_gbp: 350, leads: 52, cost_per_lead_gbp: 6.73,
      learning_status: 'learning', learning_source: 'meta', kept_running: false,
      ab_test: {
        test_id: '9001', variable: 'audience', started: '2026-11-06', ends: '2026-11-27', status: 'running', verdict: null,
        versions: [
          { name: 'Broad', control: false, spend_gbp: 175, leads: 30, cost_per_lead_gbp: 5.83, quality_fail_pct: 12 },
          { name: 'Interests', control: true, spend_gbp: 175, leads: 22, cost_per_lead_gbp: 7.95, quality_fail_pct: 9 },
        ],
      },
    },
    {
      id: '201', name: 'TEST | notice vs tenants | 2026-10-16', lane: 'test', daily_budget_gbp: 25, spend_gbp: 175, leads: 20, cost_per_lead_gbp: 8.75,
      kept_running: true,
      ab_test: { test_id: '9000', status: 'ended', verdict: 'win', versions: [{ name: 'A', control: true }, { name: 'B', control: false }] },
    },
  ],
  audiences: [
    { id: '52548145151150', name: 'Warm – form opened, not submitted.', retention_days: 90, size_lower: 1000, size_upper: 1000, size_known: false, as_of: '2026-11-13' },
    { id: '52548145459950', name: 'Warm – video 50% viewed', retention_days: 90, size_lower: 1200, size_upper: 1400, size_known: true, as_of: '2026-11-13' },
  ],
  journal_open: [
    { date: '2026-11-06', lane: 'test', situation_id: 'S23', decision: 'start', expected_metric: 'cost_per_lead_gbp', expected_value: '5-9', expected_by: '2026-11-27', confidence: 'medium' },
  ],
  diagnosis: {
    norms: { cost_per_lead_gbp: 5.5 },
    changes_pct: { vs_last_week: { cost_per_lead_gbp: 4.2 }, vs_norm: { cost_per_lead_gbp: 5.1 } },
    marginal_cpl_gbp: null,
    account_cpl_gbp: 6.4,
    last_significant_edit: '2026-11-06',
    situations: [
      { id: 'S05', fit: 'partial', evidence: 'CPM up 9% on Main a week after the test started.' },
      { id: 'S01', fit: 'strong', evidence: 'Main steady at the norm for 2 reviews.' },
    ],
    new_situation: null,
    rules_used: [],
  },
  breakdowns: { placement: [{ bucket: 'Facebook Reels', spend_share_pct: 41, leads: 15, cost_per_lead_gbp: 6.3 }] },
  account_changes: [{ date: '2026-11-06', object: 'TEST | interests vs broad', change: 'campaign created', by: 'you' }],
  notes: [],
};
