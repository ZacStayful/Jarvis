'use client';

// ─────────────────────────────────────────────────────────────────────────────
// NewsBriefingView
// JARVIS intelligence briefing — priority-coded cards, expandable analysis,
// cross-story pattern panel. Designed for Stayful green #5d8156 dark aesthetic.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useIntelligence } from '@/hooks/useIntelligence';
import type { NewsArticle, NewsPattern } from '@/hooks/useIntelligence';
import {
  NEWS_CATEGORIES,
  ALL_CATEGORY_IDS,
  getCategoryLabel,
  getCategoryColor,
  PRIORITY_CONFIG,
  sortByPriority,
} from '@/lib/newsCategories';

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.green;
  return (
    <span
      style={{
        fontSize: '0.6rem',
        fontFamily: '"Share Tech Mono", monospace',
        letterSpacing: '0.12em',
        padding: '2px 7px',
        border: `1px solid ${cfg.color}`,
        color: cfg.color,
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ categoryId }: { categoryId: string }) {
  const color = getCategoryColor(categoryId);
  const label = getCategoryLabel(categoryId);
  return (
    <span
      style={{
        fontSize: '0.58rem',
        fontFamily: '"Share Tech Mono", monospace',
        letterSpacing: '0.1em',
        padding: '1px 6px',
        border: `1px solid ${color}33`,
        color: `${color}bb`,
        borderRadius: 2,
        whiteSpace: 'nowrap',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: NewsArticle }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[article.priority] ?? PRIORITY_CONFIG.green;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(article.publishedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 23) return `${Math.floor(h / 24)}d ago`;
    if (h > 0) return `${h}h ago`;
    return `${m}m ago`;
  })();

  return (
    <div
      style={{
        borderLeft: `3px solid ${cfg.color}`,
        background: expanded ? cfg.bgTint : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.2s',
        cursor: 'pointer',
      }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Card Header */}
      <div style={{ padding: '14px 18px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <PriorityBadge priority={article.priority} />
          <CategoryBadge categoryId={article.category} />
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.6rem',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: '"Share Tech Mono", monospace',
            }}
          >
            {article.source} · {timeAgo}
          </span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: '0.92rem',
            fontFamily: '"Rajdhani", sans-serif',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.92)',
            lineHeight: 1.4,
            letterSpacing: '0.01em',
          }}
        >
          {article.headline}
        </p>

        {!expanded && (
          <p
            style={{
              margin: '6px 0 0',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.5,
              fontFamily: '"Rajdhani", sans-serif',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {article.summary}
          </p>
        )}
      </div>

      {/* Expanded Analysis */}
      {expanded && (
        <div
          style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          onClick={e => e.stopPropagation()}
        >
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.6,
              fontFamily: '"Rajdhani", sans-serif',
            }}
          >
            {article.summary}
          </p>

          {/* Impact Sections */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ImpactSection
              label="STAYFUL IMPACT"
              color="#5d8156"
              text={article.stayfulImpact}
            />
            <ImpactSection
              label="PORTFOLIO IMPACT"
              color="#6b9de8"
              text={article.portfolioImpact}
            />
            {article.patternSpotting && (
              <ImpactSection
                label="PATTERN SPOTTED"
                color="#d4a017"
                text={article.patternSpotting}
              />
            )}
          </div>

          {/* Action Steps */}
          {article.actionSteps.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: '0.6rem',
                  fontFamily: '"Share Tech Mono", monospace',
                  color: 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.12em',
                }}
              >
                ACTION STEPS
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 14px' }}>
                {article.actionSteps.map((step, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: '0.75rem',
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.55,
                      fontFamily: '"Rajdhani", sans-serif',
                      marginBottom: 2,
                    }}
                  >
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source link */}
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-block',
              marginTop: 10,
              fontSize: '0.62rem',
              fontFamily: '"Share Tech Mono", monospace',
              color: '#5d8156',
              textDecoration: 'none',
              letterSpacing: '0.08em',
              borderBottom: '1px solid #5d815640',
            }}
          >
            SOURCE →
          </a>
        </div>
      )}
    </div>
  );
}

function ImpactSection({
  label,
  color,
  text,
}: {
  label: string;
  color: string;
  text: string;
}) {
  return (
    <div>
      <p
        style={{
          margin: '0 0 3px',
          fontSize: '0.58rem',
          fontFamily: '"Share Tech Mono", monospace',
          color: `${color}99`,
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.77rem',
          color: 'rgba(255,255,255,0.72)',
          lineHeight: 1.55,
          fontFamily: '"Rajdhani", sans-serif',
          borderLeft: `2px solid ${color}44`,
          paddingLeft: 8,
        }}
      >
        {text}
      </p>
    </div>
  );
}

// ─── Pattern Card ─────────────────────────────────────────────────────────────

