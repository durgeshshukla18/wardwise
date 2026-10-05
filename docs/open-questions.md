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

The owner approved every default below with the Phase 2 "go", plus three clarifications (sentence answers, New items and placement, streak freeze tests), which are written into the docs.

| # | Gap | Proposed default | Status |
| --- | --- | --- | --- |
| P2-1 | Gate 2 needs coverage, which needs `@vitest/coverage-v8`, not in the approved tooling list. | Add it, pinned to the Vitest version, threshold 95 percent lines on `src/domain` | Answered |
| P2-2 | E1 is not an answer, so `applyAnswer` cannot express test case 1. Placement (E3 on 5 items) must not create scheduler state. | Separate `completeLearnCard`. `applyAnswer` throws on a `new` item. Placement never touches itemState | Answered |
| P2-3 | ESLint forbids `/src/domain` importing `/src/data`, but the row types live there. | `domain/types.ts` owns `ItemState`, `StreakState`, `ExerciseId`. `data/schema.ts` imports them | Answered |
| P2-4 | `applyAnswer` needs the error type, the local date and local midnight, and callers need to know about bank events. | Input `{correct, format, now, day: {date, startMs}, errorType}`. Output `{state, bank: 'entered' or 'recovered' or null}`. Every wrong answer resets `bankEnteredAt` and `bankErrorType` and clears `bankCorrectDays`. A correct answer counts only if `bankEnteredAt < day.startMs` | Answered |
| P2-5 | Decision 2 says the answer that makes the second distinct date must be Production. After test 10 (recognition on day 3), a Production answer on day 4 would never qualify. | Recovered on any Production correct answer that leaves 2 or more distinct dates after entry | Answered |
| P2-6 | "2 positions later" is ambiguous. The doc says "after 2 other exercises". A retry should not change any state. | Retry goes in at index + 3, or is appended if the queue is shorter. A retry of a retry is a no-op. E4 only if audio works. `scheduleRetry(queue, index, item, rng, audio)`. No state change at all, including counters and `lastSeenAt` | Answered |
| P2-7 | A new item needs E1 and a later quiz, but test 12 counts a new item as one of the 10. | New item is one planned slot (E1). Its same-session E3 or E4 is a follow-up inserted by the same helper and does not count toward the length. "Waiting as due" counts non-new items with `dueAt <= now`, bank items included (test 12 needs this). The caller passes `newItemsToday` | Answered |
| P2-8 | Order inside a session is unspecified. | Shuffle the selected items with the rng. An E1 always comes before its quiz | Answered |
| P2-9 | Caps (4, 5, 2) and the speaking minimum are given for 10 only. | Caps stay fixed for 5 and 15 and step 4 fills the rest. Speaking minimum is round half up of 0.3 times length: 2, 3, 5 | Answered |
| P2-10 | E7, E8 and E10 belong to boxes 4 and 5, so a learner with low boxes cannot reach the speaking minimum. E10 has no item link and `scenarios.json` comes in Phase 4. | Convert E6, E3 or E4 slots of box 2 and 3 items to E7, nearest box first. If still short, return `speakingShortfall` instead of failing. Do not emit E10 until Phase 4 | Answered |
| P2-11 | Box 1 lists "E1 then E3 or E4". | E1 for new items only. Box 1 reviews use E3 or E4 | Answered |
| P2-12 | Which types are valid for which item. | E2 noun with article. E5 only if `exampleDe` contains `de` as a whole token. E6 and E7 not for items with `spoken`. E8 only A2 sentences with 5 to 9 words (F-12), which is 5 of the 49 items. E9 only with `spoken` and a digit `accepted[0]`. E4 needs audio. E7 needs speech. Number items get E1, E3, E4, E9 only. Option and distractor picking is Phase 3. T08 has only 3 items, so same-topic distractors will run short | Answered |
| P2-13 | The TRD `checkAnswer` contract is too thin. | Input `{exercise, input, answers (up to 3 alternatives), item}`. Output `{verdict: correct, wrong or undecided, errorType, needsAI, expected, feedback}`. `undecided` only when `needsAI`. E10 takes accepted replies instead of an item | Answered |
| P2-14 | Error types missing from decision 5. | E3 and E5 wrong is `meaning`. Typed phrase or sentence: same words in another order is `word_order`, within the limit is `spelling`, else `meaning`. Spoken: right noun with wrong article stays `article`, any other miss is `speech_mismatch`. Rules never emit `grammar`. `speech_mismatch` has no template: "Heard something different. Try: {accepted[0]}." | Answered |
| P2-15 | "Fold punctuation" could turn 120/80 into 12080. | Text: strip . , ! ? ; : and quotes, keep digits and "/". E9: comma becomes dot between digits, spaces collapse, and the accepted list decides the rest | Answered |
| P2-16 | Streak details. | `lastCountedDate` means the last date counted or covered by a freeze. `updateStreak` is idempotent. After a reset `current` is 0 and today counts as 1. Freezes are earned only on counted days. `best` follows `current` | Answered |
| P2-17 | Section 3 rules with no function in the list: placement score, A2 unlock at 60 percent in box 3 or higher, items due in 24 hours, next review time. | Add `placementLevel` and `a2Unlocked` to `readiness.ts`, and `dueWithin` and `nextReviewAt` to `scheduler.ts`. `weakestTopics` and state counts wait for Phase 3. Daily Case and weekly recap stay in Phase 5 | Answered |
| P2-18 | Section 3 says readiness "falls slowly if she stops". Decision 9 has no decay. | Follow decision 9. Readiness drops only when a Strong item goes back to box 1 after a wrong answer | Answered |
| P2-19 | G2 (every wrong answer back within 24 hours) cannot hold if more than 9 items are due, because the caps are 4 and 5. | Test the scheduler half (`dueAt` is now plus 1 day) and that bank items fill first. Note the limit | Answered |
| P2-20 | Helpers the file list lacks. | Add `dates.ts` (calendar date maths without `Date`), `rng.ts` (seeded generator for tests and dev tools), `text.ts` (normalise, Levenshtein) | Answered |

