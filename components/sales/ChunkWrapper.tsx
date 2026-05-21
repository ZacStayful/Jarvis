'use client';

import { useEffect, useRef } from 'react';
import { C } from '@/lib/jarvis-design';

type Status = 'live' | 'loading' | 'error' | 'idle';

interface ChunkWrapperProps {
  index: string;           // "01" .. "04"
  name: string;
  voiceCommand: string;    // hint shown on hover
  status: Status;
  focused: boolean;
  staggerIndex?: number;   // for fade-up delay
  onFocus: () => void;
  onRetry?: () => void;
  errorMessage?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

const STATUS_COLOR: Record<Status, string> = {
  live: C.bright,
  loading: C.amber,
  error: C.red,
  idle: C.textLow,
};

export function ChunkWrapper({
  index,
  name,
  voiceCommand,
  status,
  focused,
  staggerIndex = 0,
  onFocus,
  onRetry,
  errorMessage,
  rightSlot,
  children,
}: ChunkWrapperProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  // Scroll the focused chunk into view (smooth) when it becomes active.
  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focused]);

  return (
    <section
      ref={ref}
      onClick={onFocus}
      style={{
        position: 'relative',
        padding: '20px 24px',
        marginBottom: 16,
        borderRadius: 6,
        background: focused ? 'rgba(93,129,86,0.04)' : C.surface,
        border: `1px solid ${focused ? C.borderHi : C.border}`,
        borderLeft: focused ? `3px solid ${C.primary}` : `1px solid ${C.border}`,
        cursor: 'pointer',
        opacity: 0,
        transform: 'translateY(8px)',
        animation: `chunkFadeUp 0.4s ease-out ${staggerIndex * 0.05}s forwards`,
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Scan line — only while focused */}
      {focused && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
            animation: 'chunkScan 3s linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Header row */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: C.textLow,
              letterSpacing: '0.2em',
            }}
          >
            {index}
          </span>
          <h2
            className="font-display"
            style={{
              fontSize: 14,
              color: focused ? C.bright : C.text,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              fontWeight: 600,
              margin: 0,
            }}
          >
            {name}
          </h2>
          <span
            className="font-mono"
            title={voiceCommand}
            style={{
              fontSize: 9,
              color: C.textLow,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              opacity: 0.6,
            }}
          >
            ⌘ {voiceCommand}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {rightSlot}
          <StatusDot status={status} />
        </div>
      </header>

      {/* Focused banner */}
      {focused && (
        <div
          style={{
            marginBottom: 14,
            padding: '6px 10px',
            borderRadius: 4,
            background: 'rgba(93,129,86,0.08)',
            border: `1px solid rgba(93,129,86,0.25)`,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: C.primary,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          ▸ JARVIS is focused — say &quot;summarise&quot; for an AI briefing
        </div>
      )}

      {/* Error / retry state */}
      {status === 'error' && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 4,
            background: 'rgba(224,68,68,0.08)',
            border: `1px solid rgba(224,68,68,0.25)`,
            color: C.red,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span>{errorMessage ?? 'Data fetch failed.'}</span>
          {onRetry && (
            <button
              onClick={e => { e.stopPropagation(); onRetry(); }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: C.bright,
                background: 'transparent',
                border: `1px solid ${C.border}`,
                padding: '4px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                letterSpacing: '0.12em',
              }}
            >
              RETRY
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {status !== 'error' && children}
    </section>
  );
}

// ─── Status dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Status }) {
  const color = STATUS_COLOR[status];
  const pulse = status === 'loading' || status === 'live';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: pulse ? `0 0 8px ${color}` : 'none',
          animation: pulse ? 'dotPulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <span
        className="font-mono"
        style={{ fontSize: 9, color, letterSpacing: '0.16em', textTransform: 'uppercase' }}
      >
        {status}
      </span>
    </div>
  );
}