function PatternCard({ pattern }: { pattern: NewsPattern }) {
  const confidenceColor =
    pattern.confidence === 'high'
      ? '#f0c040'
      : pattern.confidence === 'medium'
      ? '#d4a017'
      : '#5d8156';

  const timeframeLabel = {
    immediate: 'NOW',
    weeks: 'WEEKS',
    months: 'MONTHS',
    quarters: 'QUARTERS',
  }[pattern.timeframe];

  return (
    <div
      style={{
        background: 'rgba(93,129,86,0.06)',
        border: '1px solid rgba(93,129,86,0.2)',
        borderRadius: 4,
        padding: '14px 16px',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
      >
        <span
          style={{
            fontSize: '0.58rem',
            fontFamily: '"Share Tech Mono", monospace',
            color: confidenceColor,
            letterSpacing: '0.12em',
            border: `1px solid ${confidenceColor}55`,
            padding: '1px 6px',
            borderRadius: 2,
          }}
        >
          {pattern.confidence.toUpperCase()} CONFIDENCE
        </span>
        <span
          style={{
            fontSize: '0.58rem',
            fontFamily: '"Share Tech Mono", monospace',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.1em',
          }}
        >
          /{timeframeLabel}
        </span>
      </div>

      <p
        style={{
          margin: '0 0 6px',
          fontSize: '0.87rem',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.9)',
          letterSpacing: '0.02em',
        }}
      >
        {pattern.title}
      </p>

      <p
        style={{
          margin: '0 0 10px',
          fontSize: '0.75rem',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.55,
          fontFamily: '"Rajdhani", sans-serif',
        }}
      >
        {pattern.signal}
      </p>

      <div>
        <p
          style={{
            margin: '0 0 3px',
            fontSize: '0.58rem',
            fontFamily: '"Share Tech Mono", monospace',
            color: 'rgba(93,129,86,0.8)',
            letterSpacing: '0.12em',
          }}
        >
          STAYFUL IMPLICATION
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '0.77rem',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.55,
            fontFamily: '"Rajdhani", sans-serif',
            borderLeft: '2px solid rgba(93,129,86,0.4)',
            paddingLeft: 8,
          }}
        >
          {pattern.stayfulImplication}
        </p>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ progress }: { progress: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        gap: 20,
      }}
    >
      {/* Animated scan line */}
      <div style={{ position: 'relative', width: 240, height: 2 }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #5d8156, transparent)',
            width: '60%',
            animation: 'scan 1.4s ease-in-out infinite',
          }}
        />
      </div>
      <p
        style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: '0.72rem',
          color: 'rgba(93,129,86,0.7)',
          letterSpacing: '0.12em',
          textAlign: 'center',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        {progress || 'ACCESSING INTELLIGENCE FEEDS...'}
      </p>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

interface NewsBriefingViewProps {
  autoFetch?: boolean;
}

