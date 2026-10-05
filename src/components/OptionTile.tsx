import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { ICON_SIZE, ICON_STROKE } from '../app/nav.ts';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

const borders: Record<OptionState, string> = {
  idle: 'border-line hover:bg-primary-tint',
  correct: 'border-correct',
  wrong: 'border-wrong',
  dim: 'border-line text-ink-soft',
};

type Props = {
  children: ReactNode;
  /** The option's plain text, kept on the button for tests. */
  value: string;
  state: OptionState;
  /** The key that chooses this option, shown on a desktop. */
  keyHint: number;
  /** The words next to the icon once answered, such as the correct option's tag. */
  tag?: string;
  onChoose: () => void;
  locked: boolean;
};

/** A full width, 56 px answer option. It locks after the answer. */
export function OptionTile({ children, value, state, keyHint, tag, onChoose, locked }: Props) {
  return (
    <button
      type="button"
      disabled={locked}
      data-option={value}
      onClick={onChoose}
      className={`flex h-option w-full items-center gap-12 rounded-control border bg-surface px-16 text-left text-18 transition-colors duration-150 ease-out ${borders[state]}`}
    >
      <span
        aria-hidden="true"
        className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-chip border border-line text-12 text-ink-soft desktop:inline-flex"
      >
        {keyHint}
      </span>
      <span className="flex-1">{children}</span>
      {state === 'correct' && (
        <span className="flex items-center gap-8 text-14 font-semibold text-correct">
          <Check size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {tag}
        </span>
      )}
      {state === 'wrong' && (
        <span className="flex items-center gap-8 text-14 font-semibold text-wrong">
          <X size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {tag}
        </span>
      )}
    </button>
  );
}
