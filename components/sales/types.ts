export interface OfferItem {
  id: string;
  name: string;
  profile: string;
  offerType: string;
  expiry: string;
  daysLeft: number | null;
  status: string;
  address: string;
}

export interface PipelineMetrics {
  cold: number;
  abandoned: number;
  future: number;
  webMeetingBooked: number;
  webMeetingNoShow: number;
  warm: number;
  specialOffer: number;
  customer: number;
  attended: number;
  qualificationDropoff: number;
  futureRate: number;
  attendanceRate: number;
  noShowRate: number;
  postMeetingConversion: number;
  overallConversion: number;
  wasNoShowedCount?: number;
}

export interface OutreachMetricsData {
  callsMade: number;
  emailsEngaged: number;
  totalEmailsSent?: number;
  emailEngagementRate: number;
  waMessagesSent: number;
  waReplies: number;
  waContacted: number;
  waReplyRate: number;
  waActive: boolean;
}

export interface OffersData {
  active: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
  items: OfferItem[];
}

export interface SalesMetrics {
  total: number;
  pipeline: PipelineMetrics;
  outreach: OutreachMetricsData;
  offers: OffersData;
  dateRange: { from: string | null; to: string | null; filtered: boolean };
  activityLogsAvailable?: boolean;
}

export type ChunkId = "pipeline" | "outreach" | "meetings" | "offers";

export interface DateRange {
  from: string | null;
  to: string | null;
}

export type PresetKey = "week" | "month" | "year" | "custom";
