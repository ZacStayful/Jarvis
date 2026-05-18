/**
 * useLearningSystem
 *
 * Manages the end-of-day learning extraction and save flow.
 *
 * States:
 *   idle          → nothing happening
 *   loading       → calling /api/learning/extract
 *   reviewing     → Zac reviewing extracted learnings
 *   uncertain     → Zac resolving uncertain items
 *   saving        → calling /api/learning/save
 *   complete      → save confirmed
 *   error         → something went wrong
 */

import { useState, useCallback } from 'react';
import {
  getTodayTranscript,
  loadTranscript,
  formatTranscriptForExtraction,
  formatLearningsAsMarkdown,
  markEODProcessed,
  EMPTY_LEARNINGS,
  type ExtractedLearnings,
  type LearningItem,
  type StoredTranscript,
} from '../lib/transcript-store';

export type LearningSystemState =
  | 'idle'
  | 'loading'
  | 'reviewing'
  | 'uncertain'
  | 'saving'
  | 'complete'
  | 'error';

export type SaveDestination = 'drive' | 'obsidian' | 'both';

interface UseLearningSystemReturn {
  state: LearningSystemState;
  learnings: ExtractedLearnings;
  transcript: StoredTranscript | null;
  error: string | null;
  saveLog: string[];

  // Actions
  startEOD: (date?: string) => Promise<void>;
  updateItem: (
    category: keyof ExtractedLearnings,
    index: number,
    updates: Partial<LearningItem>
  ) => void;
  removeItem: (category: keyof ExtractedLearnings, index: number) => void;
  approveUncertain: (category: keyof ExtractedLearnings, index: number) => void;
  rejectUncertain: (category: keyof ExtractedLearnings, index: number) => void;
  proceedToSave: () => void;
  save: (destination: SaveDestination) => Promise<void>;
  reset: () => void;
}

export function useLearningSystem(): UseLearningSystemReturn {
  const [state, setState] = useState<LearningSystemState>('idle');
  const [learnings, setLearnings] = useState<ExtractedLearnings>(EMPTY_LEARNINGS);
  const [transcript, setTranscript] = useState<StoredTranscript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveLog, setSaveLog] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState<string>('');

  // ─── Start EOD processing ─────────────────────────────────────────────────

  const startEOD = useCallback(async (date?: string) => {
    setState('loading');
    setError(null);
    setSaveLog([]);

    const targetDate = date ?? new Date().toISOString().split('T')[0];
    setActiveDate(targetDate);

    const storedTranscript =
      targetDate === new Date().toISOString().split('T')[0]
        ? getTodayTranscript()
        : loadTranscript(targetDate);

    if (!storedTranscript || storedTranscript.messages.length === 0) {
      setError('No conversation recorded for this date. Nothing to process.');
      setState('error');
      return;
    }

    setTranscript(storedTranscript);

    const formatted = formatTranscriptForExtraction(storedTranscript);

    try {
      const res = await fetch('/api/learning/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: formatted, date: targetDate }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const { learnings: extracted } = (await res.json()) as {
        learnings: ExtractedLearnings;
      };

      setLearnings(extracted);

      // Check if any uncertain items exist
      const hasUncertain = Object.values(extracted).some(items =>
        (items as LearningItem[]).some(i => i.confidence === 'uncertain')
      );

      setState(hasUncertain ? 'uncertain' : 'reviewing');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error during extraction';
      setError(msg);
      setState('error');
    }
  }, []);

  // ─── Item management ──────────────────────────────────────────────────────

  const updateItem = useCallback(
    (category: keyof ExtractedLearnings, index: number, updates: Partial<LearningItem>) => {
      setLearnings(prev => ({
        ...prev,
        [category]: (prev[category] as LearningItem[]).map((item, i) =>
          i === index ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const removeItem = useCallback(
    (category: keyof ExtractedLearnings, index: number) => {
      setLearnings(prev => ({
        ...prev,
        [category]: (prev[category] as LearningItem[]).filter((_, i) => i !== index),
      }));
    },
    []
  );

  const approveUncertain = useCallback(
    (category: keyof ExtractedLearnings, index: number) => {
      updateItem(category, index, { confidence: 'confident', approved: true });
    },
    [updateItem]
  );

  const rejectUncertain = useCallback(
    (category: keyof ExtractedLearnings, index: number) => {
      removeItem(category, index);
    },
    [removeItem]
  );

  // Check if all uncertain items have been resolved
  const proceedToSave = useCallback(() => {
    setState('reviewing');
  }, []);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const save = useCallback(
    async (destination: SaveDestination) => {
      setState('saving');
      setSaveLog([]);

      const markdown = formatLearningsAsMarkdown(learnings, activeDate);
      const log: string[] = [];

      try {
        const res = await fetch('/api/learning/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: activeDate,
            markdown,
            destination,
            learnings,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }

        const result = await res.json();

        if (result.drive) log.push(`✓ Saved to Google Drive: ${result.drive.path}`);
        if (result.obsidian) log.push(`✓ Staged for Obsidian: ${result.obsidian.path}`);
        if (result.errors?.length) {
          result.errors.forEach((e: string) => log.push(`⚠ ${e}`));
        }

        setSaveLog(log);
        markEODProcessed(activeDate);
        setState('complete');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Save failed';
        setError(msg);
        log.push(`✗ ${msg}`);
        setSaveLog(log);
        setState('error');
      }
    },
    [learnings, activeDate]
  );

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setState('idle');
    setLearnings(EMPTY_LEARNINGS);
    setTranscript(null);
    setError(null);
    setSaveLog([]);
    setActiveDate('');
  }, []);

  return {
    state,
    learnings,
    transcript,
    error,
    saveLog,
    startEOD,
    updateItem,
    removeItem,
    approveUncertain,
    rejectUncertain,
    proceedToSave,
    save,
    reset,
  };
}
