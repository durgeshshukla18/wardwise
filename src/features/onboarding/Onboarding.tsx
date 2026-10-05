import { useEffect, useMemo, useState } from 'react';

import { copy } from '../../app/copy.ts';
import { useApp } from '../../app/store.ts';
import { ArticleTag } from '../../components/ArticleTag.tsx';
import { Button } from '../../components/Button.tsx';
import { OptionTile } from '../../components/OptionTile.tsx';
import { TextInput } from '../../components/TextInput.tsx';
import { items } from '../../content/index.ts';
import { isNoun } from '../../domain/eligibility.ts';
import { placementLevel } from '../../domain/readiness.ts';
import { buildPlacement, PLACEMENT_TOTAL, scorePlacement } from './placement.ts';

type Stage = 'goal' | 'time' | 'level' | 'placement' | 'result';
const QUESTION_STAGES: Stage[] = ['goal', 'time', 'level'];

/** S02. Three questions, five placement words, then a short result. Nothing here is saved until the end. */
export function Onboarding() {
  const [stage, setStage] = useState<Stage>('goal');
  const [goal, setGoal] = useState('');
  const [dailyTime, setDailyTime] = useState('');
  const [selfLevel, setSelfLevel] = useState('');
  const [position, setPosition] = useState(0);
  const [chosen, setChosen] = useState<string[]>([]);
  const questions = useMemo(() => buildPlacement(items), []);

  const choices: readonly string[] | null =
    stage === 'goal'
      ? copy.onboarding.goalOptions
      : stage === 'time'
        ? copy.onboarding.timeOptions
        : stage === 'placement'
          ? (questions[position]?.options ?? null)
          : null;

  function choose(option: string) {
    if (stage === 'goal') {
      setGoal(option);
      setStage('time');
    } else if (stage === 'time') {
      setDailyTime(option);
      setStage('level');
    } else if (stage === 'placement') {
      const next = [...chosen, option];
      setChosen(next);
      if (position + 1 >= questions.length) setStage('result');
      else setPosition(position + 1);
    }
  }

  // Keys 1 to 4 choose, as in a session.
  useEffect(() => {
    if (choices === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLElement && event.target.tagName === 'INPUT') return;
      const option = /^[1-9]$/.test(event.key) ? choices[Number(event.key) - 1] : undefined;
      if (option !== undefined) choose(option);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function finish(level: 'A1' | 'A2') {
    void useApp.getState().completeOnboarding({
      level,
      onboarding: { goal, dailyTime, selfLevel: selfLevel.trim() },
    });
  }

  if (stage === 'result') {
    const correct = scorePlacement(questions, chosen);
    const offer = placementLevel(correct) === 'offer_A2';
    return (
      <section className="flex flex-col gap-24 pt-24">
        <h1 className="font-serif text-22 font-semibold leading-heading">
          {copy.onboarding.placementTitle}
        </h1>
        <p className="text-28 font-semibold leading-heading">
          {copy.onboarding.resultScore(correct, PLACEMENT_TOTAL)}
        </p>
        <p className="text-18 text-ink-soft">
          {offer ? copy.onboarding.resultOfferA2 : copy.onboarding.resultStartA1}
        </p>
        {offer ? (
          <div className="flex flex-col gap-12 tablet:flex-row">
            <Button onClick={() => finish('A2')}>{copy.onboarding.startA2}</Button>
            <Button variant="secondary" onClick={() => finish('A1')}>
              {copy.onboarding.stayA1}
            </Button>
          </div>
        ) : (
          <Button onClick={() => finish('A1')}>{copy.onboarding.next}</Button>
        )}
      </section>
    );
  }

  if (stage === 'level') {
    return (
      <section className="flex flex-col gap-24 pt-24">
        <p className="text-14 text-ink-soft">
          {copy.onboarding.stepOf(QUESTION_STAGES.indexOf(stage) + 1, QUESTION_STAGES.length)}
        </p>
        <h1 className="font-serif text-22 font-semibold leading-heading">
          {copy.onboarding.levelQuestion}
        </h1>
        <form
          className="flex flex-col gap-16"
          onSubmit={(event) => {
            event.preventDefault();
            setStage('placement');
          }}
        >
          <TextInput
            label={copy.onboarding.levelLabel}
            value={selfLevel}
            maxLength={120}
            autoComplete="off"
            onChange={(event) => setSelfLevel(event.target.value)}
          />
          <Button type="submit">{copy.onboarding.next}</Button>
        </form>
      </section>
    );
  }

  const placement = stage === 'placement' ? questions[position] : undefined;
  return (
    <section className="flex flex-col gap-24 pt-24">
      <p className="text-14 text-ink-soft">
        {stage === 'placement'
          ? copy.onboarding.placementStep(position + 1, questions.length)
          : copy.onboarding.stepOf(QUESTION_STAGES.indexOf(stage) + 1, QUESTION_STAGES.length)}
      </p>
      {placement ? (
        <>
          <h1 className="font-serif text-22 font-semibold leading-heading">
            {copy.onboarding.placementIntro}
          </h1>
          <p className="font-serif text-36 font-semibold leading-heading">
            <ArticleTag article={isNoun(placement.item) ? placement.item.article : undefined}>
              {placement.item.de}
            </ArticleTag>
          </p>
        </>
      ) : (
        <h1 className="font-serif text-22 font-semibold leading-heading">
          {stage === 'goal' ? copy.onboarding.goalQuestion : copy.onboarding.timeQuestion}
        </h1>
      )}
      <div className="flex flex-col gap-12">
        {(choices ?? []).map((option, index) => (
          <OptionTile
            key={`${stage}-${position}-${option}`}
            value={option}
            state="idle"
            keyHint={index + 1}
            locked={false}
            onChoose={() => choose(option)}
          >
            {option}
          </OptionTile>
        ))}
      </div>
    </section>
  );
}
