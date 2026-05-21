'use client';

// SalesDashboard — top-level shell for the Sales Intelligence dashboard.
//
// Owns the date range, the focused-chunk state, the voice-command intercepts
// for chunk navigation, and the "summarise this section" hook into the
// Anthropic API. Each chunk owns its own fetch + loading state.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { C } from '@/lib/jarvis-design';
import { useTTS } from '@/hooks/useTTS';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  CHUNK_META,
  CHUNK_ORDER,
  type ChunkId,
  commandToChunk,
  detectSalesCommand,
} from '@/lib/sales/commands';

import { DateRangePicker, fromPreset, type DateRange } from './DateRangePicker';
import { PipelineFunnel } from './PipelineFunnel';
import { OutreachMetrics } from './OutreachMetrics';
import { WebMeetingMetrics } from './WebMeetingMetrics';
import { SpecialOffers } from './SpecialOffers';

export function SalesDashboard() {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>(() => fromPreset('month'));
  const [focused, setFocused] = useState<ChunkId | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    activityLogsAvailable: boolean;
    hasMilestoneDates: boolean;
    fetchedAt: string | null;
  }>({ activityLogsAvailable: true, hasMilestoneDates: true, fetchedAt: null });

  // Each chunk surfaces its latest metrics so "summarise" has something to
  // hand to Claude when the user asks for a verbal briefing.
  const metricsRef = useRef<Partial<Record<ChunkId, unknown>>>({});
  const handleMetrics = (id: ChunkId) => (m: unknown) => {
    metricsRef.current[id] = m;
  };

  // Pull diagnostics once after first load — chunk=pipeline carries them.
  useEffect(() => {
    fetch(`/api/sales?chunk=pipeline&from=${range.from}&to=${range.to}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j) return;
        setDiagnostics({
          activityLogsAvailable: !!j.activityLogsAvailable,
          hasMilestoneDates: !!j.diagnostics?.hasMilestoneDates,
          fetchedAt: j.diagnostics?.fetchedAt ?? null,
        });
      })
      .catch(() => { /* chunk error states will surface this */ });
  }, [range.from, range.to]);

  // ─── Voice + TTS ────────────────────────────────────────────────────────────
  const { speak, stop: stopSpeaking, isSpeaking, muted, toggleMuted } = useTTS();
  const [voiceAlwaysOn, setVoiceAlwaysOn] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('jarvis_voice_always_on');
    if (stored !== null) setVoiceAlwaysOn(stored === 'true');
  }, []);
  const toggleVoiceAlwaysOn = () => {
    const next = !voiceAlwaysOn;
    setVoiceAlwaysOn(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('jarvis_voice_always_on', String(next));
    }
  };

  const focusNext = useCallback(() => {
    setFocused(prev => {
      if (!prev) return CHUNK_ORDER[0];
      const i = CHUNK_ORDER.indexOf(prev);
      return CHUNK_ORDER[(i + 1) % CHUNK_ORDER.length];
    });
  }, []);
  const focusPrev = useCallback(() => {
    setFocused(prev => {
      if (!prev) return CHUNK_ORDER[CHUNK_ORDER.length - 1];
      const i = CHUNK_ORDER.indexOf(prev);
      return CHUNK_ORDER[(i - 1 + CHUNK_ORDER.length) % CHUNK_ORDER.length];
    });
  }, []);

  const summariseFocused = useCallback(async () => {
    if (!focused) {
      speak('No section is focused. Say "focus on pipeline" or one of the other sections first.');
      return;
    }
    const data = metricsRef.current[focused];
    if (!data) {
      speak('That section has not finished loading.');
      return;
    }
    try {
      const res = await fetch('/api/sales/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunk: focused, metrics: data }),
      });
      const json = await res.json();
      if (json.text) speak(json.text);
    } catch {
      speak('Briefing failed. Try again in a moment.');
    }
  }, [focused, speak]);

  const handleVoice = useCallback((text: string) => {
    const cmd = detectSalesCommand(text);
    if (!cmd) return;

    stopSpeaking();
    const chunk = commandToChunk(cmd);
    if (chunk) {
      setFocused(chunk);
      speak(`Focusing on ${CHUNK_META[chunk].name}.`);
      return;
    }
    if (cmd === 'summarise')         { summariseFocused();          return; }
    if (cmd === 'next-section')      { focusNext();                 return; }
    if (cmd === 'previous-section')  { focusPrev();                 return; }
    if (cmd === 'close')             { router.push('/');            return; }
    // navigate is already-here; no-op
  }, [stopSpeaking, speak, summariseFocused, focusNext, focusPrev, router]);

  const { startListening, stopListening, isListening, partialTranscript } = useVoiceInput({
    onFinalTranscript: text => {
      handleVoice(text);
      if (voiceAlwaysOn) {
        setTimeout(() => { startListening().catch(() => {}); }, 600);
      }
    },
  });

  // Always-on voice loop — same shape as app/page.tsx
  useEffect(() => {
    if (!voiceAlwaysOn) {
      if (isListening) stopListening();
      return;
    }
    if (isSpeaking) {
      if (isListening) stopListening();
      return;
    }
    if (!isListening) {
      const t = setTimeout(() => { startListening().catch(() => {}); }, 400);
      return () => clearTimeout(t);
    }
  }, [voiceAlwaysOn, isSpeaking, isListening, startListening, stopListening]);

  // Escape stops TTS
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stopSpeaking(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stopSpeaking]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const footerNote = useMemo(() => {
    if (diagnostics.hasMilestoneDates) return null;
    return 'Pipeline stage metrics accurate from board creation. Historical milestone dates (qualified, became-customer) ship in Session 2.';
  }, [diagnostics.hasMilestoneDates]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ChunkAnimations />

      {/* Sticky header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: `linear-gradient(180deg, #0a180a 0%, ${C.bg} 100%)`,
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.primary,
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
            aria-label="Back to JARVIS"
          >
            <ChevronLeft size={16} />
          </button>
          <span
            className="font-display"
            style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.22em', color: C.bright }}
          >
            J.A.R.V.I.S
          </span>
          <span style={{ width: 1, height: 14, background: C.border }} />
          <span
            className="font-mono"
            style={{ fontSize: 10, color: C.textLow, letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            Sales Intelligence
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <DateRangePicker value={range} onChange={setRange} />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              background: C.surface,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: isListening ? C.amber : isSpeaking ? C.bright : C.textLow,
                animation: isListening || isSpeaking ? 'dotPulse 1s ease-in-out infinite' : 'none',
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: 9, color: C.textMid, letterSpacing: '0.16em', textTransform: 'uppercase' }}
            >
              {isListening ? 'Listening' : isSpeaking ? 'Speaking' : 'Voice ready'}
            </span>
          </div>

          <button
            onClick={toggleVoiceAlwaysOn}
            title={voiceAlwaysOn ? 'Always-on voice (click to disable)' : 'Voice off (click to enable)'}
            style={iconButton(voiceAlwaysOn)}
          >
            {voiceAlwaysOn ? <Mic size={13} color={C.bright} /> : <MicOff size={13} color={C.textLow} />}
          </button>

          <button
            onClick={toggleMuted}
            title={muted ? 'Unmute voice' : 'Mute voice'}
            style={iconButton(!muted)}
          >
            {muted ? <VolumeX size={13} color={C.textLow} /> : <Volume2 size={13} color={C.bright} />}
          </button>
        </div>
      </header>

      {/* Partial transcript ticker */}
      {isListening && partialTranscript && (
        <div
          className="font-mono"
          style={{
            background: 'rgba(212,135,42,0.04)',
            borderBottom: `1px solid rgba(212,135,42,0.2)`,
            padding: '4px 24px',
            fontSize: 10,
            color: C.amber,
            letterSpacing: '0.1em',
          }}
        >
          ▸ {partialTranscript}
        </div>
      )}

      {/* Chunks */}
      <main
        style={{
          flex: 1,
          padding: '20px 24px 120px',
          maxWidth: 1400,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <PipelineFunnel
          range={range}
          focused={focused === 'pipeline'}
          onFocus={() => setFocused('pipeline')}
          onMetricsReady={handleMetrics('pipeline')}
        />
        <OutreachMetrics
          range={range}
          focused={focused === 'outreach'}
          onFocus={() => setFocused('outreach')}
          onMetricsReady={handleMetrics('outreach')}
        />
        <WebMeetingMetrics
          range={range}
          focused={focused === 'meetings'}
          onFocus={() => setFocused('meetings')}
          onMetricsReady={handleMetrics('meetings')}
        />
        <SpecialOffers
          range={range}
          focused={focused === 'offers'}
          onFocus={() => setFocused('offers')}
          onMetricsReady={handleMetrics('offers')}
        />

        {/* Footer notes */}
        <footer
          className="font-mono"
          style={{
            marginTop: 24,
            padding: '14px 16px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            fontSize: 10,
            color: C.textMid,
            letterSpacing: '0.08em',
            lineHeight: 1.6,
          }}
        >
          {footerNote && <div>• {footerNote}</div>}
          {!diagnostics.activityLogsAvailable && (
            <div>• Re-engagement metrics fall back to the no-show flag — activity_logs API is not available on this Monday plan.</div>
          )}
          <div style={{ color: C.textLow, marginTop: 6 }}>
            Data cached for 5 minutes · Monday board {process.env.NEXT_PUBLIC_MONDAY_BOARD_ID ?? '5891626711'}
            {diagnostics.fetchedAt && <> · Last fetched {new Date(diagnostics.fetchedAt).toLocaleTimeString('en-GB')}</>}
          </div>
        </footer>
      </main>

      {/* Voice command overlay */}
      <VoiceOverlay />
    </div>
  );
}

// ─── Voice overlay ──────────────────────────────────────────────────────────

function VoiceOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: '8px 14px',
        display: 'flex',
        gap: 14,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        zIndex: 30,
      }}
    >
      {[
        '"focus on pipeline"',
        '"focus on outreach"',
        '"focus on meetings"',
        '"show me offers"',
        '"summarise"',
        '"next section"',
        '"close sales"',
      ].map(s => (
        <span
          key={s}
          className="font-mono"
          style={{ fontSize: 9, color: C.textMid, letterSpacing: '0.1em', textTransform: 'lowercase' }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function iconButton(active: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 4,
    border: `1px solid ${active ? `${C.primary}66` : C.border}`,
    background: active ? `${C.primary}15` : 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

// ─── Animations ──────────────────────────────────────────────────────────────
// Injected once at the dashboard root — keeps the styles co-located with the
// component that depends on them. Mirrors the GlobalStyles pattern used by
// the JARVIS shell, but scoped to this page.

function ChunkAnimations() {
  return (
    <style>{`
      @keyframes chunkFadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes chunkScan {
        0%   { transform: translateY(0); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translateY(400px); opacity: 0; }
      }
      @keyframes dotPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.4; transform: scale(0.85); }
      }
    `}</style>
  );
}
