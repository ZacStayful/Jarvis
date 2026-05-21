'use client';

import { useCallback, useEffect, useState } from 'react';
import { C } from '@/lib/jarvis-design';
import { ChunkWrapper } from './ChunkWrapper';
import type { DateRange } from './DateRangePicker';

interface OfferRow {
  id: string;
  name: string;
  profile: string;
  offerType: string;
  expiryDate: string | null;
  daysRemaining: number | null;
  status: string;
  urgency: 'red' | 'amber' | 'normal';
}

interface OffersData {
  active: number;
  expiringWeek: number;
  expiringMonth: number;
  closeRatePct: number;
  rows: OfferRow[];
}

interface SpecialOffersProps {
  range: DateRange;
  focused: boolean;
  onFocus: () => void;
  onMetricsReady?: (m: OffersData) => void;
}

export function SpecialOffers({ range, focused, onFocus, onMetricsReady }: SpecialOffersProps) {
  const [data, setData] = useState<OffersData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`/api/sales?chunk=offers&from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.offers);
      setStatus('live');
      onMetricsReady?.(json.offers);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load offers');
    }
  }, [range.from, range.to, onMetricsReady]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ChunkWrapper
      index="04"
      name="Special Offers"
      voiceCommand='show me offers'
      status={status === 'idle' ? 'loading' : status}
      focused={focused}
      staggerIndex={3}
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
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <OfferKpi label="Active offers"        value={data.active}                          tone="primary" />
            <OfferKpi label="Expiring this week"   value={data.expiringWeek}                    tone={data.expiringWeek > 0 ? 'red' : 'dim'} />
            <OfferKpi label="Expiring this month"  value={data.expiringMonth}                   tone={data.expiringMonth > 0 ? 'amber' : 'dim'} />
            <OfferKpi label="Offer close rate"     value={`${data.closeRatePct}%`}              tone="bright" sub="offer → customer" />
          </div>

          {/* Table */}
          {data.rows.length === 0 ? (
            <div
              className="font-mono"
              style={{
                padding: 16,
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.textMid,
                fontSize: 11,
                textAlign: 'center',
              }}
            >
              No active offers in pipeline.
            </div>
          ) : (
            <OffersTable rows={data.rows} />
          )}
        </>
      )}
    </ChunkWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type Tone = 'primary' | 'bright' | 'amber' | 'red' | 'dim';
const TONE: Record<Tone, string> = {
  primary: C.primary,
  bright:  C.bright,
  amber:   C.amber,
  red:     C.red,
  dim:     C.textMid,
};

function OfferKpi({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone: Tone }) {
  return (
    <div
      style={{
        padding: '12px 14px',
        background: 'rgba(93,129,86,0.04)',
        border: `1px solid ${C.border}`,
        borderRadius: 4,
      }}
    >
      <div className="font-display" style={{ fontSize: 26, color: TONE[tone], lineHeight: 1.1 }}>{value}</div>
      <div className="font-mono" style={{ fontSize: 9, color: C.textLow, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
      {sub && <div className="font-mono" style={{ fontSize: 9, color: C.textMid, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function urgencyBg(urgency: OfferRow['urgency']): string {
  if (urgency === 'red')   return 'rgba(224,68,68,0.08)';
  if (urgency === 'amber') return 'rgba(212,135,42,0.08)';
  return 'transparent';
}
function urgencyBorder(urgency: OfferRow['urgency']): string {
  if (urgency === 'red')   return 'rgba(224,68,68,0.35)';
  if (urgency === 'amber') return 'rgba(212,135,42,0.3)';
  return C.border;
}

function OffersTable({ rows }: { rows: OfferRow[] }) {
  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 110px 80px 110px',
          padding: '8px 14px',
          background: 'rgba(93,129,86,0.04)',
          borderBottom: `1px solid ${C.border}`,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: C.textLow,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        <span>Lead</span>
        <span>Profile</span>
        <span>Offer</span>
        <span>Expiry</span>
        <span style={{ textAlign: 'right' }}>Days</span>
        <span>Status</span>
      </div>
      {rows.map(r => (
        <div
          key={r.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 110px 80px 110px',
            padding: '10px 14px',
            background: urgencyBg(r.urgency),
            borderBottom: `1px solid ${urgencyBorder(r.urgency)}`,
            fontSize: 11,
            color: C.text,
            alignItems: 'center',
          }}
        >
          <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.name}
          </span>
          <span className="font-mono" style={{ color: C.textMid, fontSize: 10 }}>
            {r.profile || '—'}
          </span>
          <span className="font-mono" style={{ color: C.text, fontSize: 10 }}>
            {r.offerType || '—'}
          </span>
          <span className="font-mono" style={{ color: C.textMid, fontSize: 10 }}>
            {r.expiryDate ?? 'no expiry'}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              textAlign: 'right',
              color: r.urgency === 'red' ? C.red : r.urgency === 'amber' ? C.amber : C.textMid,
            }}
          >
            {r.daysRemaining !== null ? `${r.daysRemaining}d` : '—'}
          </span>
          <span>
            <StatusBadge status={r.status} />
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="font-mono"
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: 'rgba(93,129,86,0.12)',
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        fontSize: 9,
        color: C.primary,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}
    >
      {status || '—'}
    </span>
  );
}
