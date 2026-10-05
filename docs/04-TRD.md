# 04 Technical Requirements

Covers sections 6 and 9.

---

## 6. AI usage plan

The app uses the Gemini API for exactly two runtime jobs, both judging what the learner said or typed, and nothing else. Everything the learner reads, hears or is taught is written in advance and reviewed by a person. This keeps the free tier safe and removes made-up German.

### The rule: rules first, AI last

Every answer goes through this order. The first step that gives a verdict wins.

1. **Normalise.** Lowercase, trim, drop the punctuation . , ! ? ; : and quotation marks (digits and "/" are kept), collapse spaces. Treat ä, ö, ü, ß as equal to ae, oe, ue, ss. For nouns, accept the answer with or without the article unless the exercise is about the article.
2. **Exact match** against the accepted answers in the content file.
3. **Close match.** Levenshtein distance 1 for words up to 7 letters, or 2 for longer words, counts as `spelling`: marked wrong, correct spelling shown.
4. **AI judge**, only if the exercise is E10, E8 spoken, or an A2 sentence item in E7, and steps 2 and 3 found nothing. A same-words-wrong-order answer is not a close match, so it still goes to the AI when the exercise allows it.
5. **Fallback** when the AI is unavailable: mark as "Not matched", show the accepted answers, and let the learner mark "I was right" once per session. Never block the session.

Exercises E1 to E6 and E9 never call the AI. E7 calls it only for A2 sentence items and E8 only when spoken. Vocabulary and article checking is fully rule based.

### How each exercise is checked

The checker only decides whether the AI is needed. It never calls it. Its result has `verdict` (`correct`, `wrong` or `undecided`), `errorType`, `needsAI`, `expected` (the answer to show) and `feedback`. `undecided` appears only when `needsAI` is true, and then `errorType` and `feedback` are the rule based fallback for section 6 step 5.

- **E2 to E5 (tapped options).** The tapped option is compared with the right option after normalisation. There is no close match. A wrong E2 pick is `article`, a wrong E4 pick is `listening`, a wrong E3 or E5 pick is `meaning`.
- **E9 (digits).** Compared after number normalisation: a comma and a dot are the same decimal mark, runs of spaces collapse, and other separators such as "/" stay as typed. Anything wrong is `number`.
- **Nouns, typed or spoken (E6, E7).** The article is optional. A right noun with a wrong article is `article`. A noun within the Levenshtein limit but not equal is `spelling`. Anything else is `meaning`. When spoken, `article` stays `article` and every other miss is `speech_mismatch`.
- **Sentence answers (E8, E10, A2 sentence items in E7, and any other answer that is not a noun).** Run these in order and use the first that matches:
  1. Exact match after normalisation: `correct`.
  2. `word_order`: the learner's words are the same multiset as an accepted answer's words, in a different order.
  3. `spelling`: the same number of words as an accepted answer, exactly one word differs, and that word is within the Levenshtein limit (1 for words up to 7 letters, 2 beyond, measured on the accepted word).
  4. Anything else: `meaning`.

  A single spoken word that is not a noun is `speech_mismatch` for every miss, because it is more likely a recognition problem than a gap in knowledge.
- **Spoken answers** arrive as up to 3 alternatives. Any exact match makes the answer correct. Otherwise the most informative miss is kept: a close match first, then `article` or `word_order`, then the rest.
- **needsAI** is true only when there was no exact or close match and the exercise is E10, or E8 spoken, or an A2 sentence item in E7. E10 never has an item, so it gets `feedback: null`.
- **Feedback sentence.** The item's `mistakeNotes` entry for that error type if present, otherwise a fixed template built only from content fields. Never invent German beyond these:

| Error type | Template |
| --- | --- |
| `article` | "{de} takes {article}: {article} {de}." |
| `meaning` | "{de} means {en}." |
| `spelling` | "Check the spelling: {de}." |
| `listening` | "You heard {de}. It means {en}." |
| `number` | "The answer is {accepted[0]}." |
| `word_order` | "Correct order: {accepted[0]}." |
| `grammar` | "Correct form: {accepted[0]}." |
| `speech_mismatch` | "Heard something different. Try: {accepted[0]}." |

  A field that already ends in a full stop, question mark or exclamation mark does not get a second full stop. If a template needs a field the item does not have, `feedback` is `null`. The rules never assign `grammar`. Only the AI or an item's own note does.

### The two AI jobs

| Job | When | Max calls | Output |
| --- | --- | --- | --- |
| `judge_scenario_reply` | The learner's reply in a scenario turn matches no accepted reply | 3 per scenario run | Verdict, corrected sentence, error types, one line of explanation |
| `judge_sentence` | An A2 sentence (E8 spoken or E7 sentence) matches no accepted variant | 2 per session | Same output |

