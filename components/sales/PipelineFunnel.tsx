'use client';

import { useCallback, useEffect, useState } from 'react';
import { C } from '@/lib/jarvis-design';
import { ChunkWrapper } from './ChunkWrapper';
import type { DateRange } from './DateRangePicker';

interface PipelineData {
  coldLeads: number;
  abandoned: number;
  future: number;
  webMeetingBooked: number;
  webMeetingNoShow: number;
  warm: number;
  specialOfferApplied: number;
  customers: number;
  qualificationDropoffPct: number;
  futureRatePct: number;
  attendanceRatePct: number;
  noShowRatePct: number;
  reEngagementRatePct: number;
  postMeetingConversionPct: number;
  overallConversionPct: number;
  reEngagementSource: 'activity_logs' | 'checkbox' | 'none';
  reEngagementCount: number;
  funnel: Array<{ stage: string; count: number; dropoffFromPrev: number | null }>;
}

interface PipelineFunnelProps {
  range: DateRange;
  focused: boolean;
  onFocus: () => void;
  onMetricsReady?: (m: PipelineData) => void;
}

export function PipelineFunnel({ range, focused, onFocus, onMetricsReady }: PipelineFunnelProps) {
  const [data, setData] = useState<PipelineData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ text: string; generatedAt: string; model: string } | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`/api/sales?chunk=pipeline&from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.pipeline);
      setStatus('live');
      onMetricsReady?.(json.pipeline);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
    }
  }, [range.from, range.to, onMetricsReady]);

  const fetchSummary = useCallback(async () => {
    setSummaryStatus('loading');
    try {
      const res = await fetch(`/api/sales?chunk=summary&from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSummary(json.summary);
      setSummaryStatus('live');
    } catch {
      setSummaryStatus('error');
    }
  }, [range.from, range.to]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    // Trigger the AI summary after the metrics are in. Don't block the chunk
    // render — the card shows its own loading state.
    if (status === 'live') fetchSummary();
  }, [status, fetchSummary]);

  return (
    <ChunkWrapper
      index="01"
      name="Pipeline Funnel"
      voiceCommand='focus on pipeline'
      status={status === 'idle' ? 'loading' : status}
      focused={focused}
      staggerIndex={0}
      onFocus={onFocus}
      onRetry={fetchData}
      errorMessage={error ?? undefined}
    >
      {data && (
        <>
          {/* KPI row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
              marginBottom: 18,
            }}
          >
            <Kpi label="Cold Leads"        value={data.coldLeads}              tone="primary" />
            <Kpi label="Abandoned"         value={data.abandoned}              tone="dim"     sub={`${data.qualificationDropoffPct}% drop`} />
            <Kpi label="Web Meetings"      value={data.webMeetingBooked}       tone="primary" sub={`${data.attendanceRatePct}% attended`} />
            <Kpi label="Customers"         value={data.customers}              tone="bright"  />
            <Kpi label="Overall Conv."     value={`${data.overallConversionPct}%`} tone={conversionTone(data.overallConversionPct)} sub="target 12-15%" />
          </div>

          {/* Funnel bars */}
          <FunnelBars funnel={data.funnel} />

          {/* Side stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginTop: 16,
            }}
          >
            <MiniStat label="No-show rate"      value={`${data.noShowRatePct}%`} />
            <MiniStat label="Re-engagement"     value={`${data.reEngagementRatePct}%`} sub={reEngagementSourceLabel(data.reEngagementSource, data.reEngagementCount)} />
            <MiniStat label="Post-meeting close" value={`${data.postMeetingConversionPct}%`} sub="target >15%" />
            <MiniStat label="Future (early)"    value={`${data.futureRatePct}%`} sub="too early to engage" />
          </div>

          {/* AI summary card */}
          <SummaryCard
            status={summaryStatus}
            summary={summary}
            onRetry={fetchSummary}
          />
        </>
      )}
    </ChunkWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function conversionTone(pct: number): KpiTone {
  if (pct >= 12) return 'bright';
  if (pct >= 7) return 'primary';
  return 'amber';
}

function reEngagementSourceLabel(src: PipelineData['reEngagementSource'], count: number): string {
  if (src === 'activity_logs') return `${count} via activity logs`;
  if (src === 'checkbox')      return `${count} via no-show flag`;
  return 'tracking from setup';
}

type KpiTone = 'primary' | 'bright' | 'amber' | 'red' | 'dim';
const TONE: Record<KpiTone, string> = {
  primary: C.primary,
  bright:  C.bright,
  amber:   C.amber,
  red:     C.red,
  dim:     C.textMid,
};

function Kpi({ label, value, sub, tone = 'primary' }: { label: string; value: string | number; sub?: string; tone?: KpiTone }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'rgba(93,129,86,0.04)',
        border: `1px solid ${C.border}`,
        borderRadius: 4,
      }}
    >
      <div
        className="font-display"
        style={{
          fontSize: 26,
          color: TONE[tone],
          letterSpacing: '0.04em',
          lineHeight: 1.1,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div
        className="font-mono"
        style={{
          fontSize: 9,
          color: C.textLow,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          className="font-mono"
          style={{ fontSize: 9, color: C.textMid, marginTop: 2, letterSpacing: '0.06em' }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
      }}
    >
      <div className="font-mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</div>
      <div className="font-display" style={{ fontSize: 18, color: C.bright, lineHeight: 1.2, marginTop: 4 }}>{value}</div>
      {sub && <div className="font-mono" style={{ fontSize: 9, color: C.textMid, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function FunnelBars({ funnel }: { funnel: PipelineData['funnel'] }) {
  const max = Math.max(...funnel.map(s => s.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {funnel.map(stage => {
        const width = (stage.count / max) * 100;
        return (
          <div key={stage.stage} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px 80px', alignItems: 'center', gap: 10 }}>
            <span className="font-mono" style={{ fontSize: 10, color: C.textMid, letterSpacing: '0.1em' }}>
              {stage.stage}
            </span>
            <div style={{ height: 14, background: 'rgba(93,129,86,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${C.primary}, ${C.bright})`,
                  transition: 'width 0.6s ease-out',
                }}
              />
            </div>
            <span className="font-mono" style={{ fontSize: 11, color: C.bright, textAlign: 'right' }}>
              {stage.count}
            </span>
            <span className="font-mono" style={{ fontSize: 10, color: C.amber, textAlign: 'right' }}>
              {stage.dropoffFromPrev !== null && stage.dropoffFromPrev > 0 ? `−${stage.dropoffFromPrev}%` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({
  status,
  summary,
  onRetry,
}: {
  status: 'idle' | 'loading' | 'live' | 'error';
  summary: { text: string; generatedAt: string; model: string } | null;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: '14px 16px',
        background: 'rgba(93,129,86,0.06)',
        border: `1px solid rgba(93,129,86,0.25)`,
        borderRadius: 4,
        position: 'relative',
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 9,
          color: C.primary,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>▸ JARVIS BRIEFING</span>
        <span style={{ color: C.textLow }}>
          {summary?.model ?? ''}
        </span>
      </div>

      {status === 'loading' && (
        <div style={{ color: C.textMid, fontSize: 12, fontStyle: 'italic' }}>
          Generating briefing…
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: C.red, fontSize: 12 }}>Briefing failed.</span>
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(); }}
            className="font-mono"
            style={{ fontSize: 10, color: C.bright, background: 'transparent', border: `1px solid ${C.border}`, padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}
          >
            RETRY
          </button>
        </div>
      )}

      {status === 'live' && summary && (
        <p style={{ color: C.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          {summary.text}
        </p>
      )}
    </div>
  );
}
