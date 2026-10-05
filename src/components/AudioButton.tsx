import { Volume2 } from 'lucide-react';
import { useRef } from 'react';

import { ICON_SIZE, ICON_STROKE } from '../app/nav.ts';

const LONG_PRESS_MS = 500;
const SECOND_TAP_MS = 2000;

type Props = {
  label: string;
  /** Plays the audio. `slow` is true for a long press or a second tap. */
  onPlay: (slow: boolean) => void;
};

/** A 44 px circle. One tap plays at the normal speed. A long press or a second tap plays slowly. */
export function AudioButton({ label, onPlay }: Props) {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const lastTap = useRef(0);

  const startPress = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      onPlay(true);
    }, LONG_PRESS_MS);
  };
  const endPress = () => {
    if (pressTimer.current !== null) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={endPress}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        const at = Date.now();
        onPlay(at - lastTap.current < SECOND_TAP_MS);
        lastTap.current = at;
      }}
      className="inline-flex h-touch w-touch shrink-0 items-center justify-center rounded-full border border-line bg-surface text-primary transition-colors duration-150 ease-out hover:bg-primary-tint"
    >
      <Volume2 size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
    </button>
  );
}
