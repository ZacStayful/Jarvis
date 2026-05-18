'use client';

import { useState } from 'react';
import type { useLearningSystem } from '../../hooks/useLearningSystem';
import { LearningReview } from './LearningReview';
import { UncertainItems } from './UncertainItems';
import { TranscriptView } from './TranscriptView';
import { SaveApproval } from './SaveApproval';

type LearningSystemInstance = ReturnType<typeof useLearningSystem>;

interface EndOfDayPanelProps {
  system: LearningSystemInstance;
  onClose: () => void;
}

export function EndOfDayPanel({ system, onClose }: EndOfDayPanelProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const { state, learnings, transcript, error, saveLog } = system;

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Count totals
  const totalLearnings = Object.values(learnings).reduce(
    (sum, items) => sum + items.length,
    0
  );
  const uncertainCount = Object.values(learnings).reduce(
    (sum, items) =>
      sum +
      (items as Array<{ confidence: string }>).filter(
        i => i.confidence === 'uncertain'
      ).length,
    0
  );
  const messageCount = transcript?.messages.length ?? 0;

  return (
    <div className="eod-panel">
      {/* Header */}
      <div className="eod-header">
        <div className="eod-header-left">
          <div className="eod-label">END OF DAY PROCESSING</div>
          <div className="eod-date">{today}</div>
        </div>
        <button className="eod-close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Status bar */}
      <div className="eod-status-bar">
        <span className={`eod-state-pill state-${state}`}>
          {STATE_LABELS[state]}
        </span>
        {messageCount > 0 && (
          <span className="eod-meta">{messageCount} messages recorded today</span>
        )}
      </div>

      {/* ── LOADING ── */}
      {state === 'loading' && (
        <div className="eod-loading">
          <div className="eod-spinner">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="eod-spinner-dot" style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
          <p className="eod-loading-text">
            Analysing today&apos;s conversations.<br/>
            Extracting strategic learnings.
          </p>
        </div>
      )}

      {/* ── ERROR ── */}
      {state === 'error' && (
        <div className="eod-error">
          <div className="eod-error-icon">⚠</div>
          <p className="eod-error-message">{error}</p>
          <button className="eod-btn eod-btn-secondary" onClick={() => system.reset()}>
            Reset
          </button>
        </div>
      )}

      {/* ── UNCERTAIN — resolve flagged items first ── */}
      {state === 'uncertain' && (
        <UncertainItems
          learnings={learnings}
          onApprove={system.approveUncertain}
          onReject={system.rejectUncertain}
          onProceed={system.proceedToSave}
          uncertainCount={uncertainCount}
        />
      )}

      {/* ── REVIEWING ── */}
      {state === 'reviewing' && (
        <>
          <div className="eod-summary-row">
            <div className="eod-summary-stat">
              <span className="eod-stat-num">{totalLearnings}</span>
              <span className="eod-stat-label">Learnings Extracted</span>
            </div>
            <button
              className="eod-transcript-toggle"
              onClick={() => setShowTranscript(v => !v)}
            >
              {showTranscript ? 'Hide Transcript' : 'View Full Transcript'}
            </button>
          </div>

          {showTranscript && transcript && (
            <TranscriptView transcript={transcript} />
          )}

          <LearningReview
            learnings={learnings}
            onUpdate={system.updateItem}
            onRemove={system.removeItem}
          />

          <div className="eod-actions">
            <SaveApproval onSave={system.save} />
          </div>
        </>
      )}

      {/* ── SAVING ── */}
      {state === 'saving' && (
        <div className="eod-loading">
          <div className="eod-spinner">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="eod-spinner-dot" style={{ '--i': i } as React.CSSProperties} />
            ))}
          </div>
          <p className="eod-loading-text">Writing to knowledge base…</p>
        </div>
      )}

      {/* ── COMPLETE ── */}
      {state === 'complete' && (
        <div className="eod-complete">
          <div className="eod-complete-icon">✓</div>
          <h3 className="eod-complete-title">Learnings Logged</h3>
          <div className="eod-save-log">
            {saveLog.map((line, i) => (
              <div key={i} className="eod-save-log-line">{line}</div>
            ))}
          </div>
          <p className="eod-complete-meta">
            JARVIS has recorded today&apos;s strategic learnings.<br />
            Knowledge base updated.
          </p>
          <button className="eod-btn eod-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      )}

      <style>{`
        /* ── Panel shell ── */
        .eod-panel {
          position: relative;
          z-index: 1;
          width: min(720px, 100vw);
          height: 100vh;
          background: #0a0f0a;
          border-left: 1px solid rgba(93, 129, 86, 0.35);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
          animation: eod-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes eod-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }

        /* ── Header ── */
        .eod-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 28px 32px 20px;
          border-bottom: 1px solid rgba(93, 129, 86, 0.2);
        }

        .eod-label {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: #5d8156;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .eod-date {
          font-size: 18px;
          color: #e8f0e6;
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        .eod-close {
          background: none;
          border: none;
          color: #4a5e47;
          cursor: pointer;
          padding: 4px;
          transition: color 0.15s;
          margin-top: 2px;
        }
        .eod-close:hover { color: #5d8156; }

        /* ── Status bar ── */
        .eod-status-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 32px;
          border-bottom: 1px solid rgba(93, 129, 86, 0.12);
        }

        .eod-state-pill {
          font-size: 10px;
          letter-spacing: 0.15em;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 2px;
          text-transform: uppercase;
        }

        .state-idle, .state-loading { background: rgba(93,129,86,0.15); color: #5d8156; }
        .state-reviewing { background: rgba(93,129,86,0.25); color: #7ab572; }
        .state-uncertain { background: rgba(200,150,40,0.2); color: #d4a843; }
        .state-saving { background: rgba(93,129,86,0.15); color: #5d8156; }
        .state-complete { background: rgba(93,129,86,0.3); color: #8cc887; }
        .state-error { background: rgba(200,60,60,0.2); color: #e06060; }

        .eod-meta {
          font-size: 11px;
          color: #3d5239;
          letter-spacing: 0.05em;
        }

        /* ── Loading ── */
        .eod-loading {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
        }

        .eod-spinner {
          position: relative;
          width: 56px;
          height: 56px;
        }

        .eod-spinner-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #5d8156;
          transform-origin: 0 0;
          transform: rotate(calc(var(--i) * 45deg)) translate(24px, -50%);
          animation: eod-dot-pulse 1.2s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.15s);
        }

        @keyframes eod-dot-pulse {
          0%, 100% { opacity: 0.15; transform: rotate(calc(var(--i) * 45deg)) translate(24px, -50%) scale(1); }
          50% { opacity: 1; transform: rotate(calc(var(--i) * 45deg)) translate(24px, -50%) scale(1.6); }
        }

        .eod-loading-text {
          font-size: 13px;
          color: #3d5239;
          text-align: center;
          line-height: 1.8;
          letter-spacing: 0.05em;
        }

        /* ── Error ── */
        .eod-error {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 40px;
        }

        .eod-error-icon { font-size: 36px; color: #e06060; }
        .eod-error-message { font-size: 13px; color: #c47070; text-align: center; line-height: 1.7; max-width: 360px; }

        /* ── Summary row ── */
        .eod-summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          border-bottom: 1px solid rgba(93,129,86,0.12);
        }

        .eod-summary-stat {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .eod-stat-num {
          font-size: 32px;
          color: #5d8156;
          font-weight: 300;
          line-height: 1;
        }

        .eod-stat-label {
          font-size: 11px;
          color: #3d5239;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .eod-transcript-toggle {
          background: none;
          border: 1px solid rgba(93,129,86,0.3);
          color: #4a5e47;
          font-size: 11px;
          letter-spacing: 0.1em;
          padding: 7px 14px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .eod-transcript-toggle:hover {
          border-color: #5d8156;
          color: #5d8156;
        }

        /* ── Actions ── */
        .eod-actions {
          padding: 24px 32px;
          border-top: 1px solid rgba(93,129,86,0.2);
          margin-top: auto;
        }

        /* ── Complete ── */
        .eod-complete {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 48px;
          text-align: center;
        }

        .eod-complete-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid #5d8156;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          color: #5d8156;
        }

        .eod-complete-title {
          font-size: 20px;
          color: #e8f0e6;
          font-weight: 300;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .eod-save-log {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          max-width: 400px;
        }

        .eod-save-log-line {
          font-size: 12px;
          color: #5d8156;
          letter-spacing: 0.05em;
          text-align: left;
          padding: 8px 12px;
          background: rgba(93,129,86,0.08);
          border-left: 2px solid rgba(93,129,86,0.4);
        }

        .eod-complete-meta {
          font-size: 12px;
          color: #3d5239;
          line-height: 1.8;
        }

        /* ── Shared buttons ── */
        .eod-btn {
          font-family: inherit;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 12px 28px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .eod-btn-primary {
          background: #5d8156;
          color: #0a0f0a;
          font-weight: 700;
        }
        .eod-btn-primary:hover { background: #6e9466; }

        .eod-btn-secondary {
          background: transparent;
          border: 1px solid rgba(93,129,86,0.4);
          color: #5d8156;
        }
        .eod-btn-secondary:hover { border-color: #5d8156; background: rgba(93,129,86,0.08); }
      `}</style>
    </div>
  );
}

const STATE_LABELS: Record<string, string> = {
  idle: 'Initialising',
  loading: 'Extracting',
  reviewing: 'Review Mode',
  uncertain: 'Pending Confirmation',
  saving: 'Writing',
  complete: 'Complete',
  error: 'Error',
};