## Raised during Phase 2, needed later

| # | Question | Proposed default | Status |
| --- | --- | --- | --- |
| P3-4 | An Extra round (a `shift_break` session after the day's session) finds nothing to ask: step 4 skips Learning items seen today and then only offers random Strong items, so a learner with no Strong items gets an empty Extra round. | Let an Extra round use Learning items seen today as a last tier. This changes the composer rule in section 3, so it needs the owner's approval | Open |
| P3-5 | Without speech, section 3 says E6 replaces E7, E8 and E10. E8 is tap based and could still work. | Keep the documented rule for now | Open |
| P3-6 | Options for E2 to E5 (F-06) need same-topic distractors, but T08 has only 3 items. The E5 gap word is the item's own word. | Fall back to other topics when a topic has too few items. Build in Phase 3 | Open |
| P3-7 | A correct answer lifts an item one box even when it was not yet due, so Strong fillers and Extra rounds can lift boxes early. | Keep the rule as written | Open |
| P3-8 | Feedback templates: a field that already ends in . ? or ! does not get a second full stop, which the template text in decision 7 did not say. `speech_mismatch` has no template in decision 7, so "Heard something different. Try: {accepted[0]}." was added. | Both are written into section 6 of 04-TRD.md | Answered |

## Phase 3 (Screens), beyond the owner answers

Defaults below are used unless the owner objects.

| # | Gap | Proposed default | Status |
| --- | --- | --- | --- |
| P3-9 | A Start fresh learner gets 2 new items plus 2 quizzes, which is 4 exercises. That is below the 5 needed for the streak and far below the session length. | Add a last composer tier: when room remains after step 4, add more new items up to the daily cap of 6 (and the backlog rule). This changes "up to 2" in section 3, so it needs approval. Every completed slot (E1, quizzes, retries included) counts toward `exercisesDone` | Open |
| P3-10 | "Not signed in or not onboarded goes to /start" would hide S01, which holds Try demo and Start fresh. F-01 also wants a first name. | `/` shows S01 when there is no profile. Start fresh asks for a first name on S01, creates the profile and goes to `/start`. Every other route goes to `/` with no profile and to `/start` with a profile that is not onboarded. An onboarded learner on `/` or `/start` goes to `/today`. Partial onboarding answers are not saved | Open |
| P3-11 | Scope says S12 stays a placeholder, but the build order builds minimal Settings. | Build minimal S12 as step 4. S04, S08, S10, S11 and S13 stay placeholders | Open |
| P3-12 | Session lifecycle is unspecified. | The queue lives in memory. Every answer is saved at once. A refresh or a direct visit to `/session/:id` goes to `/today`. The browser Back button opens the leave sheet. Progress reads "n of N" where N is the current queue length, so it grows when a retry or quiz is added. E1 is saved as an attempt with `correct` true, which gives `newItemsToday`. `days.sessions` goes up when a session starts | Open |
| P3-13 | Choice answering, keys and skipping. | Tap or keys 1 to 4 answer a choice exercise at once. Enter submits typed answers and continues from feedback. Digits, Space and Enter are not hijacked while typing in a field. Shift+Space plays slow audio. E2 options stay in the fixed order der, die, das. E6 and E9 get a Skip text button that submits an empty answer, which counts as wrong. E5 shows `exampleEn` under the gap sentence | Open |
| P3-14 | Audio details. | Wait up to 1 second for voices. With no German voice, show a short how-to and replace E4 and E9. A second tap within 2 seconds, or a long press, plays slow audio. The Settings audio speed is the speed of a normal press. Headless Chromium has no voices, so e2e stubs `speechSynthesis` | Open |
| P3-15 | English interface copy the docs do not give: landing line, onboarding questions and options, feedback lines, Today lines, summary, leave and reset confirmations, no-voice how-to. | I draft it in the calm voice of section 8 with no em dashes. You review it at the checkpoint. No German or Hindi is written | Open |
| P3-16 | Onboarding choices and placement items. | Goal: Work as a nurse in Germany, Pass a German exam, Talk with patients and colleagues, Something else. Daily time: 5, 10 or 15 minutes (stored only). Level in own words: a short free text line. Placement items: the first A1 non-number word of each of T01 to T05 | Open |
| P3-17 | Demo seed location and shape. | The pure builder lives in `src/data/demo-seed.ts` (no Dexie), shared by `scripts/seed-demo.ts` and Try demo. Persona name Anjali from the PRD. Streak history: a 6 day run, a missed day, then 9 counted days, so a replay from scratch gives current 9 and 1 freeze. 40 known items and 9 unseen. Bank items entered in the last 36 hours. No attempts rows are seeded | Open |
| P3-18 | There is no service worker until Phase 5. | Gate 3 goes offline after the first load and navigates inside the app. A reload while offline cannot work yet | Open |
| P3-19 | IndexedDB unavailable (private mode) is a Phase 4 failure case. | Defer to Phase 4 | Open |
| P3-20 | Export file shape is not defined. | `{format: "wardwise-export", schemaVersion, exportedAt, tables: {...all 10 tables}}`, written into 04-TRD.md. Import (Phase 5) rejects a newer version | Open |
| P3-21 | A2 unlock has no effect without S04. | Phase 3 uses the manual level switch only. `a2Unlocked` stays unused until Phase 5 | Open |
| P3-22 | Test tooling: no jsdom or component test library is approved. | UI is covered by Playwright and by pure-logic tests, plus a static guard test for colour literals and inline styles. The dev-only Draft label is checked once on the dev server | Open |
