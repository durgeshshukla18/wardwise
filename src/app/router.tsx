import { createBrowserRouter, Navigate } from 'react-router';

import { Landing } from '../features/landing/Landing.tsx';
import { Onboarding } from '../features/onboarding/Onboarding.tsx';
import { SessionRunner } from '../features/session/SessionRunner.tsx';
import { Settings } from '../features/settings/Settings.tsx';
import { Today } from '../features/today/Today.tsx';
import { AppShell } from './AppShell.tsx';
import { PlainLayout } from './PlainLayout.tsx';
import { Placeholder } from './Placeholder.tsx';
import { Root } from './Root.tsx';
import { screenRoutes } from './screens.ts';

// Screens that are not built yet render a placeholder.
const placeholder = (id: string) => {
  const screen = screenRoutes.find((entry) => entry.id === id);
  if (!screen) throw new Error(`No screen ${id} in the route table`);
  return { path: screen.path, element: <Placeholder screen={screen} /> };
};

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Landing /> },
      {
        element: <PlainLayout />,
        children: [{ path: '/start', element: <Onboarding /> }, placeholder('S09')],
      },
      { path: '/session/:id', element: <SessionRunner /> },
      {
        element: <AppShell />,
        children: [
          { path: '/today', element: <Today /> },
          placeholder('S04'),
          placeholder('S08'),
          placeholder('S10'),
          placeholder('S11'),
          { path: '/settings', element: <Settings /> },
          placeholder('S13'),
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
