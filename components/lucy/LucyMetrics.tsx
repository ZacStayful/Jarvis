'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfilePerf {
  profile: string;
  calls: number;
  conversions: number;
  conversionRate: number;
  avgCallsNeeded: number;
  recommendation: string;
}

interface ObjectionPattern {
  objection: string;
  frequency: number;
  resolvedRate: number;
  bestResponse: string;
}

interface PlaybookRec {
  priority: number;
  recommendation: string;
  impact: string;
  category: string;
}

interface IntelligenceUpdate {
  category: string;
  finding: string;
  confidence: 'high' | 'medium' | 'low';
  obsidianPath: string;
}

export interface LucyAnalysis {
  summary: {
    totalCalls: number;
    conversions: number;
    conversionRate: number;
    avgCallsToConvert: number;
    topOutcome: string;
    periodInsight?: string;
  };
  profilePerformance: ProfilePerf[];
  objectionPatterns: ObjectionPattern[];
  fastPathSignals: string[];
  slowPathSignals: string[];
  playbookRecommendations: PlaybookRec[];
  intelligenceUpdates: IntelligenceUpdate[];
}

interface LucyMetricsProps {
  analysis: LucyAnalysis | null;
  isLoading?: boolean;
  onLogToObsidian?: (updates: IntelligenceUpdate[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROFILE_SHORT: Record<string, string> = {
  'existing-property-stl': 'STL Switch',
  'existing-stl-management': 'STL Mgmt',
  'portfolio-landlord': 'Portfolio',
  'purchasing-stl': 'Purchasing',
  'selling-property': 'Selling',
  'moving-abroad': 'Abroad',
};

const CATEGORY_COLOURS: Record<string, string> = {
  qualification: '#5d8156',
  objection: '#d4a84b',
  timing: '#7a9f72',
  profile: '#6b7280',
  script: '#9b59b6',
};

const CONFIDENCE_COLOURS: Record<string, string> = {
  high: '#5d8156',
  medium: '#d4a84b',
  low: '#6b7280',
};

function rateColour(rate: number): string {
  if (rate >= 15) return '#5d8156';
  if (rate >= 8) return '#d4a84b';
  return '#c0392b';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, colour = '#5d8156' }: { label: string; colour?: string }) {
  return (
    <h4
      style={{
        fontFamily: 'monospace',
        fontSize: '10px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: colour,
        marginBottom: '12px',
      }}
    >
      {label}
    </h4>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#0d1a0d',
        border: '1px solid #1a2e1a',
        borderRadius: '6px',
        padding: '16px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LucyMetrics({ analysis, isLoading, onLogToObsidian }: LucyMetricsProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              height: '80px',
              background: '#0d1a0d',
              border: '1px solid #1a2e1a',
              borderRadius: '6px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
        <div
          style={{
            width: '40px', height: '40px',
            borderRadius: '50%',
            border: '1px solid #1a2e1a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '16px' }}>∅</span>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>No analysis data</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Run analysis from the Intelligence tab</p>
      </div>
    );
  }

  const { summary, profilePerformance, objectionPatterns, playbookRecommendations, intelligenceUpdates, fastPathSignals, slowPathSignals } = analysis;
  const maxFreq = Math.max(...(objectionPatterns?.map(o => o.frequency) ?? [1]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Summary stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
          {
            label: 'Conversion Rate',
            value: `${(summary.conversionRate ?? 0).toFixed(1)}%`,
            sub: `${summary.conversions ?? 0} / ${summary.totalCalls ?? 0} calls`,
            colour: rateColour(summary.conversionRate ?? 0),
          },
          {
            label: 'Total Calls',
            value: summary.totalCalls ?? 0,
            sub: `${summary.conversions ?? 0} booked`,
            colour: '#7a9f72',
          },
          {
            label: 'Avg to Convert',
            value: summary.avgCallsToConvert ? `${summary.avgCallsToConvert.toFixed(1)}` : '—',
            sub: 'calls per deal',
            colour: (summary.avgCallsToConvert ?? 99) <= 2 ? '#5d8156' : (summary.avgCallsToConvert ?? 99) <= 4 ? '#d4a84b' : '#c0392b',
          },
        ].map(stat => (
          <Card key={stat.label}>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700, color: stat.colour, marginBottom: '2px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{stat.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>{stat.sub}</div>
          </Card>
        ))}
      </div>

      {/* ── Period insight ── */}
      {summary.periodInsight && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: 'rgba(93,129,86,0.06)',
            border: '1px solid rgba(93,129,86,0.2)',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: '#5d8156', marginRight: '8px' }}>→</span>
          {summary.periodInsight}
        </div>
      )}

