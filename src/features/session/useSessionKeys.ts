import { useEffect } from 'react';

import type { Question } from './question.ts';

type Handlers = {
  question: Question | null;
  phase: 'question' | 'feedback';
  /** The leave sheet is open, so the keys are left alone. */
  paused: boolean;
  onChoose: (option: string) => void;
  onGotIt: () => void;
  onNext: () => void;
  onPlay: (slow: boolean) => void;
};

const interactive = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName));

/**
 * Desktop keys in a session: 1 to 4 choose an option, Enter continues, Space plays the audio and
 * Shift+Space plays it slowly. Keys are left alone while typing in a field and on a focused
 * button, which handles its own Enter and Space.
 */
export function useSessionKeys({
  question,
  phase,
  paused,
  onChoose,
  onGotIt,
  onNext,
  onPlay,
}: Handlers) {
  useEffect(() => {
    if (paused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || interactive(event.target)) return;
      if (question === null) return;

      if (event.key === ' ') {
        event.preventDefault();
        onPlay(event.shiftKey);
        return;
      }
      if (event.key === 'Enter') {
        if (phase === 'feedback') {
          event.preventDefault();
          onNext();
        } else if (question.kind === 'learn') {
          event.preventDefault();
          onGotIt();
        }
        return;
      }
      if (phase === 'question' && question.kind === 'choice' && /^[1-9]$/.test(event.key)) {
        const option = question.options[Number(event.key) - 1];
        if (option !== undefined) {
          event.preventDefault();
          onChoose(option);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, phase, paused, onChoose, onGotIt, onNext, onPlay]);
}
