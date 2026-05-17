'use client';

// ─────────────────────────────────────────────────────────────────────────────
// InvestmentDashboardView
// JARVIS investment advisory interface.
// Query input → streaming Claude Opus analysis → parsed section display.
// Styled for the dark Stayful green #5d8156 JARVIS aesthetic.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useIntelligence } from '@/hooks/useIntelligence';
import type { InvestmentAnalysis } from '@/hooks/useIntelligence';

// ─── Section parser ───────────────────────────────────────────────────────────
// Claude returns markdown with ## Section headers. Parse into display blocks.

interface AnalysisSection {
  title: string;
  content: string;
  color: string;
}

const SECTION_COLORS: Record<string, string> = {
  'Macro Context': '#6b9de8',
  'Sector Analysis': '#5d8156',
  Assessment: '#f0c040',
  'Risk Factors': '#e53e3e',
  'Action Steps': '#5d8156',
  'BRRR & Stayful Intersection': '#d4a017',
};

function parseSections(markdown: string): AnalysisSection[] {
  if (!markdown.trim()) return [];

  const sections: AnalysisSection[] = [];
  const lines = markdown.split('\n');
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentTitle && currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentLines.join('\n').trim(),
          color: SECTION_COLORS[currentTitle] ?? '#5d8156',
        });
      }
      currentTitle = line.replace('## ', '').trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle && currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentLines.join('\n').trim(),
      color: SECTION_COLORS[currentTitle] ?? '#5d8156',
    });
  }

  return sections;
}

