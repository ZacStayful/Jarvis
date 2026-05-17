// components/ApprovalCard.tsx
// ─── ApprovalCard ─────────────────────────────────────────────────────────────
//
// Renders the approval interface when JARVIS wants to take a write action.
// Shows action type badge, description, and full details before confirm/deny.
// Matches the JARVIS dark/green aesthetic.
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import type { ActionRequest, ActionType } from '@/types/jarvis';

// ─── Action type metadata ──────────────────────────────────────────────────────

const ACTION_META: Record<
  ActionType,
  { label: string; icon: string; colour: string }
> = {
  book_meeting: {
    label: 'BOOK MEETING',
    icon: '📅',
    colour: 'text-sky-400 border-sky-400/40 bg-sky-400/10',
  },
  update_monday: {
    label: 'UPDATE RECORD',
    icon: '✏️',
    colour: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
  },
  create_monday_item: {
    label: 'CREATE ITEM',
    icon: '➕',
    colour: 'text-green-400 border-green-400/40 bg-green-400/10',
  },
  send_email: {
    label: 'SEND EMAIL',
    icon: '✉️',
    colour: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
  },
  send_slack: {
    label: 'SEND MESSAGE',
    icon: '💬',
    colour: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
  },
  trigger_workflow: {
    label: 'TRIGGER WORKFLOW',
    icon: '⚙️',
    colour: 'text-orange-400 border-orange-400/40 bg-orange-400/10',
  },
  trigger_lucy: {
    label: 'TRIGGER LUCY',
    icon: '📞',
    colour: 'text-rose-400 border-rose-400/40 bg-rose-400/10',
  },
  write_obsidian: {
    label: 'WRITE TO OBSIDIAN',
    icon: '📓',
    colour: 'text-violet-400 border-violet-400/40 bg-violet-400/10',
  },
  write_drive: {
    label: 'WRITE TO DRIVE',
    icon: '📁',
    colour: 'text-teal-400 border-teal-400/40 bg-teal-400/10',
  },
};

// ─── Detail rendering ─────────────────────────────────────────────────────────

function renderDetails(details: Record<string, unknown>): React.ReactNode {
  return (
    <div className="space-y-1.5">
      {Object.entries(details).map(([key, value]) => {
        if (value === null || value === undefined) return null;

        // Format key: camelCase → Title Case with spaces
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, s => s.toUpperCase())
          .trim();

        if (typeof value === 'object' && !Array.isArray(value)) {
          return (
            <div key={key}>
              <span className="text-zinc-500 text-xs uppercase tracking-wider">
                {label}
              </span>
              <div className="mt-1 pl-3 border-l border-zinc-700 space-y-1">
                {Object.entries(value as Record<string, unknown>).map(
                  ([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-zinc-500 text-xs w-28 shrink-0 capitalize">
                        {k}
                      </span>
                      <span className="text-zinc-300 text-xs font-mono">
                        {String(v)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        }

        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <span className="text-zinc-500 text-xs uppercase tracking-wider">
                {label}
              </span>
              <div className="mt-1 space-y-1">
                {value.map((item, i) => (
                  <div
                    key={i}
                    className="pl-3 border-l border-zinc-700 text-xs text-zinc-300 font-mono"
                  >
                    {typeof item === 'object'
                      ? JSON.stringify(item)
                      : String(item)}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // Long text gets its own block (e.g. email body, note content)
        const strValue = String(value);
        const isLong = strValue.length > 120;

        return (
          <div key={key} className={isLong ? 'space-y-1' : 'flex gap-3'}>
            <span className="text-zinc-500 text-xs uppercase tracking-wider shrink-0">
              {label}
            </span>
            <span
              className={`text-zinc-300 text-xs font-mono ${
                isLong
                  ? 'block mt-1 p-2 bg-zinc-900 rounded border border-zinc-800 whitespace-pre-wrap max-h-40 overflow-y-auto'
                  : ''
              }`}
            >
              {strValue}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ApprovalCardProps {
  actionRequest: ActionRequest;
  status: 'pending' | 'approved' | 'denied';
  onApprove: () => void;
  onDeny: () => void;
}

export function ApprovalCard({
  actionRequest,
  status,
  onApprove,
  onDeny,
}: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[actionRequest.type] ?? {
    label: actionRequest.type.toUpperCase(),
    icon: '⚡',
    colour: 'text-zinc-400 border-zinc-700 bg-zinc-800',
  };

  const isPending = status === 'pending';
  const isApproved = status === 'approved';

  return (
    <div
      className={`
        rounded-lg border transition-all duration-300
        ${
          isPending
            ? 'border-[#5d8156]/50 bg-[#5d8156]/5'
            : isApproved
            ? 'border-[#5d8156]/30 bg-[#5d8156]/5 opacity-75'
            : 'border-zinc-800 bg-zinc-900/50 opacity-50'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Type badge */}
          <span
            className={`
              inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-semibold tracking-wider shrink-0
              ${meta.colour}
            `}
          >
            <span>{meta.icon}</span>
            {meta.label}
          </span>
        </div>

        {/* Status badge — shown when resolved */}
        {!isPending && (
          <span
            className={`
              text-xs font-mono px-2 py-0.5 rounded border shrink-0
              ${
                isApproved
                  ? 'text-[#5d8156] border-[#5d8156]/30 bg-[#5d8156]/10'
                  : 'text-red-400 border-red-400/30 bg-red-400/10'
              }
            `}
          >
            {isApproved ? 'CONFIRMED' : 'DENIED'}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="text-zinc-200 text-sm leading-relaxed">
          {actionRequest.description}
        </p>
      </div>

      {/* Details toggle */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5 font-mono"
        >
          <span
            className={`transition-transform duration-200 ${
              expanded ? 'rotate-90' : ''
            }`}
          >
            ▶
          </span>
          {expanded ? 'HIDE DETAILS' : 'VIEW DETAILS'}
        </button>

        {expanded && (
          <div className="mt-3 p-3 rounded bg-black/20 border border-zinc-800/50">
            {renderDetails(actionRequest.details as unknown as Record<string, unknown>)}
          </div>
        )}
      </div>

      {/* Action buttons — only shown when pending */}
      {isPending && (
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onApprove}
            className="
              flex-1 py-2 px-4 rounded text-sm font-mono font-semibold tracking-wider
              bg-[#5d8156] hover:bg-[#6a9463] text-white
              border border-[#5d8156]/50 hover:border-[#6a9463]
              transition-all duration-200 active:scale-95
            "
          >
            ✓ CONFIRM
          </button>
          <button
            onClick={onDeny}
            className="
              flex-1 py-2 px-4 rounded text-sm font-mono font-semibold tracking-wider
              bg-transparent hover:bg-red-500/10 text-red-400
              border border-red-500/30 hover:border-red-500/50
              transition-all duration-200 active:scale-95
            "
          >
            ✕ DENY
          </button>
        </div>
      )}
    </div>
  );
}
