import { Check, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { copy } from '../../app/copy.ts';
import { ICON_SIZE, ICON_STROKE } from '../../app/nav.ts';
import { Button } from '../../components/Button.tsx';
import { ErrorChip } from '../../components/ErrorChip.tsx';
import type { ExerciseId } from '../../domain/types.ts';
import type { Feedback } from './store.ts';

type Props = {
  feedback: Feedback;
  exercise: ExerciseId;
  onNext: () => void;
};

/**
 * S06. A bottom sheet on a phone and an inline panel on a desktop. It says whether the answer was
 * right, shows the correct answer, one sentence on why, the error type, and a Next button.
 */
export function FeedbackPanel({ feedback, exercise, onNext }: Props) {
  const next = useRef<HTMLButtonElement>(null);
  const { correct, check, retryOutcome } = feedback;

  // Focus moves to Next, so Enter continues.
  useEffect(() => {
    next.current?.focus();
  }, []);

  const meaningExercise = exercise === 'E3' || exercise === 'E4';
  const expected = meaningExercise
    ? copy.session.expectedMeans(check.expected)
    : copy.session.expectedIs(check.expected);
  // For a meaning question the explanation already gives the answer, so it is not said twice.
  const explanationHasAnswer =
    meaningExercise && check.feedback !== null && check.feedback.includes(check.expected);

  return (
    <div
      role="status"
      aria-live="polite"
      className="sheet-in sticky bottom-0 -mx-16 mt-auto flex flex-col gap-12 border-t border-line bg-surface p-16 shadow-sheet tablet:-mx-24 tablet:p-24 desktop:static desktop:mx-0 desktop:mt-24 desktop:rounded-card desktop:border desktop:p-16 desktop:shadow-none"
    >
      <p
        className={`flex items-center gap-8 text-18 font-semibold ${correct ? 'text-correct' : 'text-wrong'}`}
      >
        {correct ? (
          <Check size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
        ) : (
          <X size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
        )}
        {correct ? copy.session.statusCorrect : copy.session.statusWrong}
      </p>
      {!correct && (
        <>
          {!explanationHasAnswer && <p className="text-18">{expected}</p>}
          {check.feedback !== null && <p className="text-16 text-ink-soft">{check.feedback}</p>}
        </>
      )}
      {(!correct || retryOutcome !== null) && (
        <div className="flex flex-wrap gap-8">
          {!correct && check.errorType !== null && (
            <ErrorChip>{copy.session.errorTypes[check.errorType]}</ErrorChip>
          )}
          {retryOutcome !== null && (
            <ErrorChip>{copy.session.retryOutcome[retryOutcome]}</ErrorChip>
          )}
        </div>
      )}
      <Button ref={next} onClick={onNext}>
        {copy.session.next}
      </Button>
    </div>
  );
}
