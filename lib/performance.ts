/**
 * JARVIS — Performance Utilities
 *
 * Three layers:
 * 1. Response Cache — caches deterministic JARVIS answers (news briefings, pipeline
 *    summaries) in memory for the session. Stale-while-revalidate pattern.
 *
 * 2. Request Deduplication — if two identical requests fire within 500ms
 *    (e.g. double-tap on voice), the second hitches to the first's promise.
 *
 * 3. Timing Telemetry — tracks TTFB (time to first byte) and total response
 *    time per message. Logged to console in dev, silenced in prod.
 *    Used to surface slow responses to Zac if needed.
 */

// ─── 1. Response Cache ────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  ttlMs: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, cachedAt: Date.now(), ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Returns stale value (if any) while also flagging that it needs revalidation.
   * Pattern: return the stale cached response immediately, then re-fetch in background.
   */
  getStale<T>(key: string): { value: T | null; isStale: boolean } {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return { value: null, isStale: false };
    const isStale = Date.now() - entry.cachedAt > entry.ttlMs;
    return { value: entry.value, isStale };
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const jarvisCache = new MemoryCache();

// Cache TTL constants
export const CACHE_TTL = {
  NEWS_BRIEFING: 15 * 60 * 1000,       // 15 minutes — news changes
  PIPELINE_SUMMARY: 5 * 60 * 1000,     // 5 minutes — pipeline moves fast
  INVESTMENT_DATA: 60 * 60 * 1000,     // 1 hour — market data
  WORKING_MEMORY: 30 * 60 * 1000,      // 30 minutes — KV data
  CROSS_SESSION: 10 * 60 * 1000,       // 10 minutes — context refresh
  STATIC_CONTENT: 24 * 60 * 60 * 1000, // 24 hours — system prompts, etc.
} as const;

// ─── 2. Request Deduplication ─────────────────────────────────────────────────

type InFlightEntry = {
  promise: Promise<unknown>;
  startedAt: number;
};

class RequestDeduplicator {
  private inFlight = new Map<string, InFlightEntry>();
  private readonly windowMs: number;

  constructor(windowMs = 500) {
    this.windowMs = windowMs;
  }

  /**
   * Execute `fn` once. If an identical `key` request is already in-flight
   * within the dedup window, return that same promise instead of firing again.
   */
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing && Date.now() - existing.startedAt < this.windowMs) {
      return existing.promise as Promise<T>;
    }

    const promise = fn().finally(() => {
      // Clean up after resolution
      const entry = this.inFlight.get(key);
      if (entry && entry.promise === promise) {
        this.inFlight.delete(key);
      }
    });

    this.inFlight.set(key, { promise, startedAt: Date.now() });
    return promise;
  }
}

export const requestDedup = new RequestDeduplicator(500);

// ─── 3. Timing Telemetry ──────────────────────────────────────────────────────

export interface ResponseTiming {
  messageId: string;
  requestStartMs: number;
  ttfbMs: number | null;    // time to first byte of streaming response
  totalMs: number | null;   // time from request start to last byte
  tokenCount: number;       // rough estimate from char count
  model: string;
}

class TimingTracker {
  private timings: ResponseTiming[] = [];
  private active = new Map<string, ResponseTiming>();
  private readonly isDev = process.env.NODE_ENV !== 'production';

  startTracking(messageId: string, model = 'unknown'): void {
    this.active.set(messageId, {
      messageId,
      requestStartMs: performance.now(),
      ttfbMs: null,
      totalMs: null,
      tokenCount: 0,
      model,
    });
  }

  markFirstByte(messageId: string): void {
    const entry = this.active.get(messageId);
    if (!entry) return;
    entry.ttfbMs = Math.round(performance.now() - entry.requestStartMs);

    if (this.isDev) {
      console.debug(
        `[JARVIS Perf] ${messageId} — TTFB: ${entry.ttfbMs}ms`
      );
    }
  }

  markComplete(messageId: string, fullText: string): void {
    const entry = this.active.get(messageId);
    if (!entry) return;

    entry.totalMs = Math.round(performance.now() - entry.requestStartMs);
    // Rough token estimate: ~4 chars per token
    entry.tokenCount = Math.round(fullText.length / 4);

    if (this.isDev) {
      console.debug(
        `[JARVIS Perf] ${messageId} — Total: ${entry.totalMs}ms | ~${entry.tokenCount} tokens | Model: ${entry.model}`
      );
    }

    // Flag slow responses
    if (entry.totalMs > 10_000) {
      console.warn(
        `[JARVIS Perf] Slow response detected: ${entry.totalMs}ms for ${messageId}`
      );
    }

    this.timings.push({ ...entry });
    this.active.delete(messageId);

    // Keep last 50 timings in memory
    if (this.timings.length > 50) {
      this.timings.shift();
    }
  }

  getAverages(): { avgTtfbMs: number; avgTotalMs: number; sampleSize: number } {
    const completed = this.timings.filter(
      t => t.ttfbMs !== null && t.totalMs !== null
    );
    if (!completed.length) {
      return { avgTtfbMs: 0, avgTotalMs: 0, sampleSize: 0 };
    }

    const avgTtfbMs = Math.round(
      completed.reduce((s, t) => s + (t.ttfbMs ?? 0), 0) / completed.length
    );
    const avgTotalMs = Math.round(
      completed.reduce((s, t) => s + (t.totalMs ?? 0), 0) / completed.length
    );

    return { avgTtfbMs, avgTotalMs, sampleSize: completed.length };
  }

  getRecent(n = 5): ResponseTiming[] {
    return this.timings.slice(-n);
  }
}

export const timingTracker = new TimingTracker();

// ─── 4. Prefetch utilities ────────────────────────────────────────────────────

/**
 * Warm the cache for likely-needed data when JARVIS loads.
 * Called once on app mount to reduce latency on first commands.
 */
export async function prefetchOnMount(): Promise<void> {
  // Skip silently when the client memory token isn't configured — otherwise
  // every page load logs a 401 in the Network tab.
  const token = process.env.NEXT_PUBLIC_JARVIS_INTERNAL_TOKEN;
  if (!token) return;

  try {
    // Fire these in parallel — they populate their caches independently
    await Promise.allSettled([
      // Prefetch cross-session context (needed for system prompt)
      fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jarvis-token': token,
        },
        body: JSON.stringify({ action: 'load_cross_session' }),
      }),
    ]);
  } catch {
    // Prefetch failures are non-fatal
  }
}

// ─── 5. Message batching for session save ─────────────────────────────────────

/**
 * Debounced session saver. Rather than writing to KV on every message,
 * we debounce saves so rapid back-and-forth doesn't hammer the KV store.
 */
export function createDebouncedSessionSaver(
  saveFn: () => Promise<void>,
  delayMs = 2000
): { save: () => void; flush: () => Promise<void> } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<void> | null = null;

  const save = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      pendingPromise = saveFn().catch(err =>
        console.warn('[JARVIS] Session save failed:', err)
      );
      timer = null;
    }, delayMs);
  };

  const flush = async () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      await saveFn();
    } else if (pendingPromise) {
      await pendingPromise;
    }
  };

  return { save, flush };
}
