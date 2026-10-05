import { copy } from '../app/copy.ts';
import type { Item } from '../content/schema.ts';

/** A small "Draft" label on content nobody has reviewed. Development builds only. */
export function DraftLabel({ item }: { item: Pick<Item, 'reviewed'> }) {
  if (!import.meta.env.DEV || item.reviewed !== null) return null;
  return (
    <span className="rounded-chip border border-attention px-8 py-4 text-12 font-semibold text-attention">
      {copy.session.draft}
    </span>
  );
}
