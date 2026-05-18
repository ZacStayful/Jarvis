'use client';

import { useState } from 'react';
import type { SaveDestination } from '../../hooks/useLearningSystem';

interface SaveApprovalProps {
  onSave: (destination: SaveDestination) => Promise<void>;
}

export function SaveApproval({ onSave }: SaveApprovalProps) {
  const [destination, setDestination] = useState<SaveDestination>('both');
  const [confirming, setConfirming] = useState(false);

  const DESTINATIONS: { value: SaveDestination; label: string; description: string }[] = [
    {
      value: 'both',
      label: 'Drive + Obsidian',
      description: 'Write to Google Drive and stage for Obsidian sync',
    },
    {
      value: 'drive',
      label: 'Google Drive only',
      description: 'Save to JARVIS/End of Day Summaries/ in Drive',
    },
    {
      value: 'obsidian',
      label: 'Obsidian staging only',
      description: 'Stage in Drive/JARVIS/Obsidian Staging/ for vault sync',
    },
  ];

  if (confirming) {
    return (
      <div className="sa-confirm">
        <div className="sa-confirm-text">
          Write today&apos;s learnings to <strong>{DESTINATIONS.find(d => d.value === destination)?.label}</strong>?
        </div>
        <div className="sa-confirm-note">
          This action can be undone by deleting the file from Google Drive.
        </div>
        <div className="sa-confirm-actions">
          <button
            className="sa-btn sa-btn-cancel"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
          <button
            className="sa-btn sa-btn-confirm"
            onClick={() => onSave(destination)}
          >
            Confirm — Save Now
          </button>
        </div>

        <style>{STYLES}</style>
      </div>
    );
  }

  return (
    <div className="sa-root">
      <div className="sa-label">Select save destination</div>

      <div className="sa-destinations">
        {DESTINATIONS.map(d => (
          <button
            key={d.value}
            className={`sa-dest ${destination === d.value ? 'sa-dest-active' : ''}`}
            onClick={() => setDestination(d.value)}
          >
            <span className="sa-dest-radio">
              {destination === d.value ? '◉' : '○'}
            </span>
            <span className="sa-dest-info">
              <span className="sa-dest-label">{d.label}</span>
              <span className="sa-dest-desc">{d.description}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        className="sa-btn sa-btn-save"
        onClick={() => setConfirming(true)}
      >
        Save Learnings to Knowledge Base
      </button>

      <style>{STYLES}</style>
    </div>
  );
}

const STYLES = `
  .sa-root {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .sa-label {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #3d5239;
  }

  .sa-destinations {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sa-dest {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(93,129,86,0.04);
    border: 1px solid rgba(93,129,86,0.12);
    cursor: pointer;
    font-family: 'JetBrains Mono', monospace;
    text-align: left;
    transition: all 0.15s;
  }

  .sa-dest:hover {
    background: rgba(93,129,86,0.08);
    border-color: rgba(93,129,86,0.25);
  }

  .sa-dest-active {
    background: rgba(93,129,86,0.1);
    border-color: rgba(93,129,86,0.4);
  }

  .sa-dest-radio {
    font-size: 14px;
    color: #5d8156;
    flex-shrink: 0;
    width: 16px;
  }

  .sa-dest-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .sa-dest-label {
    font-size: 12px;
    color: #c8d8c5;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .sa-dest-desc {
    font-size: 11px;
    color: #3d5239;
    letter-spacing: 0.03em;
  }

  .sa-btn {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 700;
    padding: 14px 28px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .sa-btn-save {
    background: #5d8156;
    color: #0a0f0a;
    width: 100%;
  }
  .sa-btn-save:hover { background: #6e9466; }

  /* Confirmation */
  .sa-confirm {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    background: rgba(93,129,86,0.06);
    border: 1px solid rgba(93,129,86,0.25);
  }

  .sa-confirm-text {
    font-size: 13px;
    color: #c8d8c5;
    line-height: 1.6;
  }

  .sa-confirm-text strong { color: #5d8156; }

  .sa-confirm-note {
    font-size: 11px;
    color: #3d5239;
    letter-spacing: 0.04em;
  }

  .sa-confirm-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 10px;
  }

  .sa-btn-cancel {
    background: transparent;
    border: 1px solid rgba(93,129,86,0.3);
    color: #5d8156;
  }
  .sa-btn-cancel:hover {
    border-color: #5d8156;
    background: rgba(93,129,86,0.08);
  }

  .sa-btn-confirm {
    background: #5d8156;
    color: #0a0f0a;
  }
  .sa-btn-confirm:hover { background: #6e9466; }
`;
