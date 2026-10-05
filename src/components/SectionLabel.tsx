import type { ReactNode } from 'react';

/** The small uppercase label above a section of a ward sheet. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-12 font-semibold uppercase tracking-label text-ink-soft">{children}</h2>
  );
}
