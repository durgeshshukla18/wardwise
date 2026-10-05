import { createBrowserRouter, Navigate } from 'react-router';

import { Placeholder } from './Placeholder.tsx';
import { screenRoutes } from './screens.ts';

export const router = createBrowserRouter([
  ...screenRoutes.map((screen) => ({
    path: screen.path,
    element: <Placeholder screen={screen} />,
  })),
  { path: '*', element: <Navigate to="/" replace /> },
]);
