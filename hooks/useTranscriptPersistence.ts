/**
 * useTranscriptPersistence
 *
 * Drop this into your root page/layout alongside useJARVIS.
 * Pass it the `messages` array from useJARVIS — it will automatically
 * persist completed messages to localStorage on each update.
 *
 * Usage:
 *   const { messages, ...rest } = useJARVIS();
 *   useTranscriptPersistence(messages);
 */

import { useEffect, useRef } from 'react';
import type { Message } from '@/types/jarvis';
import { appendMessages, incrementSessionCount, pruneOldTranscripts } from '@/lib/transcript-store';

export function useTranscriptPersistence(messages: Message[]): void {
  const initialised = useRef(false);

  // On mount: increment session counter, prune old transcripts
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    incrementSessionCount();
    pruneOldTranscripts();
  }, []);

  // On every messages update: persist finalised messages
  useEffect(() => {
    if (messages.length === 0) return;
    appendMessages(messages);
  }, [messages]);
}
