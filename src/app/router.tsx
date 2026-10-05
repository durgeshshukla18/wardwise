import { createBrowserRouter, Navigate } from 'react-router';

import { Landing } from '../features/landing/Landing.tsx';
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
        children: screenRoutes
          .filter((entry) => entry.id !== 'S01')
          .map((entry) => placeholder(entry.id)),
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
