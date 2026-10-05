// Checks the Dexie stores against the data model table in docs/04-TRD.md.
import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION, STORES } from '../src/data/schema.ts';
import { readRepoFile, stripTicks, tableRows } from './docs.ts';

const trd = readRepoFile('docs/04-TRD.md');
// Key cells can carry a note, as in "`date` (local YYYY-MM-DD)", so take the backticked name.
const docTables = tableRows(trd, 'Table').map(([table, key]) => [
  stripTicks(table ?? ''),
  key?.match(/`([^`]+)`/)?.[1] ?? '',
]);

describe('Dexie schema', () => {
  it('is version 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('has exactly the tables and primary keys in the data model', () => {
    expect(docTables).toHaveLength(10);
    const stores = Object.entries(STORES).map(([table, spec]) => [
      table,
      spec.split(',')[0]?.trim(),
    ]);
    expect(stores).toEqual(docTables);
  });

  it('indexes only the agreed fields', () => {
    expect(STORES.itemState).toBe('itemId, dueAt');
    expect(STORES.attempts).toBe('id, sessionId, itemId, ts');
  });
});
