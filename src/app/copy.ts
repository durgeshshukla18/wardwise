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
    nothingToPractice: 'Nothing to practise right now. Come back after your next review.',
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
    stepOf: (step: number, total: number) => `Question ${step} of ${total}`,
    goalQuestion: 'What is your goal?',
    timeQuestion: 'How much time can you practise each day?',
    levelQuestion: 'How would you describe your German?',
    levelLabel: 'In your own words',
    next: 'Continue',
    placementTitle: 'Find your starting point',
    placementIntro: 'Five words. Choose what each one means.',
    placementStep: (step: number, total: number) => `Word ${step} of ${total}`,
    resultScore: (correct: number, total: number) => `${correct} of ${total} correct.`,
    resultStartA1: 'We will start with A1 words. You can change this in Settings.',
    resultOfferA2: 'You seem ready to start at A2. Start there?',
    startA2: 'Start at A2',
    stayA1: 'Stay at A1',
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

  session: {
    exerciseNames: {
      E1: 'Learn card',
      E2: 'Article pick',
      E3: 'Meaning pick',
      E4: 'Listen and pick',
      E5: 'Fill the gap',
      E6: 'Type it',
      E7: 'Say it first',
      E8: 'Sentence builder',
      E9: 'Number dictation',
      E10: 'Scenario turn',
    },
    prompts: {
      E2: 'Which article goes with this word?',
      E3: 'What does this mean?',
      E4: 'Listen, then choose the meaning.',
      E5: 'Choose the missing word.',
      E6: 'Type this in German.',
      E9: 'Type the number you hear.',
    },
    progress: (position: number, total: number) => `${position} of ${total}`,
    progressLabel: 'Session progress',
    exit: 'Leave',
    leaveTitle: 'Leave this session?',
    leaveBody: 'Your answers so far are saved.',
    leaveConfirm: 'Leave',
    leaveCancel: 'Keep going',
    itemStrip: (topic: string, level: string, number: number) =>
      `${topic} | ${level} | No. ${number}`,
    pluralJoin: ', ',
    pluralArticle: 'die',
    gotIt: 'Got it',
    playWord: 'Play the word',
    playSentence: 'Play the sentence',
    playAudio: 'Play audio',
    noVoice: 'No German voice found on this device.',
    noVoiceHowTo:
      'To hear German audio, add a German voice in your device settings under text to speech, then reload this page. Until then, audio exercises are replaced by others.',
    gapBlank: '____',
    typeLabel: 'Your answer',
    submit: 'Submit',
    skip: 'Skip',
    correctTag: 'Correct',
    yourAnswerTag: 'Your answer',
    statusCorrect: 'Correct.',
    statusWrong: 'Not quite.',
    expectedIs: (expected: string) => `It is ${expected}.`,
    expectedMeans: (expected: string) => `It means ${expected}.`,
    retryOutcome: {
      fixed_for_now: 'Fixed for now',
      still_tricky: 'Still tricky',
    },
    next: 'Next',
    draft: 'Draft',
    errorTypes: {
      article: 'Article',
      spelling: 'Spelling',
      meaning: 'Meaning',
      listening: 'Listening',
      word_order: 'Word order',
      grammar: 'Grammar',
      number: 'Number',
      speech_mismatch: 'Speech mismatch',
    },
  },

  summary: {
    title: 'Session summary',
    itemsRight: (count: number) => `${count} ${plural(count, 'item', 'items')} right.`,
    itemsToRevisit: (count: number) => `${count} ${plural(count, 'item', 'items')} to revisit.`,
    stillDue: (count: number) => `${count} ${plural(count, 'item is', 'items are')} still due now.`,
    nextReview: (when: string) => `Your next review is ${when}.`,
    backToToday: 'Back to Today',
    extraRound: 'Extra round',
  },

  settings: {
    title: 'Settings',
    levelLabel: 'Level',
    levels: { A1: 'A1', A2: 'A2' },
    sessionLengthLabel: 'Session length',
    sessionLength: (count: number) => `${count} exercises`,
    speechLabel: 'Speech',
    audioSpeedLabel: 'Audio speed',
    audioSpeeds: { normal: 'Normal', slow: 'Slow' },
    hindiLabel: 'Hindi hints',
    on: 'On',
    off: 'Off',
    dataLabel: 'Your data',
    exportProgress: 'Export progress',
    resetProgress: 'Reset progress',
    resetWarning: 'This removes all progress on this device.',
    resetConfirm: 'Reset',
    resetCancel: 'Cancel',
    aboutLabel: 'About',
    clinicalNote: 'Wardwise is a language tool. It gives no clinical advice.',
    speechNote: "Speech recognition may send your voice to your browser's speech service.",
  },

  errors: {
    loadFailed: 'Your progress could not be loaded in this browser.',
  },
} as const;
