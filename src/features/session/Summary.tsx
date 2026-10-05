import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { copy } from '../../app/copy.ts';
import { formatUntil } from '../../app/format.ts';
import { Button } from '../../components/Button.tsx';
import { dueWithin, nextReviewAt } from '../../domain/scheduler.ts';
import { now } from '../../services/clock.ts';
import { extraRoundAvailable, startSession } from './start.ts';
import { useSession } from './store.ts';
import { summarise } from './summary.ts';

/** S07. Items right, items to revisit, when the next review is, and two ways on. */
export function Summary() {
  const navigate = useNavigate();
  const results = useSession((state) => state.results);
  const states = useSession((state) => state.states);
  const [moment] = useState(now);
  const [extra, setExtra] = useState(false);

  useEffect(() => {
    let current = true;
    void extraRoundAvailable(states).then((available) => {
      if (current) setExtra(available);
    });
    return () => {
      current = false;
    };
  }, [states]);

  const { itemsRight, itemsToRevisit } = summarise(results);
  const all = [...states.values()];
  const stillDue = dueWithin(all, moment, 0);
  const next = nextReviewAt(all, moment);

  async function startExtraRound() {
    const id = await startSession({ extraRound: true, states });
    if (id !== null) navigate(`/session/${id}`);
  }

  return (
    <section className="flex flex-col gap-24">
      <h1 className="font-serif text-22 font-semibold leading-heading">{copy.summary.title}</h1>
      <div className="flex flex-col gap-8 border-t border-line pt-12">
        <p className="text-28 font-semibold leading-heading">
          {copy.summary.itemsRight(itemsRight)}
        </p>
        <p className="text-28 font-semibold leading-heading">
          {copy.summary.itemsToRevisit(itemsToRevisit)}
        </p>
      </div>
      <div className="flex flex-col gap-8 border-t border-line pt-12">
        {stillDue > 0 && (
          <p className="text-18 text-attention">{copy.summary.stillDue(stillDue)}</p>
        )}
        {stillDue === 0 && next !== null && (
          <p className="text-18">{copy.summary.nextReview(formatUntil(next - moment))}</p>
        )}
      </div>
      <div className="flex flex-col gap-12 tablet:flex-row">
        <Button onClick={() => navigate('/today')}>{copy.summary.backToToday}</Button>
        {extra && (
          <Button variant="secondary" onClick={() => void startExtraRound()}>
            {copy.summary.extraRound}
          </Button>
        )}
      </div>
    </section>
  );
}
