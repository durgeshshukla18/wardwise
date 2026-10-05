import { Outlet } from 'react-router';

import { Rail } from './Rail.tsx';
import { TabBar } from './TabBar.tsx';

/** The frame around Today, Practice, Mistakes, Progress and Settings. Not used in sessions. */
export function AppShell() {
  return (
    <div className="pb-tabbar-safe min-h-dvh bg-paper text-ink desktop:pb-0">
      <Rail />
      <div className="desktop:pl-rail">
        <main className="mx-auto w-full max-w-column p-16 tablet:p-24 desktop:max-w-main desktop:p-32">
          <Outlet />
        </main>
      </div>
      <TabBar />
    </div>
  );
}
