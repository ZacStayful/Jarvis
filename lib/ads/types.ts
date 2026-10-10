// lib/ads/types.ts
// Shapes of the stayful-ads files the marketing department reads. Client-safe
// (types only) so the view can import them without pulling in the server-side
// fetch layer in lib/ads/department.ts.
//
// Every field is optional/nullable on purpose: the Friday ad check writes the
// snapshot, fields start as null until there's data, and older snapshots may
// predate a block (e.g. `creative`, `capacity`, the lanes blocks). Render "—" for anything
// missing; never fill in a number.

export type Director = 'jarvis' | 'janet';

export interface SnapshotWeek {
  spend_gbp?: number | null;
  leads?: number | null;
  cost_per_lead_gbp?: number | null;
  cpm_gbp?: number | null;
  ctr_pct?: number | null;
  form_completion_pct?: number | null;
  frequency_7d?: number | null;
  learning_status?: string | null;
}

export interface SnapshotEconomics {
  revenue_per_lead_gbp?: number | null;
  break_even_cpl_gbp?: number | null;
  ceiling_cpl_gbp?: number | null;
  floor_cpl_gbp?: number | null;
  target_cpl_gbp?: number | null;
}

export interface SnapshotAdSet {
  name?: string | null;
  status?: string | null;
  spend_gbp?: number | null;
  leads?: number | null;
  cost_per_lead_gbp?: number | null;
}

export interface SnapshotAd {
  concept_id?: string | null;
  concept_name?: string | null;
  ad_set?: string | null;
  verdict?: string | null;
  cost_per_lead_gbp?: number | null;
  frequency_7d?: number | null;
  ctr_pct?: number | null;
  hold_rate_pct?: number | null;
  reason?: string | null;
  /** Meta's rankings (10 Oct 2026): ABOVE_AVERAGE, AVERAGE, BELOW_AVERAGE_35/20/10, null until available. */
  quality_ranking?: string | null;
  engagement_ranking?: string | null;
  conversion_ranking?: string | null;
}

export interface SnapshotScaling {
  review_due?: boolean | null;
  decision?: string | null;
  recommended_daily_budget_gbp?: number | null;
  last_stable_budget_gbp?: number | null;
  reason?: string | null;
  next_review?: string | null;
  /** The review period's one change, any lane (stayful-ads SCALING_PLAN.md section 13). */
  change?: string | null;
}

export interface SnapshotCreativeBrief {
  brief_id?: string | null;
  angle_id?: string | null;
  format?: string | null;
  status?: string | null;
  needed_by?: string | null;
}

export interface SnapshotCreative {
  reserve_count?: number | null;
  reserve_needed?: number | null;
  /** Concepts on the ready bench, waiting to go into Main when it tires. */
  bench?: string[] | null;
  briefs?: SnapshotCreativeBrief[] | null;
  ready_to_upload?: string[] | null;
  waiting_on_zac?: string[] | null;
}

// Lead-database capacity (added 9 Oct 2026; rules in stayful-ads
// scaling/CAPACITY_MODEL.md). The landlord leads set the buyer ceiling, the
// ceiling sets how many buyers to aim for, and that sets the buyer enquiries
// and web meetings needed. Read-only here, like every other block.

export type CapacityStageId =
  | 'area_match'
  | 'buyer_capacity'
  | 'landlord_supply'
  | 'meeting_capacity'
  | 'buyer_enquiries'
  | 'booking_rate'
  | 'attendance'
  | 'close_rate'
  | 'churn';

export type CapacityStageStatus = 'ok' | 'watch' | 'bottleneck';

export interface SnapshotCapacitySupply {
  leads_month?: number | null;
  leads_facebook_month?: number | null;
  leads_other_month?: number | null;
  leads_next_month?: number | null;
  sales_per_lead?: number | null;
  unsold_pct?: number | null;
  unsold_area_gap_pct?: number | null;
  unsold_buyers_full_pct?: number | null;
}

