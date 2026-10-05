import { Outlet } from 'react-router';

/** A bare frame with no navigation, for onboarding and for sessions. */
export function PlainLayout() {
  return (
    <main className="min-h-dvh bg-paper p-16 text-ink tablet:p-24 desktop:p-32">
      <div className="mx-auto max-w-column">
        <Outlet />
      </div>
    </main>
  );
}
