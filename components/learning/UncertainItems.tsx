'use client';

import { useState } from 'react';
import type { ExtractedLearnings, LearningItem } from '../../lib/transcript-store';

const CATEGORY_LABELS: Record<keyof ExtractedLearnings, string> = {
  stayfulInsights: 'Stayful Insights',
  investmentUpdates: 'Investment Updates',
  newsImpact: 'News Impact',
  leadKnowledge: 'Lead Knowledge',
  actionItems: 'Action Items',
  patternsDetected: 'Patterns',
};

interface UncertainItemsProps {
  learnings: ExtractedLearnings;
  onApprove: (category: keyof ExtractedLearnings, index: number) => void;
  onReject: (category: keyof ExtractedLearnings, index: number) => void;
  onProceed: () => void;
  uncertainCount: number;
}

interface UncertainEntry {
  category: keyof ExtractedLearnings;
  index: number;
  item: LearningItem;
}

export function UncertainItems({
  learnings,
  onApprove,
  onReject,
  onProceed,
  uncertainCount,
}: UncertainItemsProps) {
  // Collect all uncertain items with their origin info
  const allUncertain: UncertainEntry[] = [];
  for (const [cat, items] of Object.entries(learnings) as [
    keyof ExtractedLearnings,
    LearningItem[]
  ][]) {
    items.forEach((item, idx) => {
      if (item.confidence === 'uncertain') {
        allUncertain.push({ category: cat, index: idx, item });
      }
    });
  }

  const [currentPos, setCurrentPos] = useState(0);
  const [resolved, setResolved] = useState(0);

  // All resolved
  if (allUncertain.length === 0 || resolved >= allUncertain.length) {
    return (
      <div className="ui-done">
        <div className="ui-done-icon">✓</div>
        <p className="ui-done-text">All uncertain items resolved.</p>
        <button className="ui-btn ui-btn-primary" onClick={onProceed}>
          Continue to Review
        </button>

        <style>{STYLES}</style>
      </div>
    );
  }

  const current = allUncertain[currentPos];
  const remaining = allUncertain.length - resolved;

  const handleApprove = () => {
    onApprove(current.category, current.index);
    setResolved(r => r + 1);
    setCurrentPos(p => Math.min(p + 1, allUncertain.length - 1));
  };

  const handleReject = () => {
    onReject(current.category, current.index);
    setResolved(r => r + 1);
    setCurrentPos(p => Math.min(p + 1, allUncertain.length - 1));
  };

  return (
    <div className="ui-root">
      {/* Header */}
      <div className="ui-header">
        <div className="ui-header-label">JARVIS IS UNSURE</div>
        <div className="ui-header-sub">
          Should this be logged to the knowledge base?
        </div>
      </div>

      {/* Progress */}
      <div className="ui-progress">
        <div className="ui-progress-text">
          {resolved + 1} of {allUncertain.length}
        </div>
        <div className="ui-progress-bar">
          <div
            className="ui-progress-fill"
            style={{ width: `${((resolved) / allUncertain.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="ui-card">
        <div className="ui-card-category">
          {CATEGORY_LABELS[current.category]}
        </div>
        <p className="ui-card-content">{current.item.content}</p>
      </div>

      {/* Actions */}
      <div className="ui-actions">
        <button className="ui-btn ui-btn-reject" onClick={handleReject}>
          <span className="ui-btn-icon">✕</span>
          Skip — Not valuable
        </button>
        <button className="ui-btn ui-btn-approve" onClick={handleApprove}>
          <span className="ui-btn-icon">✓</span>
          Log this
        </button>
      </div>

      {/* Skip all */}
      {allUncertain.length > 1 && (
        <button className="ui-skip-all" onClick={onProceed}>
          Skip remaining {remaining} uncertain items
        </button>
      )}

      <style>{STYLES}</style>
    </div>
  );
}

const STYLES = `
  .ui-root {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 32px;
    gap: 28px;
    overflow-y: auto;
  }

  .ui-header { text-align: center; }

  .ui-header-label {
    font-size: 10px;
    letter-spacing: 0.25em;
    color: #d4a843;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .ui-header-sub {
    font-size: 16px;
    color: #c8d8c5;
    font-weight: 300;
    letter-spacing: 0.03em;
  }

  .ui-progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ui-progress-text {
    font-size: 11px;
    color: #3d5239;
    letter-spacing: 0.1em;
    text-align: right;
  }

  .ui-progress-bar {
    height: 2px;
    background: rgba(93,129,86,0.15);
    border-radius: 1px;
    overflow: hidden;
  }

  .ui-progress-fill {
    height: 100%;
    background: #d4a843;
    border-radius: 1px;
    transition: width 0.4s ease;
  }

  .ui-card {
    background: rgba(212,168,67,0.06);
    border: 1px solid rgba(212,168,67,0.2);
    padding: 24px 28px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 120px;
  }

  .ui-card-category {
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #d4a843;
    font-weight: 700;
  }

  .ui-card-content {
    font-size: 14px;
    color: #c8d8c5;
    line-height: 1.75;
    letter-spacing: 0.02em;
    margin: 0;
    flex: 1;
  }

  .ui-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .ui-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    padding: 16px 20px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ui-btn-icon { font-size: 14px; }

  .ui-btn-reject {
    background: rgba(200,60,60,0.1);
    border: 1px solid rgba(200,60,60,0.25);
    color: #c07070;
  }
  .ui-btn-reject:hover {
    background: rgba(200,60,60,0.18);
    border-color: rgba(200,60,60,0.5);
    color: #e08080;
  }

  .ui-btn-approve {
    background: rgba(93,129,86,0.2);
    border: 1px solid rgba(93,129,86,0.4);
    color: #7ab572;
  }
  .ui-btn-approve:hover {
    background: rgba(93,129,86,0.3);
    border-color: #5d8156;
    color: #8cc887;
  }

  .ui-btn-primary {
    background: #5d8156;
    color: #0a0f0a;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    padding: 14px 32px;
    border: none;
    cursor: pointer;
    font-weight: 700;
    transition: background 0.2s;
    align-self: center;
  }
  .ui-btn-primary:hover { background: #6e9466; }

  .ui-skip-all {
    background: none;
    border: none;
    color: #3d5239;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    cursor: pointer;
    text-align: center;
    padding: 8px;
    transition: color 0.15s;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .ui-skip-all:hover { color: #5d8156; }

  .ui-done {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .ui-done-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid #5d8156;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #5d8156;
  }

  .ui-done-text {
    font-size: 13px;
    color: #3d5239;
    letter-spacing: 0.05em;
  }
`;