export interface SnapshotCapacityDemand {
  customers_total?: number | null;
  customers_unpaused?: number | null;
  customers_paused?: number | null;
  avg_allocation?: number | null;
  committed_leads_month?: number | null;
  credits_owed?: number | null;
  credits_owed_change?: number | null;
  churn_monthly_pct?: number | null;
  churn_30d_count?: number | null;
  new_30d_count?: number | null;
}

export interface SnapshotCapacityCeiling {
  supply_cover?: number | null;
  ceiling_now?: number | null;
  ceiling_next?: number | null;
  ceiling_total_next?: number | null;
  customer_gap?: number | null;
}

export interface SnapshotCapacityPipeline {
  booking_rate_pct?: number | null;
  attendance_rate_pct?: number | null;
  close_rate_pct?: number | null;
  new_customers_needed?: number | null;
  meetings_needed?: number | null;
  meeting_capacity_month?: number | null;
  bookings_needed?: number | null;
  buyer_enquiries_needed?: number | null;
  buyer_enquiries_actual?: number | null;
  meetings_actual?: number | null;
  /** Rates measured on too few cases to trust, e.g. "booking_rate_pct". */
  low_sample?: string[] | null;
}

export interface SnapshotCapacityStage {
  stage?: CapacityStageId | null;
  status?: CapacityStageStatus | null;
  value?: number | string | null;
  reason?: string | null;
}

export interface SnapshotCapacityBottleneck {
  stage?: CapacityStageId | null;
  headline?: string | null;
  action?: string | null;
}

export interface SnapshotCapacity {
  window_days?: number | null;
  supply?: SnapshotCapacitySupply | null;
  demand?: SnapshotCapacityDemand | null;
  ceiling?: SnapshotCapacityCeiling | null;
  pipeline?: SnapshotCapacityPipeline | null;
  /** The nine stages, in order. */
  stages?: SnapshotCapacityStage[] | null;
  bottleneck?: SnapshotCapacityBottleneck | null;
  notes?: string[] | null;
}

// Campaign lanes and the weekly diagnosis (added 10 Oct 2026; rules in stayful-ads
// scaling/SCALING_PLAN.md sections 2, 13 and 16). Main is the scaling engine, Test runs
// Meta A/B tests, Retargeting shows ads to the two warm audiences only.

export type CampaignLane = 'main' | 'test' | 'retargeting';

export interface SnapshotAbVersion {
  name?: string | null;
  control?: boolean | null;
  spend_gbp?: number | null;
  leads?: number | null;
  cost_per_lead_gbp?: number | null;
  quality_fail_pct?: number | null;
}

export interface SnapshotAbTest {
  test_id?: string | null;
  /** "creative" or "audience" */
  variable?: string | null;
  started?: string | null;
  ends?: string | null;
  /** running | ended | cut | paused */
  status?: string | null;
  /** null while running; win | draw | loss | no_verdict */
  verdict?: string | null;
  versions?: SnapshotAbVersion[] | null;
}

export interface SnapshotCampaign {
  id?: string | null;
  name?: string | null;
  lane?: CampaignLane | string | null;
  daily_budget_gbp?: number | null;
  spend_gbp?: number | null;
  leads?: number | null;
  cost_per_lead_gbp?: number | null;
  cpm_gbp?: number | null;
  ctr_pct?: number | null;
  link_clicks?: number | null;
  form_completion_pct?: number | null;
  frequency_7d?: number | null;
  learning_status?: string | null;
  /** "meta" when Meta reported it, "estimated" when worked out from the change log */
  learning_source?: string | null;
  /** A test campaign kept running after its test ended */
  kept_running?: boolean | null;
  ab_test?: SnapshotAbTest | null;
}

export interface SnapshotAudience {
  id?: string | null;
  name?: string | null;
  retention_days?: number | null;
  size_lower?: number | null;
  size_upper?: number | null;
  /** false when Meta returned a floor value (small audience, real size unknown) */
  size_known?: boolean | null;
  as_of?: string | null;
}

