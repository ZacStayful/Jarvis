// lib/ads/types.ts
// Shapes of the stayful-ads files the marketing department reads. Client-safe
// (types only) so the view can import them without pulling in the server-side
// fetch layer in lib/ads/department.ts.
//
// Every field is optional/nullable on purpose: the Friday ad check writes the
// snapshot, fields start as null until there's data, and older snapshots may
// predate a block (e.g. `creative`). Render "—" for anything missing; never
// fill in a number.

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
}

export interface SnapshotScaling {
  review_due?: boolean | null;
  decision?: string | null;
  recommended_daily_budget_gbp?: number | null;
  last_stable_budget_gbp?: number | null;
  reason?: string | null;
  next_review?: string | null;
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
  briefs?: SnapshotCreativeBrief[] | null;
  ready_to_upload?: string[] | null;
  waiting_on_zac?: string[] | null;
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
