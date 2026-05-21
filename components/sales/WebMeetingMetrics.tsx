'use client';

import { useCallback, useEffect, useState } from 'react';
import { C } from '@/lib/jarvis-design';
import { ChunkWrapper } from './ChunkWrapper';
import type { DateRange } from './DateRangePicker';

interface MeetingsData {
  attendanceRatePct: number;
  noShowRatePct: number;
  reEngagementRatePct: number;
  postMeetingClosePct: number;
  warmCount: number;
  offerCount: number;
  customerCount: number;
  warmToCustomerPct: number;
  offerToCustomerPct: number;
  avgDaysToConvert: number | null;
  hasMilestoneDates: boolean;
  trackingFromNote: string | null;
}

interface WebMeetingMetricsProps {
  range: DateRange;
  focused: boolean;
  onFocus: () => void;
  onMetricsReady?: (m: MeetingsData) => void;
}

export function WebMeetingMetrics({ range, focused, onFocus, onMetricsReady }: WebMeetingMetricsProps) {
  const [data, setData] = useState<MeetingsData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activityAvailable, setActivityAvailable] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`/api/sales?chunk=meetings&from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.meetings);
      setActivityAvailable(!!json.activityLogsAvailable);
      setStatus('live');
      onMetricsReady?.(json.meetings);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    }
  }, [range.from, range.to, onMetricsReady]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ChunkWrapper
      index="03"
      name="Web Meetings"
      voiceCommand='focus on meetings'
      status={status === 'idle' ? 'loading' : status}
      focused={focused}
      staggerIndex={2}
      onFocus={onFocus}
      onRetry={fetchData}
      errorMessage={error ?? undefined}
    >
      {data && (
        <>
          {/* Rate row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <RateCard label="Attendance"          value={`${data.attendanceRatePct}%`} target=">50%" tone={data.attendanceRatePct >= 50 ? 'good' : 'warn'} />
            <RateCard label="No-show"             value={`${data.noShowRatePct}%`}      target="<25%" tone={data.noShowRatePct <= 25 ? 'good' : 'warn'} />
            <RateCard
              label="Re-engagement"
              value={`${data.reEngagementRatePct}%`}
              target={activityAvailable ? 'of no-shows' : 'awaiting activity logs'}
              tone={activityAvailable ? 'neutral' : 'pending'}
            />
            <RateCard label="Post-meeting close" value={`${data.postMeetingClosePct}%`} target=">15%" tone={data.postMeetingClosePct >= 15 ? 'good' : 'warn'} />
          </div>

          {/* Two sub-cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 12 }}>
            <SubCard title="Post-meeting pipeline">
              <PipelineRow label="Warm"               count={data.warmCount}     conv={data.warmToCustomerPct}  accent={C.amber} />
              <PipelineRow label="Special offer"      count={data.offerCount}    conv={data.offerToCustomerPct} accent={C.gold} />
              <PipelineRow label="Customer"           count={data.customerCount} conv={null}                    accent={C.bright} />
            </SubCard>

            <SubCard title="Avg days to convert">
              <div className="font-display" style={{ fontSize: 38, color: C.bright, lineHeight: 1.1 }}>
                {data.avgDaysToConvert !== null ? data.avgDaysToConvert : '—'}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: C.textMid, letterSpacing: '0.1em', marginTop: 4 }}>
                {data.avgDaysToConvert !== null ? 'days from qualified to customer' : 'awaiting milestone dates'}
              </div>
              {!data.hasMilestoneDates && data.trackingFromNote && (
                <div
                  className="font-mono"
                  style={{
                    marginTop: 10,
                    padding: '6px 8px',
                    fontSize: 10,
                    color: C.amber,
                    background: 'rgba(212,135,42,0.06)',
                    border: '1px solid rgba(212,135,42,0.25)',
                    borderRadius: 3,
                    letterSpacing: '0.08em',
                  }}
                >
                  {data.trackingFromNote}
                </div>
              )}
            </SubCard>
          </div>
        </>
      )}
    </ChunkWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type Tone = 'good' | 'warn' | 'neutral' | 'pending';
const TONE: Record<Tone, string> = {
  good:    C.bright,
  warn:    C.amber,
  neutral: C.primary,
  pending: C.textLow,
};

function RateCard({ label, value, target, tone }: { label: string; value: string; target: string; tone: Tone }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'rgba(93,129,86,0.04)',
        border: `1px solid ${C.border}`,
        borderRadius: 4,
      }}
    >
      <div className="font-mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{label}</div>
      <div className="font-display" style={{ fontSize: 24, color: TONE[tone], lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      <div className="font-mono" style={{ fontSize: 10, color: C.textMid, marginTop: 2 }}>{target}</div>
    </div>
  );
}

function SubCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        padding: '14px 16px',
      }}
    >
      <div className="font-mono" style={{ fontSize: 10, color: C.textLow, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function PipelineRow({ label, count, conv, accent }: { label: string; count: number; conv: number | null; accent: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span className="font-mono" style={{ fontSize: 11, color: C.text, letterSpacing: '0.08em' }}>{label}</span>
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
        <span className="font-display" style={{ fontSize: 16, color: accent, lineHeight: 1 }}>{count}</span>
        {conv !== null && (
          <span className="font-mono" style={{ fontSize: 10, color: C.textMid }}>
            → {conv}% customer
          </span>
        )}
      </div>
    </div>
  );
}