### Where AI is used offline, before launch

A content script (run by us, not by learners) can ask Gemini to draft example sentences, short explanations per error type, Hindi hints, and extra accepted replies for scenarios. A German speaker reviews every line before it is saved to the content files. This gives rich feedback with zero cost at run time.

### Free tier budget

Free tier limits change often and sources disagree. Third-party guides report anything from about 250 to 1,500 requests per day for Flash class models, and Google's own rate limit page is the source of truth. Plan for the worst case.

| Setting | Value | Why |
| --- | --- | --- |
| Planning floor | 250 requests per day for the whole project, 10 per minute | Lowest figure reported in 2026 guides. Check live numbers in Google AI Studio before testing |
| Per device | 20 AI calls per day, 4 per session | 10 testers at the cap use 200 calls, under the floor |
| Model | Read from environment variable `GEMINI_MODEL`. Use the cheapest Flash or Flash-Lite class model that AI Studio lists as free | Model names and free eligibility change. Never hard code a model name in the app |
| Timeout | 6 seconds, no automatic retry | A retry spends quota twice |
| On HTTP 429 or 5xx | Fallback for 60 minutes, then try again | Protects quota and keeps the session moving |
| Cache | Key = hash of task, item id and normalised learner text. IndexedDB, kept 30 days | The same wrong sentence is never judged twice |
| Demo mode | Pre-seeded cache entries for the demo scenarios | Demo works even when the quota is gone |

