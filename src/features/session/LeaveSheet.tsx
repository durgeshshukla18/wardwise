import { useEffect, useRef } from 'react';

import { copy } from '../../app/copy.ts';
import { Button } from '../../components/Button.tsx';

type Props = {
  onLeave: () => void;
  onStay: () => void;
};

/** "Leave this session? Your answers so far are saved." Escape keeps going. */
export function LeaveSheet({ onLeave, onStay }: Props) {
  const stay = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    stay.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onStay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-title"
      className="sheet-in fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-column flex-col gap-12 border-t border-line bg-surface p-16 shadow-sheet tablet:p-24 desktop:bottom-32 desktop:rounded-card desktop:border"
    >
      <h2 id="leave-title" className="font-serif text-22 font-semibold leading-heading">
        {copy.session.leaveTitle}
      </h2>
      <p className="text-16 text-ink-soft">{copy.session.leaveBody}</p>
      <div className="flex flex-col gap-8 tablet:flex-row">
        <Button ref={stay} onClick={onStay}>
          {copy.session.leaveCancel}
        </Button>
        <Button variant="secondary" onClick={onLeave}>
          {copy.session.leaveConfirm}
        </Button>
      </div>
    </div>
  );
}
