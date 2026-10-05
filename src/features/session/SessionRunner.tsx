import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router';

import { copy } from '../../app/copy.ts';
import { Button } from '../../components/Button.tsx';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { items } from '../../content/index.ts';
import { mark } from '../../services/perf.ts';
import { SLOW_RATE, tts } from '../../services/tts.ts';
import { ChoiceExercise } from './ChoiceExercise.tsx';
import { FeedbackPanel } from './FeedbackPanel.tsx';
import { LearnCard } from './LearnCard.tsx';
import { LeaveSheet } from './LeaveSheet.tsx';
import { buildQuestion, slotSeed, wordAudio } from './question.ts';
import { Summary } from './Summary.tsx';
import { useSession } from './store.ts';
import { TypedExercise } from './TypedExercise.tsx';
import { useSessionKeys } from './useSessionKeys.ts';

/** S05. One exercise at a time, with no navigation. Leaving asks first. */
export function SessionRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const { status, sessionId, queue, index, phase, feedback, audio, audioSpeed, progress } = session;
  const [leaveRequested, setLeaveRequested] = useState(false);

  // The Back button asks the same question as the Leave button.
  const blocker = useBlocker(
    ({ nextLocation }) =>
      useSession.getState().status === 'running' && !nextLocation.pathname.startsWith('/session/'),
  );
  const leaveOpen = leaveRequested || blocker.state === 'blocked';

  const slot = queue[index];
  const question = useMemo(() => {
    if (status !== 'running' || slot === undefined || sessionId === null) return null;
    const item = items.find((entry) => entry.id === slot.itemId);
    return item ? buildQuestion(slot, item, items, slotSeed(sessionId, index, slot)) : null;
  }, [status, slot, sessionId, index]);

  useEffect(() => {
    if (sessionId !== null) mark('first-exercise');
  }, [sessionId]);

  const play = useCallback(
    (text: string, slow: boolean) => tts.speak(text, slow ? SLOW_RATE : audioSpeed),
    [audioSpeed],
  );
  const playCurrent = useCallback(
    (slow: boolean) => {
      if (audio && question !== null) play(wordAudio(question.item), slow);
    },
    [audio, question, play],
  );
  const choose = useCallback(
    (option: string) => void useSession.getState().submit({ kind: 'choice', chosen: option }),
    [],
  );
  const gotIt = useCallback(() => void useSession.getState().completeLearnCard(), []);
  const next = useCallback(() => void useSession.getState().next(), []);

  useSessionKeys({
    question,
    phase,
    paused: leaveOpen,
    onChoose: choose,
    onGotIt: gotIt,
    onNext: next,
    onPlay: playCurrent,
  });

  async function leave() {
    await useSession.getState().leave();
    if (blocker.state === 'blocked') blocker.proceed();
    else navigate('/today');
  }

  function stay() {
    setLeaveRequested(false);
    if (blocker.state === 'blocked') blocker.reset();
  }

  // A refresh loses the live session. Answers so far are already saved.
  if (sessionId !== id || status === 'idle' || status === 'left') {
    return <Navigate to="/today" replace />;
  }

  return (
    <main className="min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh max-w-column flex-col p-16 tablet:p-24 desktop:p-32">
        {status === 'summary' ? (
          <Summary />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Button variant="text" className="-ml-8" onClick={() => setLeaveRequested(true)}>
                {copy.session.exit}
              </Button>
              <p className="text-14 text-ink-soft">
                {copy.session.progress(index + 1, queue.length)}
              </p>
            </div>
            <ProgressBar fraction={progress} label={copy.session.progressLabel} />
            <div className="mt-24 flex flex-1 flex-col gap-24">
              {question?.kind === 'learn' && (
                <LearnCard question={question} audio={audio} onPlay={play} onGotIt={gotIt} />
              )}
              {question?.kind === 'choice' && (
                <ChoiceExercise
                  question={question}
                  audio={audio}
                  feedback={phase === 'feedback' ? feedback : null}
                  onPlay={play}
                  onChoose={choose}
                />
              )}
              {question?.kind === 'typed' && (
                <TypedExercise
                  key={`${index}-${slot?.itemId}`}
                  question={question}
                  feedback={phase === 'feedback' ? feedback : null}
                  onPlay={play}
                  onSubmit={(text) => void useSession.getState().submit({ kind: 'typed', text })}
                />
              )}
              {phase === 'feedback' && feedback !== null && question !== null && (
                <FeedbackPanel
                  feedback={feedback}
                  exercise={question.slot.exercise}
                  onNext={next}
                />
              )}
            </div>
          </>
        )}
      </div>
      {leaveOpen && <LeaveSheet onLeave={() => void leave()} onStay={stay} />}
    </main>
  );
}