/** A decision_journal.csv row still waiting for its actual. */
export interface SnapshotJournalEntry {
  date?: string | null;
  lane?: string | null;
  situation_id?: string | null;
  decision?: string | null;
  expected_metric?: string | null;
  expected_value?: string | null;
  expected_by?: string | null;
  confidence?: string | null;
}

export interface SnapshotSituationMatch {
  /** S01… in stayful-ads scaling/SITUATIONS.md; S99 = nothing fits */
  id?: string | null;
  /** strong | partial */
  fit?: string | null;
  evidence?: string | null;
}

export interface SnapshotDiagnosis {
  norms?: Record<string, number | null> | null;
  changes_pct?: {
    vs_last_week?: Record<string, number | null> | null;
    vs_norm?: Record<string, number | null> | null;
  } | null;
  marginal_cpl_gbp?: number | null;
  account_cpl_gbp?: number | null;
  last_significant_edit?: string | null;
  situations?: SnapshotSituationMatch[] | null;
  new_situation?: string | null;
  /** ACCOUNT_LEARNINGS.md rule ids used this week */
  rules_used?: string[] | null;
}

export interface SnapshotBreakdownBucket {
  bucket?: string | null;
  spend_share_pct?: number | null;
  leads?: number | null;
  cost_per_lead_gbp?: number | null;
}

export interface SnapshotBreakdowns {
  placement?: SnapshotBreakdownBucket[] | null;
  age_gender?: SnapshotBreakdownBucket[] | null;
  region?: SnapshotBreakdownBucket[] | null;
}

export interface SnapshotAccountChange {
  date?: string | null;
  object?: string | null;
  change?: string | null;
  /** "you" (Zac) or "meta"; never a name */
  by?: string | null;
}

export interface WeeklySnapshot {
  schema_version?: number | null;
  generated_at?: string | null;
  generated_by?: string | null;
  week_ending?: string | null;
  data_window_days?: number | null;
  campaign?: {
    id?: string | null;
    name?: string | null;
    ad_account_id?: string | null;
    daily_budget_gbp?: number | null;
  } | null;
  phase?: number | null;
  week?: SnapshotWeek | null;
  economics?: SnapshotEconomics | null;
  ad_sets?: SnapshotAdSet[] | null;
  ads?: SnapshotAd[] | null;
  scaling?: SnapshotScaling | null;
  actions_for_zac?: string[] | null;
  build_next?: string | null;
  open_setup_actions?: string[] | null;
  creative?: SnapshotCreative | null;
  capacity?: SnapshotCapacity | null;
  campaigns?: SnapshotCampaign[] | null;
  audiences?: SnapshotAudience[] | null;
  journal_open?: SnapshotJournalEntry[] | null;
  diagnosis?: SnapshotDiagnosis | null;
  breakdowns?: SnapshotBreakdowns | null;
  account_changes?: SnapshotAccountChange[] | null;
  notes?: string[] | null;
}

/** One row of briefs/queue.csv. Every value is the raw CSV string. */
export interface BriefRow {
  brief_id: string;
  date: string;
  angle_id: string;
  why: string;
  format: string;
  look_group: string;
  hook: string;
  example: string;
  voice: string;
  needed_by: string;
  status: string;
  concept_id: string;
  notes: string;
}

/** One row of register/voices.csv. */
export interface VoiceRow {
  voice_name: string;
  elevenlabs_voice_id: string;
  used_by: string;
  live: string;
  available_for_new_ad: string;
  notes: string;
}

/** The subset of register/ad_register.csv the view needs. */
export interface RegisterRow {
  concept_id: string;
  concept: string;
  angle: string;
  format: string;
  library_status: string;
}

/** Counts from the ANGLES.md section 1 table. */
export interface AngleCoverage {
  total: number;
  built: number;
  inProgress: number;
  open: number;
}

/** What GET /api/marketing returns. */
export interface DepartmentData {
  ok: boolean;
  errors: string[];
  snapshot: WeeklySnapshot | null;
  history: WeeklySnapshot[];
  briefs: BriefRow[] | null;
  voices: VoiceRow[] | null;
  register: RegisterRow[] | null;
  angleCoverage: AngleCoverage | null;
}
