'use client';

/**
 * LearningSystem
 *
 * The top-level orchestrator for Phase 6.
 * Rendered as a slide-in overlay panel on top of the JARVIS UI.
 *
 * Triggered by:
 *   - Voice command match: "end of day" / "process learnings" / "what did we learn today"
 *   - The `isOpen` prop being set to true by the parent
 *
 * Usage in your main page:
 *   const [learningOpen, setLearningOpen] = useState(false);
 *   // In your command router, match "end of day" → setLearningOpen(true)
 *   <LearningSystem isOpen={learningOpen} onClose={() => setLearningOpen(false)} />
 */

import { useEffect } from 'react';
import { useLearningSystem } from '../../hooks/useLearningSystem';
import { EndOfDayPanel } from './EndOfDayPanel';

interface LearningSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LearningSystem({ isOpen, onClose }: LearningSystemProps) {
  const system = useLearningSystem();

  // Auto-start extraction when opened
  useEffect(() => {
    if (isOpen && system.state === 'idle') {
      system.startEOD();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      system.reset();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="jarvis-learning-overlay" role="dialog" aria-modal="true">
      <EndOfDayPanel system={system} onClose={onClose} />

      <style>{`
        .jarvis-learning-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          display: flex;
          align-items: stretch;
          justify-content: flex-end;
        }

        /* Dim background */
        .jarvis-learning-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          animation: jarvis-fade-in 0.3s ease forwards;
        }

        @keyframes jarvis-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Voice command matcher ────────────────────────────────────────────────────
// Call this in your useJARVIS command router to detect EOD trigger phrases.

const EOD_PATTERNS = [
  /\bend of day\b/i,
  /\bprocess.{0,20}learnings?\b/i,
  /\bwhat did we learn today\b/i,
  /\blearning.{0,10}summary\b/i,
  /\blog.{0,10}today\b/i,
  /\bdaily.{0,10}summary\b/i,
  /\bjournaling\b/i,
];

export function isEODCommand(text: string): boolean {
  return EOD_PATTERNS.some(p => p.test(text));
}
