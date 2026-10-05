import { Settings } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { copy } from '../../app/copy.ts';
import { formatUntil, sessionMinutes } from '../../app/format.ts';
import { ICON_SIZE, ICON_STROKE } from '../../app/nav.ts';
import { useApp } from '../../app/store.ts';
import { Button } from '../../components/Button.tsx';
import { ReadinessBar } from '../../components/ReadinessBar.tsx';
import { SectionLabel } from '../../components/SectionLabel.tsx';
import { items, topicName } from '../../content/index.ts';
import { startSession } from '../session/start.ts';
import { weakestTopics } from '../../domain/readiness.ts';
import { DAY_MS, dueWithin, nextReviewAt } from '../../domain/scheduler.ts';
import { now } from '../../services/clock.ts';
import { mark } from '../../services/perf.ts';

const WEAKEST_TOPICS = 3;

/** S03. The hub: what is due, the streak, the Shift Break button, and the weakest topics. */
export function Today() {
  const navigate = useNavigate();
  const profile = useApp((state) => state.profile);
  const itemStates = useApp((state) => state.itemStates);
  const streak = useApp((state) => state.streak);
  const [moment] = useState(now);
  const [nothingToAsk, setNothingToAsk] = useState(false);
  const starting = useRef(false);

  if (profile === null) return null;

  async function start() {
    if (starting.current) return;
    starting.current = true;
    mark('shift-break-tap');
    try {
      const id = await startSession();
      if (id === null) setNothingToAsk(true);
      else navigate(`/session/${id}`);
    } finally {
      starting.current = false;
    }
  }

  const states = [...itemStates.values()];
  const dueNow = dueWithin(states, moment, 0);
  const dueSoon = dueWithin(states, moment, DAY_MS);
  const next = nextReviewAt(states, moment);
  const readiness = weakestTopics(items, itemStates, WEAKEST_TOPICS);
  const streakDays = streak?.current ?? 0;
  const freezes = streak?.freezes ?? 0;

  let dueLine: string;
  if (dueNow > 0) dueLine = copy.today.dueWithin24Hours(dueSoon);
  else if (next !== null) dueLine = copy.today.nothingDueNow(formatUntil(next - moment));
  else dueLine = copy.today.nothingDueYet;

  return (
    <div className="grid grid-cols-1 gap-24 desktop:grid-cols-2 desktop:gap-x-32">
      <header className="flex items-start justify-between desktop:col-span-2">
        <div>
          <h1 className="font-serif text-22 font-semibold leading-heading">{copy.today.title}</h1>
          <p className="mt-4 text-16 text-ink-soft">{copy.today.greeting(profile.name)}</p>
        </div>
        <Link
          to="/settings"
          aria-label={copy.nav.settings}
          className="inline-flex h-touch w-touch items-center justify-center rounded-control text-ink-soft hover:text-ink desktop:hidden"
        >
          <Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
        </Link>
      </header>

      <section className="flex flex-col gap-8 border-t border-line pt-12 desktop:col-start-2 desktop:row-start-3">
        <SectionLabel>{copy.today.streakLabel}</SectionLabel>
        <p className="text-28 font-semibold leading-heading">{copy.today.streak(streakDays)}</p>
        <p className="text-14 text-ink-soft">{copy.today.freezes(freezes)}</p>
      </section>

      <section className="rounded-card border border-line bg-surface p-16 desktop:col-start-1 desktop:row-start-2">
        <h2 className="font-serif text-22 font-semibold leading-heading">
          {copy.today.shiftBreak}
        </h2>
        <p className="mb-16 mt-4 text-16 text-ink-soft">
          {copy.today.shiftBreakMeta(profile.sessionLength, sessionMinutes(profile.sessionLength))}
        </p>
        <Button onClick={() => void start()}>{copy.today.startSession}</Button>
        {nothingToAsk && (
          <p className="mt-12 text-14 text-ink-soft">{copy.today.nothingToPractice}</p>
        )}
      </section>

      <section className="flex flex-col gap-8 border-t border-line pt-12 desktop:col-start-2 desktop:row-start-2">
        <SectionLabel>{copy.today.dueLabel}</SectionLabel>
        <p className={`text-18 ${dueNow > 0 ? 'font-semibold text-attention' : 'text-ink'}`}>
          {dueLine}
        </p>
      </section>

      <section className="flex flex-col gap-16 border-t border-line pt-12 desktop:col-start-1 desktop:row-start-3">
        <SectionLabel>{copy.today.readinessLabel}</SectionLabel>
        <ul className="flex flex-col gap-16">
          {readiness.map(({ topic, percent }) => (
            <li key={topic} className="flex flex-col gap-8">
              <div className="flex items-baseline justify-between gap-16">
                <span className="text-16">{topicName(topic)}</span>
                <span className="text-14 text-ink-soft">
                  {copy.today.readinessPercent(percent)}
                </span>
              </div>
              <ReadinessBar percent={percent} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
