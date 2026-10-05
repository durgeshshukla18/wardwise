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

## Raised during Phase 1, needed later

| # | Question | Proposed default | Status |
| --- | --- | --- | --- |
| P3-1 | The demo seed (F-01) needs about 40 items across boxes 1 to 5, but 20 items exist. Will more items arrive before Phase 3? | Owner supplied 29 more draft items (49 in total). No Hindi hints | Answered |
| P3-2 | The demo seed lists "Seit wann haben Sie Schmerzen?" as a Mistake Bank item, but `t08-seit-wann` has `de` "Seit wann haben Sie die Schmerzen?" (the seed text is one of its accepted variants). Is the seed item `t08-seit-wann`? | Yes, seed `t08-seit-wann` as the word_order item. Demo seed table in 02 updated | Answered |
| P3-3 | `sessions.mode` has no list of allowed values. | Owner's five: `shift_break`, `topic`, `drill`, `scenario`, `daily_case`. An Extra round is a `shift_break` session. Dropped from my proposal: `practice` (renamed `topic`) and `extra_round`. Table in 04 updated | Answered |

## Phase 2 (Engine), beyond the 11 owner decisions

Defaults below are used unless the owner objects.

| # | Gap | Proposed default | Status |
| --- | --- | --- | --- |
| P2-1 | Gate 2 needs coverage, which needs `@vitest/coverage-v8`, not in the approved tooling list. | Add it, pinned to the Vitest version, threshold 95 percent lines on `src/domain` | Open |
| P2-2 | E1 is not an answer, so `applyAnswer` cannot express test case 1. Placement (E3 on 5 items) must not create scheduler state. | Separate `completeLearnCard`. `applyAnswer` throws on a `new` item. Placement never touches itemState | Open |
| P2-3 | ESLint forbids `/src/domain` importing `/src/data`, but the row types live there. | `domain/types.ts` owns `ItemState`, `StreakState`, `ExerciseId`. `data/schema.ts` imports them | Open |
| P2-4 | `applyAnswer` needs the error type, the local date and local midnight, and callers need to know about bank events. | Input `{correct, format, now, day: {date, startMs}, errorType}`. Output `{state, bank: 'entered' or 'recovered' or null}`. Every wrong answer resets `bankEnteredAt` and `bankErrorType` and clears `bankCorrectDays`. A correct answer counts only if `bankEnteredAt < day.startMs` | Open |
| P2-5 | Decision 2 says the answer that makes the second distinct date must be Production. After test 10 (recognition on day 3), a Production answer on day 4 would never qualify. | Recovered on any Production correct answer that leaves 2 or more distinct dates after entry | Open |
| P2-6 | "2 positions later" is ambiguous. The doc says "after 2 other exercises". A retry should not change any state. | Retry goes in at index + 3, or is appended if the queue is shorter. A retry of a retry is a no-op. E4 only if audio works. `scheduleRetry(queue, index, item, rng, audio)`. No state change at all, including counters and `lastSeenAt` | Open |
| P2-7 | A new item needs E1 and a later quiz, but test 12 counts a new item as one of the 10. | New item is one planned slot (E1). Its same-session E3 or E4 is a follow-up inserted by the same helper and does not count toward the length. "Waiting as due" counts non-new items with `dueAt <= now`, bank items included (test 12 needs this). The caller passes `newItemsToday` | Open |
| P2-8 | Order inside a session is unspecified. | Shuffle the selected items with the rng. An E1 always comes before its quiz | Open |
| P2-9 | Caps (4, 5, 2) and the speaking minimum are given for 10 only. | Caps stay fixed for 5 and 15 and step 4 fills the rest. Speaking minimum is round half up of 0.3 times length: 2, 3, 5 | Open |
| P2-10 | E7, E8 and E10 belong to boxes 4 and 5, so a learner with low boxes cannot reach the speaking minimum. E10 has no item link and `scenarios.json` comes in Phase 4. | Convert E6, E3 or E4 slots of box 2 and 3 items to E7, nearest box first. If still short, return `speakingShortfall` instead of failing. Do not emit E10 until Phase 4 | Open |
| P2-11 | Box 1 lists "E1 then E3 or E4". | E1 for new items only. Box 1 reviews use E3 or E4 | Open |
| P2-12 | Which types are valid for which item. | E2 noun with article. E5 only if `exampleDe` contains `de` as a whole token. E6 and E7 not for items with `spoken`. E8 only A2 sentences with 5 to 9 words (F-12), which is 5 of the 49 items. E9 only with `spoken` and a digit `accepted[0]`. E4 needs audio. E7 needs speech. Number items get E1, E3, E4, E9 only. Option and distractor picking is Phase 3. T08 has only 3 items, so same-topic distractors will run short | Open |
| P2-13 | The TRD `checkAnswer` contract is too thin. | Input `{exercise, input, answers (up to 3 alternatives), item}`. Output `{verdict: correct, wrong or undecided, errorType, needsAI, expected, feedback}`. `undecided` only when `needsAI`. E10 takes accepted replies instead of an item | Open |
| P2-14 | Error types missing from decision 5. | E3 and E5 wrong is `meaning`. Typed phrase or sentence: same words in another order is `word_order`, within the limit is `spelling`, else `meaning`. Spoken: right noun with wrong article stays `article`, any other miss is `speech_mismatch`. Rules never emit `grammar`. `speech_mismatch` has no template: "Heard something different. Try: {accepted[0]}." | Open |
| P2-15 | "Fold punctuation" could turn 120/80 into 12080. | Text: strip . , ! ? ; : and quotes, keep digits and "/". E9: comma becomes dot between digits, spaces collapse, and the accepted list decides the rest | Open |
| P2-16 | Streak details. | `lastCountedDate` means the last date counted or covered by a freeze. `updateStreak` is idempotent. After a reset `current` is 0 and today counts as 1. Freezes are earned only on counted days. `best` follows `current` | Open |
| P2-17 | Section 3 rules with no function in the list: placement score, A2 unlock at 60 percent in box 3 or higher, items due in 24 hours, next review time. | Add `placementLevel` and `a2Unlocked` to `readiness.ts`, and `dueWithin` and `nextReviewAt` to `scheduler.ts`. `weakestTopics` and state counts wait for Phase 3. Daily Case and weekly recap stay in Phase 5 | Open |
| P2-18 | Section 3 says readiness "falls slowly if she stops". Decision 9 has no decay. | Follow decision 9. Readiness drops only when a Strong item goes back to box 1 after a wrong answer | Open |
| P2-19 | G2 (every wrong answer back within 24 hours) cannot hold if more than 9 items are due, because the caps are 4 and 5. | Test the scheduler half (`dueAt` is now plus 1 day) and that bank items fill first. Note the limit | Open |
| P2-20 | Helpers the file list lacks. | Add `dates.ts` (calendar date maths without `Date`), `rng.ts` (seeded generator for tests and dev tools), `text.ts` (normalise, Levenshtein) | Open |
