// The shipped items, read from disk. Playwright loads tests as native ESM, which needs an import
// attribute for JSON, so this reads the file instead.
import { readFileSync } from 'node:fs';

import type { Item } from '../../src/content/schema.ts';

export const items = JSON.parse(
  readFileSync(new URL('../../src/content/items.json', import.meta.url), 'utf8'),
) as Item[];