export default function NewsBriefingView({ autoFetch = true }: NewsBriefingViewProps) {
  const { news, fetchNewsBriefing, refreshNews } = useIntelligence();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && !news.isLoading && news.articles.length === 0 && !news.error) {
      fetchNewsBriefing();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered + sorted articles
  const filteredArticles = sortByPriority(
    activeCategory === 'all'
      ? news.articles
      : news.articles.filter(a => a.category === activeCategory)
  );

  // Priority counts for header stats
  const counts = news.articles.reduce(
    (acc, a) => {
      acc[a.priority] = (acc[a.priority] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <>
      {/* Google Fonts — injected at runtime for self-contained component */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .news-article-card {
          animation: fadeInUp 0.3s ease forwards;
        }
        .news-article-card:hover {
          background: rgba(255,255,255,0.025) !important;
        }
        .cat-filter-btn:hover {
          border-color: rgba(93,129,86,0.5) !important;
          color: rgba(255,255,255,0.8) !important;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          fontFamily: '"Rajdhani", sans-serif',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '16px 20px 0',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <div>
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
                Intelligence Briefing
              </h2>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.65rem',
                  fontFamily: '"Share Tech Mono", monospace',
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                }}
              >
                {news.lastFetched
                  ? `LAST UPDATE: ${news.lastFetched.toLocaleTimeString('en-GB')}`
                  : 'AWAITING FEED'}
              </p>
            </div>

            {/* Priority counts */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {(['red', 'amber', 'gold', 'green'] as const).map(p => (
                <div
                  key={p}
                  style={{ textAlign: 'center', opacity: counts[p] ? 1 : 0.3 }}
                >
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontFamily: '"Rajdhani", sans-serif',
                      fontWeight: 700,
                      color: PRIORITY_CONFIG[p].color,
                      lineHeight: 1,
                    }}
                  >
                    {counts[p] ?? 0}
                  </div>
                  <div
                    style={{
                      fontSize: '0.52rem',
                      fontFamily: '"Share Tech Mono", monospace',
                      color: 'rgba(255,255,255,0.25)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {PRIORITY_CONFIG[p].label}
                  </div>
                </div>
              ))}

              {/* Refresh */}
              <button
                onClick={refreshNews}
                disabled={news.isLoading}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(93,129,86,0.4)',
                  borderRadius: 3,
                  color: news.isLoading ? 'rgba(255,255,255,0.2)' : '#5d8156',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  padding: '5px 10px',
                  cursor: news.isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {news.isLoading ? 'SCANNING...' : '↻ REFRESH'}
              </button>
            </div>
          </div>

          {/* Category filters */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 12,
              scrollbarWidth: 'none',
            }}
          >
            <CategoryFilterBtn
              label="ALL"
              active={activeCategory === 'all'}
              onClick={() => setActiveCategory('all')}
              count={news.articles.length}
            />
            {NEWS_CATEGORIES.map(cat => {
              const count = news.articles.filter(a => a.category === cat.id).length;
              if (count === 0 && news.articles.length > 0) return null;
              return (
                <CategoryFilterBtn
                  key={cat.id}
                  label={cat.shortLabel.toUpperCase()}
                  active={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  count={count}
                />
              );
            })}
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(93,129,86,0.3) transparent',
          }}
        >
          {/* Loading */}
          {news.isLoading && news.articles.length === 0 && (
            <LoadingSkeleton progress={news.progress} />
          )}

          {/* Error */}
          {news.error && !news.isLoading && (
            <div
              style={{
                margin: 20,
                padding: 16,
                border: '1px solid rgba(229,62,62,0.3)',
                borderRadius: 4,
                background: 'rgba(229,62,62,0.05)',
              }}
            >
              <p
                style={{
                  margin: '0 0 4px',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.62rem',
                  color: '#e53e3e',
                  letterSpacing: '0.1em',
                }}
              >
                INTELLIGENCE FEED ERROR
              </p>
              <p
                style={{
                  margin: 0,
                  fontFamily: '"Rajdhani", sans-serif',
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {news.error}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!news.isLoading && !news.error && news.articles.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 300,
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: '1.8rem',
                  opacity: 0.2,
                  fontFamily: '"Share Tech Mono", monospace',
                }}
              >
                ◎
              </div>
              <p
                style={{
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.12em',
                }}
              >
                NO INTELLIGENCE LOADED
              </p>
              <button
                onClick={() => fetchNewsBriefing()}
                style={{
                  background: 'rgba(93,129,86,0.15)',
                  border: '1px solid rgba(93,129,86,0.4)',
                  borderRadius: 3,
                  color: '#5d8156',
                  fontFamily: '"Share Tech Mono", monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.1em',
                  padding: '7px 16px',
                  cursor: 'pointer',
                }}
              >
                FETCH BRIEFING
              </button>
            </div>
          )}

          {/* Articles */}
          {filteredArticles.length > 0 && (
            <div>
              {/* Streaming progress indicator */}
              {news.isLoading && news.articles.length > 0 && (
                <div
                  style={{
                    padding: '8px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(93,129,86,0.04)',
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#5d8156',
                      animation: 'pulse 1s ease-in-out infinite',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: '"Share Tech Mono", monospace',
                      fontSize: '0.62rem',
                      color: 'rgba(93,129,86,0.7)',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {news.progress}
                  </span>
                </div>
              )}

              {filteredArticles.map((article, i) => (
                <div
                  key={article.id}
                  className="news-article-card"
                  style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                >
                  <ArticleCard article={article} />
                </div>
              ))}
            </div>
          )}

          {/* Pattern Detection Panel */}
          {news.patterns.length > 0 && (
            <div
              style={{
                margin: '0',
                padding: '20px',
                borderTop: '1px solid rgba(93,129,86,0.15)',
                background: 'rgba(93,129,86,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 1,
                    background: 'rgba(93,129,86,0.5)',
                  }}
                />
                <span
                  style={{
                    fontFamily: '"Share Tech Mono", monospace',
                    fontSize: '0.65rem',
                    color: 'rgba(93,129,86,0.7)',
                    letterSpacing: '0.15em',
                  }}
                >
                  PATTERN DETECTION
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: 'rgba(93,129,86,0.2)',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 10,
                }}
              >
                {news.patterns.map(pattern => (
                  <PatternCard key={pattern.id} pattern={pattern} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom padding */}
          <div style={{ height: 24 }} />
        </div>
      </div>
    </>
  );
}

// ─── Category Filter Button ───────────────────────────────────────────────────

function CategoryFilterBtn({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      className="cat-filter-btn"
      onClick={onClick}
      style={{
        background: active ? 'rgba(93,129,86,0.2)' : 'transparent',
        border: `1px solid ${active ? 'rgba(93,129,86,0.6)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 3,
        color: active ? '#5d8156' : 'rgba(255,255,255,0.35)',
        fontFamily: '"Share Tech Mono", monospace',
        fontSize: '0.58rem',
        letterSpacing: '0.1em',
        padding: '4px 9px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
      }}
    >
      {label}
      {count > 0 && (
        <span
          style={{
            background: active ? 'rgba(93,129,86,0.3)' : 'rgba(255,255,255,0.08)',
            borderRadius: 2,
            padding: '0 4px',
            fontSize: '0.55rem',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
