// Usage: node scripts/seed-demo.ts [--today YYYY-MM-DD] [--seed N] [--hour H] [--json]
// Builds the demo profile (F-01) for a given day and prints a summary, or the whole seed as JSON.
// Treats the given day as the local day, with midnight at 00:00 UTC, so the output is the same
// on every machine.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { copy } from '../src/app/copy.ts';
import type { Item } from '../src/content/schema.ts';
import { buildDemoSeed } from '../src/data/demo-seed.ts';
import { dueWithin } from '../src/domain/scheduler.ts';

const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
};

const today = option('today', new Date().toISOString().slice(0, 10));
const seed = Number(option('seed', '1'));
const hour = Number(option('hour', '12'));

const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
if (!match || !Number.isInteger(seed) || !Number.isFinite(hour)) {
  console.error(
    'Usage: node scripts/seed-demo.ts [--today YYYY-MM-DD] [--seed N] [--hour H] [--json]',
  );
  process.exit(1);
}

const startMs = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
const now = startMs + hour * 3_600_000;
const items = JSON.parse(
  readFileSync(fileURLToPath(new URL('../src/content/items.json', import.meta.url)), 'utf8'),
) as Item[];

const result = buildDemoSeed({
  items,
  now,
  day: { date: today, startMs },
  seed,
  onboarding: {
    goal: copy.onboarding.demoGoal,
    dailyTime: copy.onboarding.demoDailyTime,
    selfLevel: copy.onboarding.demoSelfLevel,
  },
});

if (args.includes('--json')) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const perBox = [1, 2, 3, 4, 5].map(
    (box) => `box ${box}: ${result.itemStates.filter((state) => state.box === box).length}`,
  );
  console.log(`Demo seed for ${today}, seed ${seed}`);
  console.log(`Profile: ${result.profile.name}, level ${result.profile.level}`);
  console.log(
    `Streak: ${result.streak.current} days, ${result.streak.freezes} freeze held, last counted ${result.streak.lastCountedDate}`,
  );
  console.log(`Items: ${result.itemStates.length} known of ${items.length} (${perBox.join(', ')})`);
  console.log(`Due within 24 hours: ${dueWithin(result.itemStates, now)}`);
  console.log(
    `Mistake Bank: ${result.itemStates
      .filter((state) => state.inMistakeBank)
      .map((state) => `${state.itemId} (${state.bankErrorType})`)
      .join(', ')}`,
  );
  console.log(`Days with exercises in the last 28: ${result.days.length}`);
}