Quota figures come from third-party guides that disagree with each other: [yingtu.ai guide](https://yingtu.ai/en/blog/google-gemini-api-free-tier-limits-2026) and [Apideck guide](https://www.apideck.com/blog/how-to-get-your-gemini-api-key). That is why model name and limits are configuration, not code.

### Request and response contract

The app calls its own serverless function at `/api/judge`. The function holds the API key and calls Gemini. The browser never sees the key.

Request:

```json
{
  "task": "judge_scenario_reply",
  "level": "A2",
  "goal": "Ask the patient since when the pain has been there",
  "accepted": ["Seit wann haben Sie Schmerzen?", "Seit wann haben Sie die Schmerzen?"],
  "learner": "Seit wann Sie haben Schmerzen?"
}
```

Response (the model is forced to this shape with JSON mode and a response schema):

```json
{
  "verdict": "close",
  "corrected_de": "Seit wann haben Sie Schmerzen?",
  "error_types": ["word_order"],
  "explanation_en": "In a question the verb comes second: haben Sie."
}
```

Allowed `verdict`: `correct`, `close`, `wrong`. Allowed `error_types`: `article`, `spelling`, `meaning`, `word_order`, `grammar`, `number`. `explanation_en` is at most 25 words.

### Prompt rules for the serverless function

- The system prompt says the model is a strict A1 to A2 German checker for nurses and only judges. It does not teach new vocabulary and does not chat.
- The learner's text is placed inside a delimited field and the prompt says to treat it as data, never as instructions.
- Temperature 0. Maximum output about 150 tokens. If the chosen model supports it, set the thinking budget to the minimum.
- `corrected_de` must be one of the `accepted` sentences or a minimal edit of the learner's text. It must not introduce words outside A2 level.
- The function validates the JSON against the schema. Anything invalid, over 25 words, or outside allowed values is discarded and treated as a fallback.
- Input limit: learner text up to 200 characters. Reject anything longer.
- No personal data is sent. No names, no profile.

### Speech is not AI

Speaking uses the browser's built in speech recognition and synthesis, which cost nothing against the Gemini quota. Some browsers send audio to their own speech service, so Settings tells the learner that in one sentence. The app checks the recognised text, not the sound. That limit is stated openly in the app and the assignment write-up.

---

## 9. Technical requirements

Wardwise is a React and TypeScript single page app with bundled content, progress stored on the device, and one small serverless function that talks to Gemini. This keeps hosting free, makes the app work offline, and keeps the AI key off the browser.

```mermaid
flowchart LR
  subgraph Device["Learner device (installable PWA)"]
    Screens["Screens (React, design tokens)"] --> Domain["Domain engine: scheduler, checker, composer"]
    Screens --> Speech["Speech: Web Speech API"]
    Domain --> DB["IndexedDB: progress and answer history"]
    Domain --> Content["Content files: items, topics, scenarios"]
  end
  subgraph Server["Server (Vercel)"]
    Judge["/api/judge: holds the API key, validates replies"] --> Gemini["Gemini API"]
  end
  Domain -. only when rules cannot decide .-> Judge
```

### Stack

Pin exact versions at install time and record them in the repository. Do not add a dependency that is not in this table without asking.

| Layer | Choice | Notes |
| --- | --- | --- |
| Build | Vite, React, TypeScript in strict mode | |
| Routing | React Router | Routes listed in section 5 |
| Styling | Tailwind CSS v4 configured with the section 7 tokens only | Default theme removed. Arbitrary values (`[...]`, `(--...)`) are blocked by an ESLint `no-restricted-syntax` rule so colours and spacing cannot drift |
| UI state | Zustand | Session and settings state |
| Storage | Dexie over IndexedDB | All progress. No `localStorage` for progress |
| PWA | `vite-plugin-pwa` with Workbox | Manifest and service worker |
| Validation | Zod | Content files and `/api/judge` payloads |
| Icons and fonts | `lucide-react`, `@fontsource` packages | Fonts bundled, not loaded from a CDN |
| Tests | Vitest for logic, Playwright for 4 to 5 end to end paths | Playwright runs Chromium only. Phase 1 adds a route smoke test at 390 px and 1280 px |
| Tooling | `@vitejs/plugin-react`, `@tailwindcss/vite`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-config-prettier`, `globals`, `prettier`, `@types/react`, `@types/react-dom`, `@types/node`, `@vitest/coverage-v8` (same version as Vitest) | Node 22.18 or later. Scripts in `/scripts` run with Node's built-in TypeScript type stripping, no `tsx` |
| Server | One Vercel serverless function at `/api/judge` | Holds `GEMINI_API_KEY`, `GEMINI_MODEL`, `ALLOWED_ORIGIN` |
| Hosting | Vercel free plan | Preview deploys for testers |

### Folder layout

```text
/src
  /app          routes and layout shells
  /components   shared interface parts (Button, OptionTile, ArticleTag...)
  /features     onboarding, session, scenarios, mistakes, progress, settings
  /domain       scheduler.ts, checker.ts, composer.ts, readiness.ts, streak.ts  (pure functions)
                types.ts, eligibility.ts, dates.ts, rng.ts, text.ts  (shared types and small helpers)
  /data         db.ts (Dexie schema), repositories
  /content      topics.json, items.json, scenarios.json, confusables.json
  /services     speech.ts, tts.ts, ai.ts, events.ts
  /styles       tokens.css
/api            judge.ts
/scripts        validate-content.ts, seed-demo.ts
/tests
```

All logic that decides what the learner sees next (scheduler, checker, composer, readiness, streak) lives in `/domain` as pure functions with no browser or database calls. That is what gets unit tests. Time and randomness are always passed in as arguments (`now`, `day`, `rng`), and ESLint blocks `/src/domain` from importing `/src/data`, `/src/services`, React or Dexie, and from using browser globals, `Date` or `Math.random`. `/src/data` imports its row types from `/src/domain/types.ts`, not the other way round. Line coverage of `/src/domain` must stay at or above 95 percent (`npm run test:coverage`).

### Data model (IndexedDB tables)

Content is static JSON in the bundle. Only learner state is stored.

| Table | Key | Fields |
| --- | --- | --- |
| `profile` | `id` | name, level, sessionLength, hindiHints, speechOn, audioSpeed, onboardedAt, onboarding (the 3 answers: goal, dailyTime, selfLevel) |
| `itemState` | `itemId` | box (1 to 5), dueAt (ms), state (`new`, `learning`, `strong`), correct, wrong, lastSeenAt, everProduced (boolean), inMistakeBank (boolean), bankEnteredAt, bankCorrectDays (list of local dates), bankErrorType (optional) |
| `attempts` | `id` | sessionId, itemId, exercise (E1 to E10), correct, errorType, answer, ts, aiUsed |
| `sessions` | `id` | startedAt, endedAt, mode (`shift_break`, `topic` for a session started from Practice, `drill` for a Mistake Bank group, `scenario`, `daily_case`; an Extra round is a `shift_break` session), itemIds, completed |
| `days` | `date` (local YYYY-MM-DD) | exercisesDone, sessions |
| `streak` | `id` | current, best, freezes, lastCountedDate (the last date counted or covered by a freeze), freezeDays (list of local dates saved by a freeze) |
| `aiCache` | `key` | response, createdAt |
| `aiUsage` | `date` | count |
| `feedback` | `id` | ts, screen, text, rating |
| `events` | `id` | ts, name, props |

Keys and indexes: `id` values are string UUIDs. `profile` and `streak` hold one row each, with the fixed key `"me"`. `days.sessions` is a count. Indexes: `itemState.dueAt`, and `attempts.sessionId`, `attempts.itemId`, `attempts.ts`. IndexedDB cannot index booleans, so if `inMistakeBank` ever needs an index it is stored as 0 or 1.

Store the schema version in Dexie and write a migration for every change. The export file includes the schema version and import rejects files with a newer version.

### Domain function contracts

| Function | Input | Output |
| --- | --- | --- |
| `completeLearnCard` | item state, now | The item in box 1, Learning, due now. E1 is not an answer |
| `applyAnswer` | item state, `{correct, format, now, day, errorType}` where format is `recognition` or `production` and `day` is `{date, startMs}` for the local day | `{state, bank}`: the new item state with box, dueAt, state and mistake bank fields set by section 3, and `bank` is `entered`, `recovered` or null. Throws for a New item |
| `applyRetry` | item state, correct | `{state, outcome}`: the state unchanged, and `fixed_for_now` or `still_tricky` |
| `scheduleRetry` | queue, index, item, rng, audio | A new queue with the retry inserted after 2 other exercises, or appended |
| `composeSession` | `{items, states, now, day, settings, newItemsToday, rng}` | `{slots, speakingShortfall}`: ordered exercises, each with item id and exercise type, plus `retry` or `followUp` marks |
| `checkAnswer` | a request for the exercise (tapped option, typed or spoken answers, or digits) | `{verdict, errorType, needsAI, expected, feedback}` using the order in section 6 |
| `computeReadiness` | topic id, all items, all states | Percent of the topic's items that are Strong, rounded, 0 for an empty topic |
| `a2Unlocked`, `placementLevel` | items and states, or the placement score | Whether 60 percent of A1 items are in box 3 or higher, and `A1` or `offer_A2` |
| `dueWithin`, `nextReviewAt` | states, now (and a window) | How many items are due in the window, and the next due time after now |
| `updateStreak` | streak, days, today | `{streak, freezeUsedOn, todayCounted}`: the new streak and freezes, and the dates a freeze covered |

A day is the device's local calendar day. Midnight local time ends it. Dates are stored as `YYYY-MM-DD` strings in local time and timestamps as milliseconds.

### Speech

- **Listening.** Use the browser's `SpeechRecognition` (or the `webkit` prefixed version) with language `de-DE`, one result, up to 3 alternatives. The answer is correct if any alternative passes the checker. Stop after 8 seconds of silence. Support varies by browser, so detect it and never assume it.
- **Speaking.** Use `speechSynthesis`. Pick a voice whose language starts with `de`, prefer `de-DE`. Normal rate 1.0, slow 0.8.
- **No German voice found.** Show "No German voice found on this device" with a short how-to, and replace audio-dependent exercises (E4, E9) with E3 and E6.
- **Microphone permission denied.** Turn speech off in Settings, replace E7 with E6, and keep the learner moving.
- **Number dictation.** The content file stores the spoken text as words (for example "hundertzwanzig zu achtzig") and the accepted answers ("120/80", "120 80"). The app speaks the words, so the voice never has to guess how to read digits. Decimals accept a comma or a dot.

### PWA

- Manifest: name, short name, icons at 192 and 512 pixels plus a maskable icon, `display: standalone`, theme and background colour `#F5F3EE`.
- The service worker caches the app shell, content files and fonts. `/api/*` is never cached.
- When a new version is ready, show "A new version is available. Reload." as a text button. Never reload silently in the middle of a session.

### Failure behaviour

| Failure | What the app does |
| --- | --- |
| No internet | Offline banner. All rule based practice works. AI jobs fall back |
| AI returns 429, 5xx or a timeout | Fallback for 60 minutes, basic checking, one quiet notice |
| AI returns invalid JSON | Discard, use fallback for that answer |
| Speech unsupported or denied | Typed answers only, no repeated prompts |
| No German voice | Replace E4 and E9 as above |
| IndexedDB unavailable (private mode) | Run in memory with a notice that progress will not be saved |
| Corrupt or newer import file | Reject with a plain message and change nothing |

### Security and privacy

- The Gemini key lives only in server environment variables. It must never appear in the client bundle, the repository or logs. Commit an `.env.example` with names only.
- `/api/judge` accepts only POST from the allowed origin, rejects bodies over 2 KB, validates with Zod, and applies a simple per IP rate limit.
- The only personal data stored is a first name, on the device. No third party analytics in v1.
- Settings includes: "Speech recognition may send your voice to your browser's speech service."

### Browser support

Full support on current Chrome and Edge for Android and desktop. Safari and Firefox run the whole app, but speech recognition may be missing or limited, so the typed fallback must be complete and tested.

### Events logged on the device

`session_start`, `session_end`, `exercise_result`, `speech_used`, `speech_unsupported`, `ai_call`, `ai_fallback`, `mistake_bank_enter`, `mistake_bank_recover`, `streak_freeze_used`, `feedback_sent`. Each has a timestamp and a small props object, with no free text from the learner except in the feedback form.
