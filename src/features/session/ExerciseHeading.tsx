import type { ReactNode } from 'react';

/** The exercise name, as a small uppercase label. It is the heading of the exercise. */
export function ExerciseHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-12 font-semibold uppercase tracking-label text-ink-soft">{children}</h1>
  );
}
