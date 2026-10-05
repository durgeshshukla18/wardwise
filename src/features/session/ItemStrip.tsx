import { copy } from '../../app/copy.ts';
import { DraftLabel } from '../../components/DraftLabel.tsx';
import { items } from '../../content/index.ts';
import type { Item } from '../../domain/types.ts';

/** The record label line of a word card: topic code, level and item number. */
export function ItemStrip({ item }: { item: Item }) {
  const number = items.filter((entry) => entry.topic === item.topic).indexOf(item) + 1;
  return (
    <div className="flex items-center justify-between gap-12">
      <p className="text-12 font-semibold uppercase tracking-label text-ink-soft">
        {copy.session.itemStrip(item.topic, item.level, number)}
      </p>
      <DraftLabel item={item} />
    </div>
  );
}
