// Routes from section 5 (docs/01-PRD.md). Names and purposes are copied from the screens table.
// S06 (Feedback panel) and S07 (Session summary) have no route of their own; they render inside /session/:id.

export type ScreenRoute = {
  id: string;
  path: string;
  name: string;
  purpose: string;
};

export const screenRoutes: ScreenRoute[] = [
  { id: 'S01', path: '/', name: 'Landing', purpose: 'Get in with no friction' },
  { id: 'S02', path: '/start', name: 'Onboarding', purpose: 'Set a starting point' },
  { id: 'S03', path: '/today', name: 'Today', purpose: 'Hub and reason to return' },
  { id: 'S04', path: '/practice', name: 'Practice', purpose: 'Choose what to practise' },
  { id: 'S05', path: '/session/:id', name: 'Session runner', purpose: 'Do the exercises' },
  {
    id: 'S09',
    path: '/scenario/:id',
    name: 'Scenario runner',
    purpose: 'Practise real conversations',
  },
  { id: 'S08', path: '/mistakes', name: 'Mistake Bank', purpose: 'Fix patterns' },
  { id: 'S10', path: '/progress', name: 'Progress', purpose: 'Show real improvement' },
  { id: 'S11', path: '/word/:id', name: 'Word detail', purpose: 'Look up any item' },
  { id: 'S12', path: '/settings', name: 'Settings', purpose: 'Control the app' },
  { id: 'S13', path: '/feedback', name: 'Feedback form', purpose: 'Collect test feedback' },
];
