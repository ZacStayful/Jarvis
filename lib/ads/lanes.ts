// lib/ads/lanes.ts
// Pure helpers for the snapshot's campaign lanes (stayful-ads SCALING_PLAN.md
// section 2): Main scales, Test runs Meta A/B tests, Retargeting shows ads to the
// two warm audiences. Client-safe (no fetch, no env), so the marketing view and
// the tests can both import it. Nothing here calculates performance: it only
// groups and orders what the Friday check wrote.

import type { SnapshotAbTest, SnapshotAbVersion, SnapshotAudience, SnapshotCampaign } from '@/lib/ads/types';

export type LaneKey = 'main' | 'test' | 'retargeting' | 'other';

export interface LaneGroup {
  lane: LaneKey;
  label: string;
  campaigns: SnapshotCampaign[];
}

const LANE_ORDER: { lane: LaneKey; label: string }[] = [
  { lane: 'main', label: 'MAIN' },
  { lane: 'test', label: 'TEST' },
  { lane: 'retargeting', label: 'RETARGETING' },
  { lane: 'other', label: 'OTHER' },
];

function laneOf(campaign: SnapshotCampaign): LaneKey {
  const lane = (campaign.lane ?? '').toLowerCase();
  return lane === 'main' || lane === 'test' || lane === 'retargeting' ? lane : 'other';
}

/** Campaigns grouped by lane, in the order Main → Test → Retargeting → other.
 *  Lanes with no campaign are left out. */
export function campaignsByLane(campaigns: SnapshotCampaign[] | null | undefined): LaneGroup[] {
  const list = campaigns ?? [];
  return LANE_ORDER.map(({ lane, label }) => ({
    lane,
    label,
    campaigns: list.filter(c => laneOf(c) === lane),
  })).filter(group => group.campaigns.length > 0);
}

export interface OpenAbTest {
  campaign: SnapshotCampaign;
  test: SnapshotAbTest;
  /** Control first, then the other versions in the order written. */
  versions: SnapshotAbVersion[];
}

const OPEN_STATUSES = new Set(['running', 'paused']);

/** A/B tests still open (running or paused), each with its versions control-first. */
export function openAbTests(campaigns: SnapshotCampaign[] | null | undefined): OpenAbTest[] {
  return (campaigns ?? [])
    .filter(c => c.ab_test && OPEN_STATUSES.has((c.ab_test.status ?? '').toLowerCase()))
    .map(c => {
      const test = c.ab_test as SnapshotAbTest;
      const versions = test.versions ?? [];
      return {
        campaign: c,
        test,
        versions: [...versions.filter(v => v.control === true), ...versions.filter(v => v.control !== true)],
      };
    });
}

/** A warm audience's size in words. Meta returns a floor value for small
 *  audiences, so size_known false means "small, real size unknown". */
export function warmAudienceSize(audience: SnapshotAudience): string {
  if (audience.size_known === false) return 'under ~1,000 (size unknown)';
  const { size_lower: lo, size_upper: hi } = audience;
  const fmt = (n: number) => n.toLocaleString('en-GB');
  if (typeof lo === 'number' && typeof hi === 'number') return lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}`;
  if (typeof lo === 'number') return `${fmt(lo)}+`;
  return 'not measured';
}
