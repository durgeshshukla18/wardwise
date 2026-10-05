import { ChartNoAxesColumn, CircleAlert, BookOpen, House, Settings } from 'lucide-react';

import { copy } from './copy.ts';

export const tabs = [
  { to: '/today', label: copy.nav.today, icon: House },
  { to: '/practice', label: copy.nav.practice, icon: BookOpen },
  { to: '/mistakes', label: copy.nav.mistakes, icon: CircleAlert },
  { to: '/progress', label: copy.nav.progress, icon: ChartNoAxesColumn },
] as const;

export const settingsTab = { to: '/settings', label: copy.nav.settings, icon: Settings } as const;

/** Section 7: one icon family, line style, 1.5 px stroke, 24 px. */
export const ICON_SIZE = 24;
export const ICON_STROKE = 1.5;
