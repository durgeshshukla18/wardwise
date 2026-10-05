# Changelog

Each phase from section 11 (`docs/00-README.md`) adds an entry: what was built and what was learned.

## Phase 2: Engine (2026-10-05)

### Built

- Pure functions in `src/domain` for the scheduler (Leitner boxes, Mistake Bank, same-session retry), the checker (rules first, `needsAI` decision, feedback sentences), the composer (session order, exercise choice, speaking minimum), readiness (with placement and the A2 unlock) and streak (freezes, walking missed days).
- Small helpers: calendar date maths without `Date`, a seeded random generator, text normalisation and edit distance, and a table of which exercise types fit which item.
- An ESLint rule that stops `src/domain` importing data, services, React or Dexie, and using browser globals, `Date` or `Math.random`. A test runs ESLint on throwaway code to prove it fires.
- `src/data/schema.ts` now takes its row types from `src/domain/types.ts`.
- 168 new tests in `tests/domain`: the 18 scheduler, composer and streak cases and the 7 checker cases from `docs/05-TESTING-RISKS.md`, each as its own named test, plus a test for every rule in section 3. Line coverage of `src/domain` is 100 percent (gate: 95).

### Learned

- Section 3 had gaps that only show up when the rules become functions: how a new item fits in a 10 slot session, how a learner with low boxes can reach the speaking minimum, what "after entering" means for the Mistake Bank, and whether a Production answer can still recover an item after a recognition answer on the second day. Each is now written into `docs/02` and `docs/04`.
- Docs contradicted each other: section 6 said E1 to E7 never call the AI, while the AI table lists E7 sentences. Fixed.
- Passing `now`, `day` and `rng` in made every test deterministic, and let one test run the composer with 25 seeds to check the speaking minimum.
- A Phase 3 gap is logged: an Extra round can be empty (P3-4).

## Phase 1: Foundation (2026-10-05)

### Built

- Vite, React and TypeScript (strict) project with the section 9 folder layout.
- Tailwind CSS v4 with the default theme removed. Only section 7 and 8 values exist: 14 colours, the spacing scale (classes named by pixel value, so `p-16` is 16px), the fixed component sizes, 3 radii, 7 font sizes, 2 breakpoints and the single shadow. An ESLint rule blocks arbitrary values.
- Source Serif 4 (600), Source Sans 3 (400, 500, 600) and Noto Sans Devanagari (400, 500) bundled with `@fontsource`.
- React Router with a placeholder for every route in section 5 (S01 to S05, S08 to S13). Unknown URLs redirect to `/`.
- Dexie schema version 1 with the 10 tables from section 9, including `itemState.bankErrorType`, `streak.freezeDays` and `profile.onboarding`.
- Zod schemas and types for items and scenarios (section 10), with the new `pos` field and multi topic scenarios.
- `npm run validate-content` (drafts warn) and `npm run build:release` (drafts fail).
- 20 draft items across T01, T02, T03, T05, T07 and T08, and the T01 to T08 topic list.
- Vitest (content rules, design tokens read from `docs/03-DESIGN.md`, Dexie tables read from `docs/04-TRD.md`), Playwright route smoke tests at 390 px and 1280 px, ESLint and Prettier.

### Learned

- The docs needed 13 answers before any code was safe to write (`docs/open-questions.md`). The biggest were the draft versus release build rule and how to recognise a noun without a part of speech field.
- Tests that read the design and data model tables straight from the docs catch drift in both directions: a changed doc fails the build until the code follows.
- Tailwind v4 has no switch for arbitrary values. Removing the default theme stops off-scale utilities from generating, and a lint rule stops the bracket syntax.
