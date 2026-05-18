// Portfolio Intelligence Dashboard — type definitions
// Canonical schemas for everything under portfolio/data/.

export type Trend = 'up' | 'flat' | 'down';
export type RiskStatus = 'clear' | 'watch' | 'triggered';
export type MilestoneStatus =
  | 'on-time'
  | 'late'
  | 'modified'
  | 'abandoned'
  | 'pending';
export type Decision =
  | 'add'
  | 'hold'
  | 'hold-monitoring'
  | 'watch'
  | 'reduce';
export type DevelopmentTag = 'TSLA' | 'GOOGL' | 'SPCX' | 'MACRO';

export interface ProbabilityScore {
  value: number;       // 0–1
  trend: Trend;
  trendDelta: number;  // pp change vs previous quarter
  drivers: string;
}

export interface RiskTrigger {
  description: string;
  status: RiskStatus;
  note: string;
}

export interface Milestone {
  description: string;
  status: MilestoneStatus;
  expectedDate?: string; // ISO; optional for tier 2/3
  notes: string;
}

export interface HoldingData {
  ticker: string;
  name: string;
  subtitle: string;
  allocation: number;        // 0–1
  isCandidate: boolean;
  decision: Decision;
  decisionLabel: string;
  thesis: string;
  probabilities: {
    billionLives: ProbabilityScore;
    fiftyYear: ProbabilityScore;
  };
  riskTriggers: RiskTrigger[];
  sources: string[];
  billionLivesProgressHistory: Array<{
    quarter: string;        // "Q2 2026"
    score: number | null;   // null = not yet recorded
  }>;
  milestones: {
    tier1: Milestone[];
    tier2: Milestone[];
    tier3: Milestone[];
  };
}

export interface PortfolioMeta {
  frameworkVersion: string;
  investorName: string;
  monthlyContribution: number;
  lastReviewDate: string;
  nextReviewDate: string;
  nextFullFrameworkReview: string;
  portfolioStructure: {
    concentratedPositions: number;
    concentratedAllocationEach: number;
    indexFloorAllocation: number;
    maxPositionSize: number;
  };
  kpis: {
    avgDualProbability: number;
    tier1TriggersActive: number;
    tier1TriggersTotal: number;
    daysToNextReview: number;
  };
}

export interface DevelopmentItem {
  tag: DevelopmentTag;
  text: string;
  isSignificant: boolean;
}

export interface DevelopmentsData {
  quarter: string;
  items: DevelopmentItem[];
}

export interface RiskTriggerEntry {
  description: string;
  threshold: string;
  currentValue: string;
  status: RiskStatus;
}

export interface RiskTriggersFile {
  lastUpdated: string;
  holdings: Record<string, RiskTriggerEntry[]>;
}
