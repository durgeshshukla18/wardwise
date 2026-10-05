import { createBrowserRouter, Navigate } from 'react-router';

import { Landing } from '../features/landing/Landing.tsx';
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
        children: [placeholder('S02'), placeholder('S05'), placeholder('S09')],
      },
      {
        element: <AppShell />,
        children: [
          { path: '/today', element: <Today /> },
          placeholder('S04'),
          placeholder('S08'),
          placeholder('S10'),
          placeholder('S11'),
          placeholder('S12'),
          placeholder('S13'),
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
