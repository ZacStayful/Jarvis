'use client';

import type { StoredTranscript } from '../../lib/transcript-store';

interface TranscriptViewProps {
  transcript: StoredTranscript;
}

export function TranscriptView({ transcript }: TranscriptViewProps) {
  if (transcript.messages.length === 0) {
    return <div className="tv-empty">No messages recorded for this session.</div>;
  }

  return (
    <div className="tv-root">
      <div className="tv-inner">
        {transcript.messages.map(msg => {
          const time = new Date(msg.timestamp).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const isUser = msg.role === 'user';

          return (
            <div key={msg.id} className={`tv-msg ${isUser ? 'tv-msg-user' : 'tv-msg-jarvis'}`}>
              <div className="tv-msg-meta">
                <span className="tv-speaker">{isUser ? 'ZAC' : 'JARVIS'}</span>
                <span className="tv-time">{time}</span>
                {msg.model && <span className="tv-model">{msg.model}</span>}
              </div>
              <p className="tv-content">{msg.content}</p>
            </div>
          );
        })}
      </div>

      <style>{`
        .tv-root {
          max-height: 320px;
          overflow-y: auto;
          border: 1px solid rgba(93,129,86,0.15);
          background: rgba(0,0,0,0.3);
          margin: 0 32px;
          scrollbar-width: thin;
          scrollbar-color: rgba(93,129,86,0.3) transparent;
        }

        .tv-inner {
          display: flex;
          flex-direction: column;
          padding: 16px;
          gap: 12px;
        }

        .tv-msg {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tv-msg-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tv-speaker {
          font-size: 9px;
          letter-spacing: 0.2em;
          font-weight: 700;
        }

        .tv-msg-user .tv-speaker { color: #d4a843; }
        .tv-msg-jarvis .tv-speaker { color: #5d8156; }

        .tv-time {
          font-size: 10px;
          color: #2a3828;
          letter-spacing: 0.05em;
        }

        .tv-model {
          font-size: 9px;
          color: #2a3828;
          letter-spacing: 0.05em;
          margin-left: auto;
          font-style: italic;
        }

        .tv-content {
          font-size: 12px;
          color: #6a8867;
          line-height: 1.65;
          margin: 0;
          padding-left: 4px;
          border-left: 2px solid;
        }

        .tv-msg-user .tv-content { border-color: rgba(212,168,67,0.3); }
        .tv-msg-jarvis .tv-content { border-color: rgba(93,129,86,0.3); }

        .tv-empty {
          padding: 24px 32px;
          font-size: 12px;
          color: #3d5239;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
