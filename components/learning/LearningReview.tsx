'use client';

import { useState } from 'react';
import type { ExtractedLearnings, LearningItem } from '../../lib/transcript-store';

interface LearningReviewProps {
  learnings: ExtractedLearnings;
  onUpdate: (
    category: keyof ExtractedLearnings,
    index: number,
    updates: Partial<LearningItem>
  ) => void;
  onRemove: (category: keyof ExtractedLearnings, index: number) => void;
}

const CATEGORIES: {
  key: keyof ExtractedLearnings;
  label: string;
  icon: string;
  accent: string;
}[] = [
  { key: 'stayfulInsights',   label: 'Stayful Insights',          icon: '◈', accent: '#5d8156' },
  { key: 'actionItems',       label: 'Action Items & Decisions',   icon: '▶', accent: '#5d8156' },
  { key: 'leadKnowledge',     label: 'Lead Knowledge Base',        icon: '◉', accent: '#7ab572' },
  { key: 'investmentUpdates', label: 'Investment Thesis Updates',  icon: '◆', accent: '#d4a843' },
  { key: 'newsImpact',        label: 'News Impact Summaries',      icon: '◎', accent: '#6b9ec4' },
  { key: 'patternsDetected',  label: 'Patterns Detected',          icon: '⬡', accent: '#a07bbf' },
];

export function LearningReview({ learnings, onUpdate, onRemove }: LearningReviewProps) {
  const confirmedCategories = CATEGORIES.filter(c =>
    (learnings[c.key] as LearningItem[]).filter(i => i.confidence === 'confident').length > 0
  );

  if (confirmedCategories.length === 0) {
    return (
      <div className="lr-empty">
        <p>No confident learnings were extracted from today&apos;s conversations.</p>
        <p className="lr-empty-sub">
          Either add items manually or save an empty entry for the record.
        </p>
      </div>
    );
  }

  return (
    <div className="lr-root">
      {confirmedCategories.map(cat => (
        <CategoryCard
          key={cat.key}
          category={cat}
          items={(learnings[cat.key] as LearningItem[]).filter(
            i => i.confidence === 'confident'
          )}
          allItems={learnings[cat.key] as LearningItem[]}
          onUpdate={(idx, updates) => onUpdate(cat.key, idx, updates)}
          onRemove={idx => onRemove(cat.key, idx)}
        />
      ))}

      <style>{`
        .lr-root {
          flex: 1;
          overflow-y: auto;
          padding: 8px 32px 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          scrollbar-width: thin;
          scrollbar-color: rgba(93,129,86,0.3) transparent;
        }

        .lr-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #3d5239;
          font-size: 13px;
          text-align: center;
          padding: 48px;
        }

        .lr-empty-sub { font-size: 11px; }
      `}</style>
    </div>
  );
}

interface CategoryCardProps {
  category: { key: keyof ExtractedLearnings; label: string; icon: string; accent: string };
  items: LearningItem[];
  allItems: LearningItem[];
  onUpdate: (index: number, updates: Partial<LearningItem>) => void;
  onRemove: (index: number) => void;
}

