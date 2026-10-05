# Open questions

Questions raised by the coding agent, with the owner's answer.

## Phase 1 (Foundation)

| # | Question | Answer | Status |
| --- | --- | --- | --- |
| P1-1 | The brief says the docs live in `/docs`, but they are in `/build_docs`. | Rename `build_docs` to `docs` | Answered |
| P1-2 | Section 10 gives only 5 complete sample items. Phase 1 needs 20. | Owner supplied 15 more draft items. No Hindi hints yet, so `hi` is left out everywhere | Answered |
| P1-3 | Section 10 says a production build fails on `reviewed: null`, but Gate 1 needs `npm run build` to pass with drafts. | `validate-content` only warns about drafts. `build:release` fails on any `reviewed: null`. Docs updated | Answered |
| P1-4 | The item schema has no part of speech, so the validator cannot tell nouns apart. | Optional `pos`: `noun`, `verb`, `adjective`, `adverb`, `other`. `article` is required when `pos` is `noun`. A `word` item with no `pos` is treated as a noun | Answered |
| P1-5 | Should Phase 1 ship `scenarios.json`, and how is a multi topic scenario stored? | Zod schema now, `scenarios.json` in Phase 4. `topic` is a list of topic codes | Answered |
| P1-6 | The folder is not a git repository, and Phase 1 has no feature IDs. | `git init`. Commits prefixed `P1:` with S or T IDs where they apply | Answered |
| P1-7 | Dexie ID types, indexes, `days.sessions` type, boolean indexes. | String UUIDs, fixed key `"me"` for `profile` and `streak`, indexes on `itemState.dueAt` and `attempts.sessionId`, `itemId`, `ts`. `days.sessions` is a count. Store `inMistakeBank` as 0 or 1 if it ever needs an index | Answered |
| P1-8 | Fields needed later: bank error type, freeze days, onboarding answers. | Add to version 1 now: `itemState.bankErrorType` (optional), `streak.freezeDays`, `profile.onboarding` (goal, dailyTime, selfLevel) | Answered |
| P1-9 | Tooling not in the stack table. | Approved as listed, exact versions, Node 22.18 or later, no `tsx` | Answered |
| P1-10 | No value for the one soft shadow. | `0 4px 16px rgba(23, 35, 45, 0.12)`, bottom sheets and menus only | Answered |
| P1-11 | How to prove the 390 px and 1280 px route checks. | Playwright, Chromium only, one smoke test per route, fail on any console error | Answered |
| P1-12 | Unknown URLs and the onboarding redirect. | Unknown URLs go to `/`. Onboarding redirect waits until Phase 3 | Answered |
| P1-13 | Format of `confusables.json`. | Wait until F-21 | Answered |
