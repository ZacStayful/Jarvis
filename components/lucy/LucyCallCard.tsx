'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallRecord {
  id: string;
  name: string;
  outcome: string;
  notes: string;
  objections: string;
  duration: string;
  callNumber: string;
  profile: string;
  properties: string;
  updatedAt: string;
  email?: string;
  phone?: string;
}

interface LucyCallCardProps {
  call: CallRecord;
}

// ─── Outcome display config ───────────────────────────────────────────────────

interface OutcomeStyle {
  label: string;
  colour: string;
  bg: string;
}

const OUTCOME_MAP: Array<[RegExp, OutcomeStyle]> = [
  [/booked|meeting/i, { label: 'BOOKED', colour: '#5d8156', bg: 'rgba(93,129,86,0.12)' }],
  [/not interested|not int/i, { label: 'NOT INTERESTED', colour: '#c0392b', bg: 'rgba(192,57,43,0.12)' }],
  [/callback|call back/i, { label: 'CALLBACK', colour: '#d4a84b', bg: 'rgba(212,168,75,0.12)' }],
  [/voicemail|voice mail/i, { label: 'VOICEMAIL', colour: '#6b7280', bg: 'rgba(107,114,128,0.12)' }],
  [/no answer|unanswered/i, { label: 'NO ANSWER', colour: '#4b5563', bg: 'rgba(75,85,99,0.1)' }],
  [/left message/i, { label: 'LEFT MSG', colour: '#7a6fa0', bg: 'rgba(122,111,160,0.12)' }],
  [/called|lucy called/i, { label: 'CALLED', colour: '#7a9f72', bg: 'rgba(122,159,114,0.12)' }],
];

function getOutcomeStyle(outcome: string): OutcomeStyle {
  for (const [pattern, style] of OUTCOME_MAP) {
    if (pattern.test(outcome)) return style;
  }
  return {
    label: (outcome ?? 'UNKNOWN').toUpperCase().slice(0, 14),
    colour: '#6b7280',
    bg: 'rgba(107,114,128,0.08)',
  };
}

const PROFILE_LABELS: Record<string, string> = {
  'existing-property-stl': 'STL Switch',
  'existing-stl-management': 'STL Mgmt',
  'portfolio-landlord': 'Portfolio',
  'purchasing-stl': 'Purchasing',
  'selling-property': 'Selling',
  'moving-abroad': 'Abroad',
};

// ─── Time helper ──────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LucyCallCard({ call }: LucyCallCardProps) {
  const outcome = getOutcomeStyle(call.outcome);
  const profileLabel = PROFILE_LABELS[call.profile] ?? call.profile;

  const objectionList = call.objections
    ? call.objections
        .split(/[,;]/)
        .map(o => o.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      style={{
        background: '#0d1a0d',
        border: '1px solid #1a2e1a',
        borderRadius: '6px',
        padding: '14px 16px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#2d4a2d')}
      onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.borderColor = '#1a2e1a')}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'white', fontWeight: 500, fontSize: '13px' }}>{call.name}</span>
            {call.callNumber && (
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                Call #{call.callNumber}
              </span>
            )}
          </div>
          {profileLabel && (
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#5d8156' }}>
              {profileLabel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {call.duration && (
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              {call.duration}
            </span>
          )}
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              letterSpacing: '0.05em',
              padding: '3px 8px',
              borderRadius: '4px',
              color: outcome.colour,
              background: outcome.bg,
              border: `1px solid ${outcome.colour}25`,
            }}
          >
            {outcome.label}
          </span>
        </div>
      </div>

      {/* Notes */}
      {call.notes && (
        <p
          style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.55,
            marginBottom: objectionList.length > 0 ? '8px' : '0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {call.notes}
        </p>
      )}

      {/* Objection tags */}
      {objectionList.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' }}>
          {objectionList.map((obj, i) => (
            <span
              key={i}
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '999px',
                color: 'rgba(212,168,75,0.8)',
                border: '1px solid rgba(212,168,75,0.2)',
                background: 'rgba(212,168,75,0.06)',
              }}
            >
              {obj}
            </span>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.18)', marginTop: '4px' }}>
        {relativeTime(call.updatedAt)}
      </div>
    </div>
  );
}