      {/* ── Profile performance ── */}
      {profilePerformance?.length > 0 && (
        <Card>
          <SectionHeader label="Profile Performance" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profilePerformance
              .slice()
              .sort((a, b) => b.conversionRate - a.conversionRate)
              .map(p => (
                <div key={p.profile} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.45)', width: '72px', flexShrink: 0 }}>
                    {PROFILE_SHORT[p.profile] ?? p.profile}
                  </span>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(p.conversionRate ?? 0, 100)}%`,
                        background: rateColour(p.conversionRate ?? 0),
                        borderRadius: '2px',
                        transition: 'width 0.5s',
                      }}
                    />
                  </div>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: rateColour(p.conversionRate ?? 0), width: '36px', textAlign: 'right' }}>
                    {(p.conversionRate ?? 0).toFixed(0)}%
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', width: '24px', textAlign: 'right' }}>
                    {p.calls}c
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ── Objection patterns ── */}
      {objectionPatterns?.length > 0 && (
        <Card>
          <SectionHeader label="Objection Frequency" colour="#d4a84b" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {objectionPatterns
              .slice()
              .sort((a, b) => b.frequency - a.frequency)
              .slice(0, 6)
              .map((obj, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {obj.objection}
                    </span>
                    <div style={{ width: '60px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(obj.frequency / maxFreq) * 100}%`,
                          background: 'rgba(212,168,75,0.7)',
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(212,168,75,0.7)', width: '24px', textAlign: 'right' }}>
                      {obj.frequency}×
                    </span>
                  </div>
                  {obj.resolvedRate > 0 && (
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', paddingLeft: '0' }}>
                      Resolved {obj.resolvedRate.toFixed(0)}% of the time
                    </div>
                  )}
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* ── Fast / slow path signals ── */}
      {(fastPathSignals?.length > 0 || slowPathSignals?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {fastPathSignals?.length > 0 && (
            <Card>
              <SectionHeader label="Fast Path Signals" colour="#5d8156" />
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {fastPathSignals.slice(0, 4).map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                    <span style={{ color: '#5d8156', flexShrink: 0 }}>+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {slowPathSignals?.length > 0 && (
            <Card>
              <SectionHeader label="Slow Path Signals" colour="#c0392b" />
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {slowPathSignals.slice(0, 4).map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                    <span style={{ color: '#c0392b', flexShrink: 0 }}>−</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ── Playbook recommendations ── */}
      {playbookRecommendations?.length > 0 && (
        <Card>
          <SectionHeader label="Playbook Recommendations" colour="#d4a84b" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {playbookRecommendations.slice(0, 4).map((rec, i) => {
              const catColour = CATEGORY_COLOURS[rec.category] ?? '#6b7280';
              return (
                <div key={i} style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#d4a84b', paddingTop: '1px', flexShrink: 0 }}>
                    {String(rec.priority).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '9px',
                          letterSpacing: '0.1em',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: `${catColour}15`,
                          color: catColour,
                          textTransform: 'uppercase',
                        }}
                      >
                        {rec.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: '3px' }}>
                      {rec.recommendation}
                    </p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>{rec.impact}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Intelligence updates ── */}
      {intelligenceUpdates?.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <SectionHeader label="Intelligence Updates" colour="#7a9f72" />
            {onLogToObsidian && (
              <button
                onClick={() => onLogToObsidian(intelligenceUpdates)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: 'rgba(93,129,86,0.15)',
                  color: '#5d8156',
                  border: '1px solid rgba(93,129,86,0.3)',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                Log to Obsidian →
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {intelligenceUpdates.slice(0, 5).map((update, i) => (
              <div key={i} style={{ paddingLeft: '12px', borderLeft: `2px solid rgba(122,159,114,0.3)` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#7a9f72' }}>{update.category}</span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '9px',
                      color: CONFIDENCE_COLOURS[update.confidence] ?? '#6b7280',
                    }}
                  >
                    {update.confidence} confidence
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: '3px' }}>
                  {update.finding}
                </p>
                {update.obsidianPath && (
                  <p style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                    → {update.obsidianPath}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
