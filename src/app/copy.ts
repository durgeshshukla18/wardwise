// Every user-facing string in the app lives in this file. Components import from here and hold
// no strings of their own. The voice is section 7 of docs/03-DESIGN.md: calm, short, plain, full
// stops, no exclamation marks, no em dashes. No German or Hindi appears here: German and Hindi
// only ever come from content fields.

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

export const copy = {
  appName: 'Wardwise',

  landing: {
    label: 'Medical German for nurses',
    tagline: 'Practise ward German a few minutes at a time.',
    tryDemo: 'Try demo',
    startFresh: 'Start fresh',
    storageNote: 'Your progress stays on this device.',
    nameHeading: 'What should we call you?',
    nameLabel: 'First name',
    nameContinue: 'Continue',
    nameBack: 'Back',
    nameRequired: 'Enter a first name.',
  },

  nav: {
    label: 'Main',
    today: 'Today',
    practice: 'Practice',
    mistakes: 'Mistakes',
    progress: 'Progress',
    settings: 'Settings',
  },

  today: {
    title: 'Today',
    greeting: (name: string) => `Hello, ${name}.`,
    streakLabel: 'Streak',
    streak: (days: number) =>
      days === 0 ? 'No streak yet.' : `${days} ${plural(days, 'day', 'days')} in a row.`,
    freezes: (count: number) =>
      count === 0
        ? 'No streak freeze held.'
        : `${count} ${plural(count, 'streak freeze', 'streak freezes')} held.`,
    shiftBreak: 'Shift Break',
    shiftBreakMeta: (exercises: number, minutes: number) =>
      `${exercises} exercises, ${minutes} ${plural(minutes, 'minute', 'minutes')}`,
    startSession: 'Start session',
    dueLabel: 'Due now',
    dueWithin24Hours: (count: number) =>
      `${count} ${plural(count, 'item', 'items')} due in the next 24 hours.`,
    nothingDueNow: (next: string) => `Nothing due now. Your next review is ${next}.`,
    nothingDueYet: 'Nothing due yet. Start a Shift Break to learn new words.',
    readinessLabel: 'Ward Readiness',
    readinessPercent: (percent: number) => `${percent} percent`,
  },

  time: {
    lessThanAMinute: 'in less than a minute',
    minutes: (count: number) => `in ${count} ${plural(count, 'minute', 'minutes')}`,
    hours: (count: number) => `in ${count} ${plural(count, 'hour', 'hours')}`,
    days: (count: number) => `in ${count} ${plural(count, 'day', 'days')}`,
  },

  onboarding: {
    goalOptions: [
      'Work as a nurse in Germany',
      'Pass a German exam',
      'Talk with patients and colleagues',
      'Something else',
    ],
    timeOptions: ['5 minutes', '10 minutes', '15 minutes'],
    demoGoal: 'Work as a nurse in Germany',
    demoDailyTime: '10 minutes',
    demoSelfLevel: 'I know some words and short phrases.',
  },

  errors: {
    loadFailed: 'Your progress could not be loaded in this browser.',
  },
} as const;