// Strip markdown but preserve numbered lists and structure
function cleanContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')        // bold
    .replace(/\*(.*?)\*/g, '$1')             // italic
    .replace(/`([^`]+)`/g, '$1')            // inline code
    .trim();
}

// ─── Section Block ────────────────────────────────────────────────────────────

function SectionBlock({ section, index }: { section: AnalysisSection; index: number }) {
  const isActionSteps = section.title === 'Action Steps';

  // Parse numbered list items for action steps
  const actionItems = isActionSteps
    ? section.content
        .split('\n')
        .filter(l => /^\d+\./.test(l.trim()))
        .map(l => l.replace(/^\d+\.\s*/, '').trim())
    : [];

  return (
    <div
      style={{
        borderLeft: `2px solid ${section.color}44`,
        paddingLeft: 14,
        marginBottom: 18,
        animation: 'fadeInUp 0.3s ease forwards',
        animationDelay: `${index * 60}ms`,
        opacity: 0,
      }}
    >
      <p
        style={{
          margin: '0 0 6px',
          fontSize: '0.58rem',
          fontFamily: '"Share Tech Mono", monospace',
          color: `${section.color}99`,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {section.title}
      </p>

      {isActionSteps && actionItems.length > 0 ? (
        <ol
          style={{
            margin: 0,
            padding: '0 0 0 16px',
          }}
        >
          {actionItems.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: '0.82rem',
                fontFamily: '"Rajdhani", sans-serif',
                color: 'rgba(255,255,255,0.82)',
                lineHeight: 1.6,
                marginBottom: 4,
              }}
            >
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: '0.82rem',
            fontFamily: '"Rajdhani", sans-serif',
            color: 'rgba(255,255,255,0.78)',
            lineHeight: 1.65,
            whiteSpace: 'pre-line',
          }}
        >
          {cleanContent(section.content)}
        </p>
      )}
    </div>
  );
}

// ─── Streaming Text ───────────────────────────────────────────────────────────
// Shows raw streaming text until complete, then switches to section display

function StreamingDisplay({ text, isComplete }: { text: string; isComplete: boolean }) {
  if (!text) return null;

  const sections = isComplete ? parseSections(text) : null;

  if (sections && sections.length > 0) {
    return (
      <div>
        {sections.map((s, i) => (
          <SectionBlock key={s.title} section={s} index={i} />
        ))}
      </div>
    );
  }

  // Raw streaming — typewriter effect
  return (
    <p
      style={{
        margin: 0,
        fontSize: '0.8rem',
        fontFamily: '"Rajdhani", sans-serif',
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 1.7,
        whiteSpace: 'pre-line',
      }}
    >
      {text}
      {!isComplete && (
        <span
          style={{
            display: 'inline-block',
            width: '0.5em',
            height: '1.1em',
            background: '#5d8156',
            marginLeft: 2,
            verticalAlign: 'text-bottom',
            animation: 'blink 1s step-end infinite',
          }}
        />
      )}
    </p>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({
  analysis,
  onSelect,
}: {
  analysis: InvestmentAnalysis;
  onSelect: (a: InvestmentAnalysis) => void;
}) {
  return (
    <button
      onClick={() => onSelect(analysis)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '10px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLElement).style.background = 'transparent')
      }
    >
      <p
        style={{
          margin: '0 0 2px',
          fontSize: '0.78rem',
          fontFamily: '"Rajdhani", sans-serif',
          color: 'rgba(255,255,255,0.75)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {analysis.query}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.6rem',
          fontFamily: '"Share Tech Mono", monospace',
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.06em',
        }}
      >
        {analysis.timestamp.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </button>
  );
}

// ─── Suggested Queries ────────────────────────────────────────────────────────

const SUGGESTED_QUERIES = [
  'What should I know about the UK market right now?',
  'Analyse the tech sector — is now a good time to add?',
  'What impact do current interest rates have on my portfolio?',
  'Which sectors look strongest for the next 6 months?',
  "How should I think about diversification given Stayful's growth?",
];

// ─── Main View ────────────────────────────────────────────────────────────────

interface InvestmentDashboardViewProps {
  initialQuery?: string;
}

export default function InvestmentDashboardView({
  initialQuery,
}: InvestmentDashboardViewProps) {
  const { investment, queryInvestment, clearInvestment } = useIntelligence();

  const [query, setQuery] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState<InvestmentAnalysis | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didAutoQuery = useRef(false);

  // Auto-run initial query from command routing params
  useEffect(() => {
    if (initialQuery && !didAutoQuery.current) {
      didAutoQuery.current = true;
      queryInvestment(initialQuery);
    }
  }, [initialQuery, queryInvestment]);

  // Auto-focus input
  useEffect(() => {
    if (!investment.isLoading) {
      inputRef.current?.focus();
    }
  }, [investment.isLoading]);

  const handleSubmit = () => {
    if (!query.trim() || investment.isLoading) return;
    setSelectedAnalysis(null);
    queryInvestment(query.trim());
    setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentContent =
    selectedAnalysis?.content ??
    (investment.isLoading ? investment.currentAnalysis : investment.analyses[0]?.content ?? '');

  const isStreaming = !selectedAnalysis && investment.isLoading;
  const showContent = currentContent.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .invest-textarea:focus {
          outline: none;
          border-color: rgba(93,129,86,0.6) !important;
        }
        .invest-textarea::placeholder {
          color: rgba(255,255,255,0.2);
        }
        .suggest-btn:hover {
          background: rgba(93,129,86,0.15) !important;
          border-color: rgba(93,129,86,0.4) !important;
          color: rgba(255,255,255,0.7) !important;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          height: '100%',
          overflow: 'hidden',
          fontFamily: '"Rajdhani", sans-serif',
        }}
      >
        {/* ── Sidebar — History ───────────────────────────────────────────── */}
        {investment.analyses.length > 0 && (
          <div
            style={{
              width: 200,
              flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.58rem',
                    color: 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.12em',
                  }}
                >
                  HISTORY
                </span>
                <button
                  onClick={() => {
                    clearInvestment();
                    setSelectedAnalysis(null);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.2)',
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.55rem',
                    cursor: 'pointer',
                    letterSpacing: '0.08em',
                    padding: '2px 0',
                  }}
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {investment.analyses.map(a => (
                <HistoryItem
                  key={a.id}
                  analysis={a}
                  onSelect={setSelectedAnalysis}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Main Column ─────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              flexShrink: 0,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontFamily: '"Rajdhani", sans-serif',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.9)',
                textTransform: 'uppercase',
              }}
            >
              Investment Advisory
            </h2>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.62rem',
                fontFamily: '"Share Tech Mono", monospace',
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.08em',
              }}
            >
              CLAUDE OPUS · LIVE MARKET DATA · ADVISORY ONLY
            </p>
          </div>

          {/* Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(93,129,86,0.3) transparent',
            }}
          >
            {/* Active query indicator */}
            {investment.isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 20,
                  padding: '10px 14px',
                  background: 'rgba(93,129,86,0.06)',
                  border: '1px solid rgba(93,129,86,0.15)',
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#5d8156',
                    animation: 'pulse 1s ease-in-out infinite',
                    flexShrink: 0,
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.65rem',
                    color: 'rgba(93,129,86,0.8)',
                    letterSpacing: '0.08em',
                  }}
                >
                  ACCESSING MARKET DATA · ANALYSING
                </p>
              </div>
            )}

            {/* Viewing history item indicator */}
            {selectedAnalysis && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 14,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: '"Rajdhani", sans-serif',
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.5)',
                    fontStyle: 'italic',
                  }}
                >
                  {selectedAnalysis.query}
                </p>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.25)',
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.58rem',
                    cursor: 'pointer',
                    letterSpacing: '0.08em',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  ✕ CLOSE
                </button>
              </div>
            )}

            {/* Analysis content */}
            {showContent && (
              <StreamingDisplay
                text={currentContent}
                isComplete={!isStreaming}
              />
            )}

            {/* Empty state — show suggested queries */}
            {!showContent && !investment.isLoading && (
              <div>
                <p
                  style={{
                    margin: '0 0 16px',
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.62rem',
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.1em',
                  }}
                >
                  SUGGESTED QUERIES
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SUGGESTED_QUERIES.map(q => (
                    <button
                      key={q}
                      className="suggest-btn"
                      onClick={() => {
                        queryInvestment(q);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 3,
                        padding: '10px 14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.45)',
                        fontFamily: '"Rajdhani", sans-serif',
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                        transition: 'all 0.15s',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {investment.error && !investment.isLoading && (
              <div
                style={{
                  padding: 14,
                  border: '1px solid rgba(229,62,62,0.3)',
                  borderRadius: 4,
                  background: 'rgba(229,62,62,0.05)',
                  marginTop: 12,
                }}
              >
                <p
                  style={{
                    margin: '0 0 4px',
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.6rem',
                    color: '#e53e3e',
                    letterSpacing: '0.1em',
                  }}
                >
                  ADVISORY ERROR
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: '"Rajdhani", sans-serif',
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  {investment.error}
                </p>
              </div>
            )}

            <div style={{ height: 20 }} />
          </div>

          {/* ── Query Input ─────────────────────────────────────────────── */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(0,0,0,0.2)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                transition: 'border-color 0.2s',
              }}
            >
              <span
                style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.75rem',
                  color: '#5d8156',
                  marginBottom: 2,
                  flexShrink: 0,
                }}
              >
                ›
              </span>
              <textarea
                ref={inputRef}
                className="invest-textarea"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={investment.isLoading}
                placeholder="Ask JARVIS for investment analysis..."
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: '"Rajdhani", sans-serif',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  resize: 'none',
                  minHeight: 22,
                  maxHeight: 88,
                  opacity: investment.isLoading ? 0.4 : 1,
                }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 88)}px`;
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || investment.isLoading}
                style={{
                  background:
                    query.trim() && !investment.isLoading
                      ? 'rgba(93,129,86,0.25)'
                      : 'transparent',
                  border: `1px solid ${
                    query.trim() && !investment.isLoading
                      ? 'rgba(93,129,86,0.5)'
                      : 'rgba(255,255,255,0.1)'
                  }`,
                  borderRadius: 3,
                  color:
                    query.trim() && !investment.isLoading
                      ? '#5d8156'
                      : 'rgba(255,255,255,0.2)',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  padding: '5px 12px',
                  cursor:
                    query.trim() && !investment.isLoading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                  marginBottom: 1,
                }}
              >
                {investment.isLoading ? '...' : 'ANALYSE'}
              </button>
            </div>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '0.58rem',
                fontFamily: '"Share Tech Mono", monospace',
                color: 'rgba(255,255,255,0.15)',
                letterSpacing: '0.08em',
              }}
            >
              RETURN TO SUBMIT · ADVISORY ONLY — JARVIS NEVER EXECUTES TRADES
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
