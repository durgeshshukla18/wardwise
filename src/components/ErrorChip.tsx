import type { ReactNode } from 'react';

/** A small bordered label, for an error type or a retry result. */
export function ErrorChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-chip border border-line px-8 py-4 text-12 text-ink-soft">
      {children}
    </span>
  );
}
