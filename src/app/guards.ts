// Where each route may be seen (docs/01-PRD.md section 5). Pure: takes the profile, returns a path.

export type GuardProfile = { onboardedAt: number | null } | null;

/**
 * The path to go to instead of `path`, or null to show it.
 * - No profile: only `/` (the landing screen) is shown. Everything else goes to `/`.
 * - A profile that is not onboarded: everything goes to `/start`.
 * - An onboarded learner: `/` and `/start` go to `/today`.
 */
export function guardRedirect(path: string, profile: GuardProfile): string | null {
  if (profile === null) return path === '/' ? null : '/';
  if (profile.onboardedAt === null) return path === '/start' ? null : '/start';
  return path === '/' || path === '/start' ? '/today' : null;
}
