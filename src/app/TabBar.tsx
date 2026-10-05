import { NavLink } from 'react-router';

import { copy } from './copy.ts';
import { ICON_SIZE, ICON_STROKE, tabs } from './nav.ts';

/** Phone and tablet navigation: four tabs. Hidden from 1024 px up, where the rail takes over. */
export function TabBar() {
  return (
    <nav
      aria-label={copy.nav.label}
      className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-surface desktop:hidden"
    >
      <ul className="flex h-tabbar">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-4 border-t-2 text-12 font-medium ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-ink-soft'
                }`
              }
            >
              <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
