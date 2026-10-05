import { copy } from '../../app/copy.ts';
import { ArticleTag } from '../../components/ArticleTag.tsx';
import { AudioButton } from '../../components/AudioButton.tsx';
import { Button } from '../../components/Button.tsx';
import { isNoun } from '../../domain/eligibility.ts';
import type { Question } from './question.ts';
import { wordAudio } from './question.ts';
import { ExerciseHeading } from './ExerciseHeading.tsx';
import { ItemStrip } from './ItemStrip.tsx';

type Props = {
  question: Extract<Question, { kind: 'learn' }>;
  audio: boolean;
  onPlay: (text: string, slow: boolean) => void;
  onGotIt: () => void;
};

/** E1. The word with its article, plural, meaning and an example, then "Got it". */
export function LearnCard({ question, audio, onPlay, onGotIt }: Props) {
  const { item } = question;
  const noun = isNoun(item);
  return (
    <section data-exercise="E1" data-item-id={item.id} className="flex flex-col gap-16">
      <ExerciseHeading>{copy.session.exerciseNames.E1}</ExerciseHeading>
      <div className="flex flex-col gap-16 rounded-card border border-line bg-surface p-16">
        <ItemStrip item={item} />
        <div className="flex items-center justify-between gap-12">
          <p className={`font-serif font-semibold leading-heading ${noun ? 'text-36' : 'text-22'}`}>
            <ArticleTag article={noun ? item.article : undefined}>{item.de}</ArticleTag>
          </p>
          {audio && (
            <AudioButton
              label={copy.session.playWord}
              onPlay={(slow) => onPlay(wordAudio(item), slow)}
            />
          )}
        </div>
        {item.plural !== undefined && (
          <p className="font-serif text-18">
            <ArticleTag article={item.article}>{item.de}</ArticleTag>
            {copy.session.pluralJoin}
            <ArticleTag article="die">{item.plural}</ArticleTag>
          </p>
        )}
        <p className="text-18 text-ink-soft">{item.en}</p>
        <div className="flex flex-col gap-8 border-t border-line pt-16">
          <div className="flex items-center justify-between gap-12">
            <p className="font-serif text-18">{item.exampleDe}</p>
            {audio && (
              <AudioButton
                label={copy.session.playSentence}
                onPlay={(slow) => onPlay(item.exampleDe, slow)}
              />
            )}
          </div>
          <p className="text-14 text-ink-soft">{item.exampleEn}</p>
        </div>
      </div>
      {!audio && (
        <div className="rounded-card border border-line p-16">
          <p className="text-14 font-semibold">{copy.session.noVoice}</p>
          <p className="mt-4 text-14 text-ink-soft">{copy.session.noVoiceHowTo}</p>
        </div>
      )}
      <Button onClick={onGotIt}>{copy.session.gotIt}</Button>
    </section>
  );
}
