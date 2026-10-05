import { copy } from '../../app/copy.ts';
import { ArticleTag, articleColour, type Article } from '../../components/ArticleTag.tsx';
import { AudioButton } from '../../components/AudioButton.tsx';
import { OptionTile, type OptionState } from '../../components/OptionTile.tsx';
import { isNoun } from '../../domain/eligibility.ts';
import { ExerciseHeading } from './ExerciseHeading.tsx';
import { ItemStrip } from './ItemStrip.tsx';
import type { Feedback } from './store.ts';
import { wordAudio, type Question } from './question.ts';

type Props = {
  question: Extract<Question, { kind: 'choice' }>;
  audio: boolean;
  feedback: Feedback | null;
  onPlay: (text: string, slow: boolean) => void;
  onChoose: (option: string) => void;
};

/** E2 to E5: a prompt and 3 or 4 options. Tapping an option answers at once. */
export function ChoiceExercise({ question, audio, feedback, onPlay, onChoose }: Props) {
  const { item, exercise, options, correctOption, gap } = question;
  const answered = feedback !== null;
  const noun = isNoun(item);

  const stateOf = (option: string): OptionState => {
    if (!answered) return 'idle';
    if (option === correctOption) return 'correct';
    return option === feedback.answer ? 'wrong' : 'dim';
  };
  const tagOf = (option: string) =>
    option === correctOption ? copy.session.correctTag : copy.session.yourAnswerTag;
  const play = (
    <AudioButton label={copy.session.playWord} onPlay={(slow) => onPlay(wordAudio(item), slow)} />
  );

  return (
    <section data-exercise={exercise} data-item-id={item.id} className="flex flex-col gap-16">
      <ExerciseHeading>{copy.session.exerciseNames[exercise]}</ExerciseHeading>
      <ItemStrip item={item} />
      <p className="text-16 text-ink-soft">{copy.session.prompts[exercise]}</p>

      {exercise === 'E2' && (
        <div className="flex items-center justify-between gap-12">
          <div>
            <p className="font-serif text-36 font-semibold leading-heading">{item.de}</p>
            <p className="text-18 text-ink-soft">{item.en}</p>
          </div>
          {audio && play}
        </div>
      )}
      {exercise === 'E3' && (
        <div className="flex items-center justify-between gap-12">
          <p className="font-serif text-36 font-semibold leading-heading">
            <ArticleTag article={noun ? item.article : undefined}>{item.de}</ArticleTag>
          </p>
          {audio && play}
        </div>
      )}
      {exercise === 'E4' && <div>{play}</div>}
      {exercise === 'E5' && gap !== null && (
        <div className="flex flex-col gap-8">
          <p className="font-serif text-22 leading-heading">
            {gap.before}
            <span className="border-b border-ink text-ink-soft">
              {answered ? gap.answer : copy.session.gapBlank}
            </span>
            {gap.after}
          </p>
          <p className="text-14 text-ink-soft">{item.exampleEn}</p>
        </div>
      )}

      <div className="flex flex-col gap-12">
        {options.map((option, index) => (
          <OptionTile
            key={option}
            value={option}
            state={stateOf(option)}
            keyHint={index + 1}
            tag={answered ? tagOf(option) : undefined}
            locked={answered}
            onChoose={() => onChoose(option)}
          >
            {exercise === 'E2' ? (
              <span className={`font-semibold ${articleColour[option as Article]}`}>{option}</span>
            ) : (
              option
            )}
          </OptionTile>
        ))}
      </div>
    </section>
  );
}
