// ─────────────────────────────────────────────────────────────────────────────
// useIntelligence
// React hook that manages the intelligence layer: news briefing + investment advisory.
// Handles SSE streaming from /api/news and /api/investment.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from 'react';
import type { NewsArticle, NewsPattern } from '@/app/api/news/route';

export type { NewsArticle, NewsPattern };

// ─── News State ───────────────────────────────────────────────────────────────

export interface NewsState {
  articles: NewsArticle[];
  patterns: NewsPattern[];
  isLoading: boolean;
  error: string | null;
  progress: string;
  lastFetched: Date | null;
  total: number;
}

const initialNewsState: NewsState = {
  articles: [],
  patterns: [],
  isLoading: false,
  error: null,
  progress: '',
  lastFetched: null,
  total: 0,
};

// ─── Investment State ─────────────────────────────────────────────────────────

export interface InvestmentAnalysis {
  id: string;
  query: string;
  content: string;
  timestamp: Date;
}

export interface InvestmentState {
  analyses: InvestmentAnalysis[];
  currentAnalysis: string;
  currentQuery: string;
  isLoading: boolean;
  error: string | null;
}

const initialInvestmentState: InvestmentState = {
  analyses: [],
  currentAnalysis: '',
  currentQuery: '',
  isLoading: false,
  error: null,
};

// ─── Return Type ──────────────────────────────────────────────────────────────

export interface UseIntelligenceReturn {
  news: NewsState;
  investment: InvestmentState;
  fetchNewsBriefing: (categories?: string[]) => Promise<void>;
  refreshNews: () => Promise<void>;
  queryInvestment: (query: string, context?: string) => Promise<void>;
  clearInvestment: () => void;
  clearNews: () => void;
}

// ─── SSE Parser ───────────────────────────────────────────────────────────────

async function* parseSSE(
  res: Response
): AsyncGenerator<Record<string, unknown>> {
  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          yield JSON.parse(raw) as Record<string, unknown>;
        } catch {
          // Skip malformed SSE line
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIntelligence(): UseIntelligenceReturn {
  const [newsState, setNews] = useState<NewsState>(initialNewsState);
  const [investmentState, setInvestment] = useState<InvestmentState>(
    initialInvestmentState
  );

  const abortRef = useRef<AbortController | null>(null);
  const lastCategoriesRef = useRef<string[]>([]);

  // ─── News Briefing ──────────────────────────────────────────────────────────

  const fetchNewsBriefing = useCallback(async (categories?: string[]) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (categories) lastCategoriesRef.current = categories;

    setNews({
      articles: [],
      patterns: [],
      isLoading: true,
      error: null,
      progress: 'Initialising intelligence feeds...',
      lastFetched: null,
      total: 0,
    });

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      for await (const event of parseSSE(res)) {
        const type = event.type as string;

        if (type === 'start' || type === 'progress') {
          setNews(prev => ({
            ...prev,
            progress: (event.message as string) ?? prev.progress,
          }));
        }

        if (type === 'article') {
          setNews(prev => ({
            ...prev,
            articles: [...prev.articles, event.article as NewsArticle],
          }));
        }

        if (type === 'patterns') {
          setNews(prev => ({
            ...prev,
            patterns: event.patterns as NewsPattern[],
          }));
        }

        if (type === 'complete') {
          setNews(prev => ({
            ...prev,
            isLoading: false,
            progress: '',
            lastFetched: new Date(),
            total: (event.total as number) ?? prev.articles.length,
          }));
        }

        if (type === 'error') {
          setNews(prev => ({
            ...prev,
            isLoading: false,
            progress: '',
            error: (event.message as string) ?? 'Unknown intelligence error',
          }));
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      setNews(prev => ({
        ...prev,
        isLoading: false,
        progress: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, []);

  const refreshNews = useCallback(async () => {
    await fetchNewsBriefing(
      lastCategoriesRef.current.length > 0
        ? lastCategoriesRef.current
        : undefined
    );
  }, [fetchNewsBriefing]);

  const clearNews = useCallback(() => {
    abortRef.current?.abort();
    setNews(initialNewsState);
  }, []);

  // ─── Investment Advisory ────────────────────────────────────────────────────

  const queryInvestment = useCallback(
    async (query: string, context?: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setInvestment(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        currentAnalysis: '',
        currentQuery: query,
      }));

      try {
        const res = await fetch('/api/investment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, context }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

        let fullText = '';

        for await (const event of parseSSE(res)) {
          const type = event.type as string;

          if (type === 'text') {
            fullText += event.text as string;
            setInvestment(prev => ({ ...prev, currentAnalysis: fullText }));
          }

          if (type === 'complete') {
            const analysis: InvestmentAnalysis = {
              id: `inv_${Date.now()}`,
              query,
              content: fullText,
              timestamp: new Date(),
            };

            setInvestment(prev => ({
              ...prev,
              isLoading: false,
              currentAnalysis: '',
              currentQuery: '',
              analyses: [analysis, ...prev.analyses],
            }));
          }

          if (type === 'error') {
            setInvestment(prev => ({
              ...prev,
              isLoading: false,
              currentAnalysis: '',
              currentQuery: '',
              error: (event.message as string) ?? 'Advisory error',
            }));
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setInvestment(prev => ({
          ...prev,
          isLoading: false,
          currentAnalysis: '',
          currentQuery: '',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    []
  );

  const clearInvestment = useCallback(() => {
    abortRef.current?.abort();
    setInvestment(initialInvestmentState);
  }, []);

  return {
    news: newsState,
    investment: investmentState,
    fetchNewsBriefing,
    refreshNews,
    queryInvestment,
    clearInvestment,
    clearNews,
  };
}
