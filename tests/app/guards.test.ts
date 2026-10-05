import { describe, expect, it } from 'vitest';

import { guardRedirect } from '../../src/app/guards.ts';

const none = null;
const fresh = { onboardedAt: null };
const onboarded = { onboardedAt: 1_700_000_000_000 };

const appRoutes = [
  '/today',
  '/practice',
  '/mistakes',
  '/progress',
  '/session/abc',
  '/scenario/abc',
  '/word/abc',
  '/settings',
  '/feedback',
];

describe('route guards', () => {
  it('no profile: the landing screen is shown, everything else goes to /', () => {
    expect(guardRedirect('/', none)).toBeNull();
    expect(guardRedirect('/start', none)).toBe('/');
    for (const path of appRoutes) expect(guardRedirect(path, none), path).toBe('/');
  });

  it('a profile that is not onboarded goes to /start from everywhere else', () => {
    expect(guardRedirect('/start', fresh)).toBeNull();
    expect(guardRedirect('/', fresh)).toBe('/start');
    for (const path of appRoutes) expect(guardRedirect(path, fresh), path).toBe('/start');
  });

  it('an onboarded learner opens on /today, and can reach every app screen', () => {
    expect(guardRedirect('/', onboarded)).toBe('/today');
    expect(guardRedirect('/start', onboarded)).toBe('/today');
    for (const path of appRoutes) expect(guardRedirect(path, onboarded), path).toBeNull();
  });
});
