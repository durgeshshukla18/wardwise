import { useEffect, useRef, useState, type FormEvent } from 'react';

import { copy } from '../../app/copy.ts';
import { AudioButton } from '../../components/AudioButton.tsx';
import { Button } from '../../components/Button.tsx';
import { TextInput } from '../../components/TextInput.tsx';
import { ExerciseHeading } from './ExerciseHeading.tsx';
import { ItemStrip } from './ItemStrip.tsx';
import type { Feedback } from './store.ts';
import { wordAudio, type Question } from './question.ts';

type Props = {
  question: Extract<Question, { kind: 'typed' }>;
  feedback: Feedback | null;
  onPlay: (text: string, slow: boolean) => void;
  onSubmit: (text: string) => void;
};

/** E6 and E9: type the German, or the digits you hear. Skip counts as a wrong answer. */
export function TypedExercise({ question, feedback, onPlay, onSubmit }: Props) {
  const { item, exercise } = question;
  const [text, setText] = useState('');
  const field = useRef<HTMLInputElement>(null);
  const answered = feedback !== null;

  useEffect(() => {
    field.current?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!answered) onSubmit(text);
  }

  return (
    <section data-exercise={exercise} data-item-id={item.id} className="flex flex-col gap-16">
      <ExerciseHeading>{copy.session.exerciseNames[exercise]}</ExerciseHeading>
      <ItemStrip item={item} />
      <p className="text-16 text-ink-soft">{copy.session.prompts[exercise]}</p>
      {exercise === 'E6' ? (
        <p className="font-serif text-22 font-semibold leading-heading">{item.en}</p>
      ) : (
        <div>
          <AudioButton
            label={copy.session.playWord}
            onPlay={(slow) => onPlay(wordAudio(item), slow)}
          />
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-16" noValidate>
        <TextInput
          ref={field}
          label={copy.session.typeLabel}
          value={answered ? feedback.answer : text}
          readOnly={answered}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
          className={answered ? (feedback.correct ? 'border-correct' : 'border-wrong') : ''}
        />
        {!answered && (
          <div className="flex flex-col gap-8 tablet:flex-row tablet:items-center">
            <Button type="submit">{copy.session.submit}</Button>
            <Button variant="text" onClick={() => onSubmit('')}>
              {copy.session.skip}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
}
