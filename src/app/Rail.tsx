import { NavLink } from 'react-router';

import { copy } from './copy.ts';
import { ICON_SIZE, ICON_STROKE, settingsTab, tabs } from './nav.ts';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-touch items-center gap-12 rounded-control px-12 text-16 font-medium ${
    isActive ? 'bg-primary-tint text-primary' : 'text-ink-soft hover:text-ink'
  }`;

/** Desktop navigation, 1024 px and up: the same four destinations, Settings at the bottom. */
export function Rail() {
  const SettingsIcon = settingsTab.icon;
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-rail flex-col border-r border-line bg-surface p-16 desktop:flex">
      <p className="px-12 pb-24 pt-8 font-serif text-22 font-semibold leading-heading">
        {copy.appName}
      </p>
      <nav aria-label={copy.nav.label} className="flex flex-1 flex-col">
        <ul className="flex flex-col gap-4">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={linkClass}>
                <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <NavLink to={settingsTab.to} className={(state) => `${linkClass(state)} mt-auto`}>
          <SettingsIcon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {settingsTab.label}
        </NavLink>
      </nav>
    </aside>
  );
}
