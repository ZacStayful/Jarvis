'use client';

import { useCallback, useEffect, useState } from 'react';
import { C } from '@/lib/jarvis-design';
import { ChunkWrapper } from './ChunkWrapper';
import type { DateRange } from './DateRangePicker';

interface OutreachData {
  calls: {
    made: number;
    leadsCalled: number;
    meetingRatePct: number;
  };
  email: {
    leadsEngaged: number;
    totalLeads: number;
    engagementRatePct: number;
    meetingRatePct: number;
  };
  whatsapp: {
    available: boolean;
    sent: number;
    replies: number;
    replyRatePct: number;
    meetingRatePct: number;
  };
}

interface OutreachMetricsProps {
  range: DateRange;
  focused: boolean;
  onFocus: () => void;
  onMetricsReady?: (m: OutreachData) => void;
}

export function OutreachMetrics({ range, focused, onFocus, onMetricsReady }: OutreachMetricsProps) {
  const [data, setData] = useState<OutreachData | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'live' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`/api/sales?chunk=outreach&from=${range.from}&to=${range.to}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.outreach);
      setStatus('live');
      onMetricsReady?.(json.outreach);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to load outreach');
    }
  }, [range.from, range.to, onMetricsReady]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <ChunkWrapper
      index="02"
      name="Outreach Channels"
      voiceCommand='focus on outreach'
      status={status === 'idle' ? 'loading' : status}
      focused={focused}
      staggerIndex={1}
      onFocus={onFocus}
      onRetry={fetchData}
      errorMessage={error ?? undefined}
    >
      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}
        >
          {/* Calls */}
          <ChannelCard
            title="Lucy / Calls"
            primary={`${data.calls.made}`}
            primaryLabel="calls made"
            rows={[
              { label: 'Leads called',      value: `${data.calls.leadsCalled}` },
              { label: 'Call → meeting',    value: `${data.calls.meetingRatePct}%` },
            ]}
            accent={C.bright}
          />

          {/* Email */}
          <ChannelCard
            title="Email / Pre-qual"
            primary={`${data.email.engagementRatePct}%`}
            primaryLabel="engagement rate"
            rows={[
              { label: 'Leads engaged', value: `${data.email.leadsEngaged} / ${data.email.totalLeads}` },
              { label: 'Email → meeting', value: `${data.email.meetingRatePct}%` },
            ]}
            accent={C.primary}
          />

          {/* WhatsApp */}
          {data.whatsapp.available ? (
            <ChannelCard
              title="WhatsApp"
              primary={`${data.whatsapp.replyRatePct}%`}
              primaryLabel="reply rate"
              rows={[
                { label: 'Sent',             value: `${data.whatsapp.sent}` },
                { label: 'Replies',          value: `${data.whatsapp.replies}` },
                { label: 'WhatsApp → meeting', value: `${data.whatsapp.meetingRatePct}%` },
              ]}
              accent={C.cyan}
            />
          ) : (
            <ComingSoonCard
              title="WhatsApp"
              note="Columns ship in Session 2. Outreach + reply tracking will populate automatically once Twilio is wired up."
            />
          )}
        </div>
      )}
    </ChunkWrapper>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChannelCard({
  title,
  primary,
  primaryLabel,
  rows,
  accent,
}: {
  title: string;
  primary: string;
  primaryLabel: string;
  rows: Array<{ label: string; value: string }>;
  accent: string;
}) {
  return (
    <div
      style={{
        background: 'rgba(93,129,86,0.04)',
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          color: C.textLow,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      <div>
        <div className="font-display" style={{ fontSize: 30, color: accent, lineHeight: 1.1 }}>
          {primary}
        </div>
        <div className="font-mono" style={{ fontSize: 10, color: C.textMid, letterSpacing: '0.08em' }}>
          {primaryLabel}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
        {rows.map(r => (
          <div
            key={r.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: C.text,
              borderTop: `1px solid ${C.border}`,
              paddingTop: 4,
            }}
          >
            <span className="font-mono" style={{ color: C.textMid, fontSize: 10, letterSpacing: '0.08em' }}>
              {r.label}
            </span>
            <span className="font-mono" style={{ color: C.bright, fontSize: 11 }}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoonCard({ title, note }: { title: string; note: string }) {
  return (
    <div
      style={{
        background: 'rgba(212,135,42,0.04)',
        border: `1px dashed rgba(212,135,42,0.35)`,
        borderRadius: 4,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: 10,
          color: C.amber,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}
      >
        {title} · Coming Soon
      </div>
      <div className="font-display" style={{ fontSize: 30, color: C.textLow, lineHeight: 1.1 }}>—</div>
      <div className="font-mono" style={{ fontSize: 10, color: C.textMid, letterSpacing: '0.08em' }}>tracking awaiting setup</div>
      <p style={{ fontSize: 11, color: C.textMid, lineHeight: 1.5, marginTop: 4 }}>{note}</p>
    </div>
  );
}
