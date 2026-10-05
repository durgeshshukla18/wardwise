# Changelog

Each phase from section 11 (`docs/00-README.md`) adds an entry: what was built and what was learned.

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
