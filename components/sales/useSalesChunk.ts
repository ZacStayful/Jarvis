"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChunkId, DateRange, SalesMetrics } from "./types";

type ChunkResponse<K extends ChunkId> = Partial<SalesMetrics> & {
  activityLogsAvailable?: boolean;
  total?: number;
  dateRange?: SalesMetrics["dateRange"];
  error?: string;
} & (K extends "pipeline"
    ? { pipeline?: SalesMetrics["pipeline"] }
    : K extends "outreach"
      ? { outreach?: SalesMetrics["outreach"] }
      : K extends "meetings"
        ? { pipeline?: SalesMetrics["pipeline"] }
        : { offers?: SalesMetrics["offers"] });

export interface UseSalesChunkResult<T> {
  data: T | null;
  meta: { total?: number; activityLogsAvailable?: boolean } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSalesChunk<K extends ChunkId>(
  chunk: K,
  range: DateRange,
): UseSalesChunkResult<
  K extends "pipeline"
    ? SalesMetrics["pipeline"]
    : K extends "outreach"
      ? SalesMetrics["outreach"]
      : K extends "meetings"
        ? SalesMetrics["pipeline"]
        : SalesMetrics["offers"]
> {
  const [data, setData] = useState<any>(null);
  const [meta, setMeta] = useState<{ total?: number; activityLogsAvailable?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchChunk = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("chunk", chunk);
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      const res = await fetch(`/api/sales?${params}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ChunkResponse<K> = await res.json();
      if (json.error) throw new Error(json.error);
      const slice =
        chunk === "outreach"
          ? json.outreach
          : chunk === "offers"
            ? json.offers
            : json.pipeline;
      setData(slice ?? null);
      setMeta({ total: json.total, activityLogsAvailable: json.activityLogsAvailable });
    } catch (err) {
      if ((err as any)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load");
      setData(null);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [chunk, range.from, range.to]);

  useEffect(() => {
    fetchChunk();
    return () => abortRef.current?.abort();
  }, [fetchChunk]);

  return { data, meta, loading, error, refetch: fetchChunk };
}
