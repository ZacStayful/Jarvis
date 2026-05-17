// components/MessageRenderer.tsx
// ─── MessageRenderer ──────────────────────────────────────────────────────────
//
// Renders a single message from the JARVIS message history.
// Handles:
//   - TextMessage: standard chat bubble
//   - ApprovalMessage: text + ApprovalCard below
//
// Designed for the JARVIS dark/green aesthetic.
// Assumes Tailwind CSS + the #5d8156 primary colour.
//
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import type { Message, TextMessage, ApprovalMessage } from '@/types/jarvis';
import { ApprovalCard } from './ApprovalCard';

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
// A lightweight renderer for JARVIS responses — handles bold, code, lists.
// Avoids a full markdown dependency for this narrow use case.

function renderContent(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading (## or #)
    if (line.startsWith('## ')) {
      elements.push(
        <h3
          key={i}
          className="text-zinc-200 font-semibold text-sm mt-3 mb-1 first:mt-0 tracking-wide"
        >
          {line.slice(3)}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2
          key={i}
          className="text-zinc-100 font-bold text-base mt-3 mb-1 first:mt-0 tracking-wide"
        >
          {line.slice(2)}
        </h2>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const listItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].startsWith('- ') || lines[i].startsWith('• '))
      ) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="space-y-1 my-2">
          {listItems.map((item, j) => (
            <li key={j} className="flex gap-2 text-sm text-zinc-300">
              <span className="text-[#5d8156] mt-0.5 shrink-0">▸</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const listItems: Array<{ num: string; text: string }> = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const match = lines[i].match(/^(\d+)\. (.*)/)!;
        listItems.push({ num: match[1], text: match[2] });
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-1 my-2">
          {listItems.map((item, j) => (
            <li key={j} className="flex gap-3 text-sm text-zinc-300">
              <span className="text-[#5d8156] font-mono shrink-0 w-5 text-right">
                {item.num}.
              </span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Code block (```...```)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-2 p-3 bg-zinc-900 rounded border border-zinc-800 overflow-x-auto text-xs font-mono text-zinc-300 leading-relaxed"
        >
          {lang && (
            <span className="text-[#5d8156] text-xs block mb-2 uppercase tracking-wider">
              {lang}
            </span>
          )}
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Horizontal rule
    if (line === '---' || line === '────' || line.startsWith('──')) {
      elements.push(
        <hr key={i} className="border-zinc-800 my-3" />
      );
      i++;
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-sm text-zinc-300 leading-relaxed">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
}

// Inline formatting: **bold**, `code`, _italic_
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-zinc-100 font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="px-1.5 py-0.5 rounded bg-zinc-800 text-[#5d8156] font-mono text-xs"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('_') && part.endsWith('_')) {
          return (
            <em key={i} className="text-zinc-400">
              {part.slice(1, -1)}
            </em>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

// ─── Streaming cursor ─────────────────────────────────────────────────────────

function StreamingCursor() {
  return (
    <span className="inline-block w-0.5 h-3.5 bg-[#5d8156] ml-0.5 animate-pulse" />
  );
}

// ─── User bubble ──────────────────────────────────────────────────────────────

function UserBubble({ message }: { message: TextMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-[#5d8156]/20 border border-[#5d8156]/30">
        <p className="text-sm text-zinc-200 leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

// ─── JARVIS bubble ────────────────────────────────────────────────────────────

function JARVISBubble({
  message,
}: {
  message: TextMessage;
}) {
  return (
    <div className="flex gap-3">
      {/* JARVIS indicator */}
      <div className="shrink-0 mt-1">
        <div className="w-6 h-6 rounded-full bg-[#5d8156]/20 border border-[#5d8156]/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5d8156]" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* Model label */}
        {message.model && !message.isStreaming && (
          <div className="text-xs text-zinc-600 font-mono mb-1.5 tracking-wider">
            JARVIS {message.model.includes('opus') ? '· DEEP' : ''}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          {renderContent(message.content)}
          {message.isStreaming && <StreamingCursor />}
        </div>
      </div>
    </div>
  );
}

// ─── Approval bubble ──────────────────────────────────────────────────────────

function ApprovalBubble({
  message,
  onApprove,
  onDeny,
}: {
  message: ApprovalMessage;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="flex gap-3">
      {/* JARVIS indicator */}
      <div className="shrink-0 mt-1">
        <div className="w-6 h-6 rounded-full bg-[#5d8156]/20 border border-[#5d8156]/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5d8156]" />
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Surrounding text (JARVIS's explanation) */}
        {message.content && (
          <div className="prose prose-invert prose-sm max-w-none">
            {renderContent(message.content)}
          </div>
        )}

        {/* Approval card */}
        <ApprovalCard
          actionRequest={message.actionRequest}
          status={message.status}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface MessageRendererProps {
  message: Message;
  onApprove: (messageId: string) => void;
  onDeny: (messageId: string) => void;
}

export function MessageRenderer({
  message,
  onApprove,
  onDeny,
}: MessageRendererProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Auto-scroll into view for new messages
  useEffect(() => {
    if (message.isStreaming) return; // Don't interrupt during streaming
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [message.isStreaming]);

  return (
    <div ref={ref} className="px-4 py-2">
      {message.role === 'user' ? (
        <UserBubble message={message as TextMessage} />
      ) : message.type === 'approval' ? (
        <ApprovalBubble
          message={message as ApprovalMessage}
          onApprove={() => onApprove(message.id)}
          onDeny={() => onDeny(message.id)}
        />
      ) : (
        <JARVISBubble message={message as TextMessage} />
      )}
    </div>
  );
}
