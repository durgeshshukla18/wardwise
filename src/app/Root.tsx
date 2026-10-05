import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { copy } from './copy.ts';
import { guardRedirect } from './guards.ts';
import { useApp } from './store.ts';

/** Loads saved progress once, then sends each visitor to the right screen. */
export function Root() {
  const { pathname } = useLocation();
  const status = useApp((state) => state.status);
  const profile = useApp((state) => state.profile);

  useEffect(() => {
    void useApp.getState().load();
  }, []);

  if (status === 'loading') return <div className="min-h-dvh bg-paper" />;
  if (status === 'error') {
    return (
      <main className="min-h-dvh bg-paper p-16 text-16 text-ink">{copy.errors.loadFailed}</main>
    );
  }

  const redirect = guardRedirect(pathname, profile);
  return redirect === null ? <Outlet /> : <Navigate to={redirect} replace />;
}
