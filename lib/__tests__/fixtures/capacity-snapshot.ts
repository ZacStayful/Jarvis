// A weekly snapshot carrying the lead-database `capacity` block, in the shape
// stayful-ads writes (scaling/CAPACITY_MODEL.md). SYNTHETIC: every number is
// made up for the tests. Never paste real ad or customer data here.

export const SNAPSHOT_WITH_CAPACITY = JSON.stringify({
  schema_version: 1,
  generated_by: 'Friday ad fatigue check (scheduled)',
  week_ending: '2026-10-16',
  scaling: { decision: 'HOLD', next_review: '2026-10-23' },
  creative: { reserve_count: 4, reserve_needed: 3 },
  capacity: {
    window_days: 30,
    supply: {
      leads_month: 400,
      leads_facebook_month: 250,
      leads_other_month: 150,
      leads_next_month: 450,
      sales_per_lead: 2.6,
      unsold_pct: 12,
      unsold_area_gap_pct: 8,
      unsold_buyers_full_pct: 4,
    },
    demand: {
      customers_total: 50,
      customers_unpaused: 44,
      customers_paused: 6,
      avg_allocation: 25,
      committed_leads_month: 1100,
      credits_owed: 30,
      credits_owed_change: -5,
      churn_monthly_pct: 6,
      churn_30d_count: 3,
      new_30d_count: 5,
    },
    ceiling: {
      supply_cover: 0.95,
      ceiling_now: 48,
      ceiling_next: 54,
      ceiling_total_next: 60,
      customer_gap: 10,
    },
    pipeline: {
      booking_rate_pct: 40,
      attendance_rate_pct: 75,
      close_rate_pct: 30,
      new_customers_needed: 13,
      meetings_needed: 43,
      meeting_capacity_month: 65,
      bookings_needed: 58,
      buyer_enquiries_needed: 145,
      buyer_enquiries_actual: 90,
      meetings_actual: 28,
      low_sample: ['close_rate_pct'],
    },
    stages: [
      { stage: 'area_match', status: 'watch', value: 8, reason: '8% of leads land where no buyer covers.' },
      { stage: 'buyer_capacity', status: 'ok', value: 4, reason: 'Few leads unsold because buyers are full.' },
      { stage: 'landlord_supply', status: 'ok', value: 0.95, reason: 'Supply covers 95% of committed leads.' },
      { stage: 'meeting_capacity', status: 'ok', value: 43, reason: '43 of 65 meetings a month needed.' },
      { stage: 'buyer_enquiries', status: 'bottleneck', value: 90, reason: '90 enquiries against 145 needed.' },
      { stage: 'booking_rate', status: 'ok', value: 40, reason: '40% of enquiries book.' },
      { stage: 'attendance', status: 'ok', value: 75, reason: '75% attend.' },
      { stage: 'close_rate', status: 'watch', value: 30, reason: 'Small sample.' },
      { stage: 'churn', status: 'ok', value: 6, reason: '3 cancellations in 30 days.' },
    ],
    bottleneck: {
      stage: 'buyer_enquiries',
      headline: '90 buyer enquiries a month against 145 needed.',
      action: 'Raise buyer enquiries before raising landlord spend.',
    },
    notes: ['Synthetic fixture.'],
  },
});

/** An older snapshot (and every history line before 9 Oct) has no block. */
export const SNAPSHOT_WITHOUT_CAPACITY = JSON.stringify({
  schema_version: 1,
  week_ending: '2026-10-09',
  scaling: { decision: 'NOT_DUE' },
});