function CategoryCard({ category, items, allItems, onUpdate, onRemove }: CategoryCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Map from visible index back to allItems index
  const getActualIndex = (visibleItem: LearningItem) =>
    allItems.findIndex(i => i === visibleItem);

  return (
    <div className="cc-root">
      <button
        className="cc-header"
        onClick={() => setCollapsed(v => !v)}
        style={{ '--accent': category.accent } as React.CSSProperties}
      >
        <span className="cc-icon" style={{ color: category.accent }}>{category.icon}</span>
        <span className="cc-label">{category.label}</span>
        <span className="cc-count" style={{ color: category.accent }}>{items.length}</span>
        <span className="cc-chevron" style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
          ▾
        </span>
      </button>

      {!collapsed && (
        <div className="cc-items">
          {items.map((item, visIdx) => {
            const actualIdx = getActualIndex(item);
            return (
              <LearningItemRow
                key={actualIdx}
                item={item}
                accent={category.accent}
                onEdit={content => onUpdate(actualIdx, { content })}
                onRemove={() => onRemove(actualIdx)}
              />
            );
          })}
        </div>
      )}

      <style>{`
        .cc-root {
          border: 1px solid rgba(93,129,86,0.15);
          background: rgba(10,15,10,0.6);
          margin-bottom: 4px;
        }

        .cc-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-family: 'JetBrains Mono', monospace;
          transition: background 0.15s;
        }
        .cc-header:hover { background: rgba(93,129,86,0.06); }

        .cc-icon { font-size: 14px; width: 18px; text-align: center; }

        .cc-label {
          flex: 1;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #c8d8c5;
          font-weight: 600;
        }

        .cc-count {
          font-size: 12px;
          font-weight: 700;
          min-width: 20px;
          text-align: center;
        }

        .cc-chevron {
          color: #3d5239;
          font-size: 14px;
          transition: transform 0.2s;
        }

        .cc-items {
          border-top: 1px solid rgba(93,129,86,0.12);
          padding: 4px 0;
        }
      `}</style>
    </div>
  );
}

interface LearningItemRowProps {
  item: LearningItem;
  accent: string;
  onEdit: (content: string) => void;
  onRemove: () => void;
}

function LearningItemRow({ item, accent, onEdit, onRemove }: LearningItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);

  const commitEdit = () => {
    if (draft.trim()) onEdit(draft.trim());
    setEditing(false);
  };

  return (
    <div className="li-root">
      <span className="li-bullet" style={{ color: accent }}>─</span>

      {editing ? (
        <div className="li-edit-wrap">
          <textarea
            className="li-textarea"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { setDraft(item.content); setEditing(false); }
            }}
            autoFocus
            rows={3}
          />
          <div className="li-edit-actions">
            <button className="li-btn li-btn-save" onClick={commitEdit}>Save</button>
            <button className="li-btn li-btn-cancel" onClick={() => { setDraft(item.content); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <span className="li-content">{item.content}</span>
      )}

      {!editing && (
        <div className="li-actions">
          <button className="li-action-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
          <button className="li-action-btn li-action-remove" onClick={onRemove} title="Remove">✕</button>
        </div>
      )}

      <style>{`
        .li-root {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid rgba(93,129,86,0.06);
          transition: background 0.1s;
        }
        .li-root:last-child { border-bottom: none; }
        .li-root:hover { background: rgba(93,129,86,0.04); }
        .li-root:hover .li-actions { opacity: 1; }

        .li-bullet { font-size: 12px; margin-top: 2px; flex-shrink: 0; }

        .li-content {
          flex: 1;
          font-size: 12px;
          color: #a8c4a5;
          line-height: 1.65;
          letter-spacing: 0.02em;
        }

        .li-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }

        .li-action-btn {
          background: none;
          border: none;
          color: #3d5239;
          cursor: pointer;
          font-size: 12px;
          padding: 2px 4px;
          font-family: inherit;
          transition: color 0.15s;
        }
        .li-action-btn:hover { color: #5d8156; }
        .li-action-remove:hover { color: #e06060 !important; }

        .li-edit-wrap { flex: 1; display: flex; flex-direction: column; gap: 8px; }

        .li-textarea {
          width: 100%;
          background: rgba(93,129,86,0.08);
          border: 1px solid rgba(93,129,86,0.3);
          color: #c8d8c5;
          font-family: inherit;
          font-size: 12px;
          padding: 8px;
          resize: vertical;
          outline: none;
          line-height: 1.6;
        }
        .li-textarea:focus { border-color: #5d8156; }

        .li-edit-actions { display: flex; gap: 8px; }

        .li-btn {
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 5px 12px;
          border: none;
          cursor: pointer;
        }

        .li-btn-save { background: #5d8156; color: #0a0f0a; font-weight: 700; }
        .li-btn-save:hover { background: #6e9466; }
        .li-btn-cancel { background: transparent; border: 1px solid rgba(93,129,86,0.3); color: #5d8156; }
        .li-btn-cancel:hover { border-color: #5d8156; }
      `}</style>
    </div>
  );
}
