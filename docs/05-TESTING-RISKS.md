# 05 Testing, Risks and Assignment Story

Covers sections 12 and 13.

---

## 12. Testing, metrics and iteration plan

Three layers: automated tests for the learning rules, a manual acceptance run on a real phone, and a small usability test with five people. Every finding goes into a v1 to v2 log.

### Automated tests (Vitest)

These cases are the contract for `/domain`. Each must pass before Gate 2. Each is its own named test in `tests/domain`, with its case number in the name (for example `#12 ...`).

| # | Given | When | Then |
| --- | --- | --- | --- |
| 1 | New item | Learn card (E1) completed | Box 1, state Learning, due now |
| 2 | Box 1, due | Correct recognition answer | Box 2, due in 2 days |
| 3 | Box 3, due, never answered by producing German | Correct recognition answer | Stays box 3, due in 4 days |
| 4 | Box 3, due | Correct production answer | Box 4, state Strong, due in 7 days |
| 5 | Box 5, due | Correct answer | Stays box 5, due in 14 days |
| 6 | Box 4 | Wrong answer | Box 1, due in 1 day, enters Mistake Bank with an error type |
| 7 | Item entered the bank on day 1 | Correct recognition answer on day 2 | Day 2 recorded, item stays in the bank |
| 8 | Item has a correct answer on day 2 | Correct production answer on day 3 | Item recovered and leaves the bank |
| 9 | Item has a correct answer on day 2 | Another correct answer on day 2 | Counts once, item stays in the bank |
| 10 | Item has a correct answer on day 2 | Correct recognition answer on day 3 | Not recovered, the second correct answer must be production |
| 11 | Wrong answer in a session | Retry after 2 other exercises, answered correctly | Box unchanged, shown as "Fixed for now" |
| 12 | 4 due bank items, 7 other due items (11 due in total), 20 new available | Compose a session of 10 | 4 bank, 5 due, 1 new |
| 13 | 12 or more items due | Compose a session | No new items |
| 14 | 6 new items already learned today | Compose a session | No new items |
| 15 | Speech supported, session of 10 | Compose a session | At least 3 of E7, E8, E10 |
| 16 | Streak of 9, 1 freeze held, one day missed | Update streak | Streak stays 9, freeze used |
| 17 | Streak of 9, 1 freeze held, two days missed in a row | Update streak | Streak resets to 0 |
| 18 | Only 4 exercises done today | Update streak | Day does not count |
| 19 | Box 2, not yet due | Correct production answer | Box and due time unchanged, the answer still counted, `everProduced` set |
| 20 | Box 4, not yet due | Wrong answer | Box 1, due in 1 day |

Checker cases:

| Item | Learner answer | Expected |
| --- | --- | --- |
| der Kopf (E6) | "der kopf" | Correct |
| der Kopf (E6) | "die Kopf" | Wrong, error type `article` |
| das Fieber (E6) | "Fiber" | Wrong, error type `spelling`, correct spelling shown |
| Köpfe | "Koepfe" | Correct (umlaut folding) |
| 38,5 (E9) | "38.5" | Correct |
| 120/80 (E9) | "120 80" | Correct |
| Any E2 to E5 | Any text | Never calls the AI |

### End to end checks (Playwright, Chromium, 390 px and 1280 px)

- A full demo session from Try demo to the summary, with the network blocked after the first load, by pointer and by keyboard alone. Today then shows the new streak and a lower due count. There is no service worker until Phase 5, so these navigate inside the app and do not reload while offline.
- Leaving after 3 answers keeps 3 attempts, and the session is saved as not completed.
- The leave sheet opens from the Leave button and from the browser Back button.
- A refresh in a session goes back to Today.
- Audio plays the right text at the right speed, and with no German voice E4 and E9 do not appear.
- The time from tapping Shift Break to the first exercise is under 500 ms, also with a 4x CPU slowdown.

### Developer tools

Hidden behind `?dev=1`, absent from production builds shown to testers: advance the clock by one day, reset the AI daily count, force the AI to fail, force speech to be unsupported. Testing the next-day loop without waiting a day depends on these.

### Acceptance run on a real phone

Run on a mid range Android phone with Chrome, and repeat the offline steps after installing the PWA.

- [ ] Open the link, tap "Try demo", and land on Today within 2 seconds
- [ ] Tap Shift Break and finish a session of 10 exercises
- [ ] Hear German audio on a word and on a sentence, in normal and slow speed
- [ ] Answer one exercise by speaking, then one by typing instead
- [ ] Deny the microphone, and confirm the app moves on with typed answers
- [ ] Get an answer wrong and read feedback that explains why
- [ ] Find that word in the Mistake Bank, grouped under its error type
- [ ] Run a drill for one error group
- [ ] Finish the Pain check scenario, including one reply the AI judges
- [ ] Turn on airplane mode: practice still works, the AI notice is clear
- [ ] Use the dev tool to advance one day: due count and streak update correctly
- [ ] Install the PWA and open it from the home screen
- [ ] Export progress, reset, then import it back

### Usability test with five people

Recruit five people: ideally nurses or nursing students, otherwise adults learning a language. 15 minutes each, on their own phone, thinking aloud. Tell them it is a prototype and you are testing the app, not them. Note no names.

| Step | What to do | What to watch |
| --- | --- | --- |
| 1 | Before the app: a 5 word quiz on words from T01 and T02 | Baseline score |
| 2 | "Open the link and try the demo" | Do they find Try demo without help |
| 3 | "Do one Shift Break" | Where they hesitate, what they misread |
| 4 | "Find the words you got wrong" | Do they find the Mistake Bank |
| 5 | "Try the Pain check scenario" | Do they understand what to say, does speech work |
| 6 | The same 5 word quiz again | Score change |
| 7 | Ask: "What would make you open this tomorrow?" and "What confused you?" | Their words, written down as spoken |

A test passes when 4 of 5 people finish a session without help and no one is unable to find the Mistake Bank.

### Metrics

All come from the on-device event log (F-23). Testers export their log as JSON and you combine the files.

| Goal | Metric | How it is calculated | Target |
| --- | --- | --- | --- |
| G1 | Session length | Median of `session_end` time minus `session_start` time | About 3 minutes |
| G2 | Wrong answers returned in time | Share of wrong items that appear in a session within 24 hours | 100 percent |
| G3 | Speaking share | Speaking exercises divided by all exercises, per session | 33 percent or more where speech works |
| G4 | Day 1 return | Testers with a session on the day after their first session | 40 percent or more |
| G5 | Weak word recovery | Bank items recovered within 3 days of entering | 50 percent or more |
| Extra | Fallback rate | `ai_fallback` divided by `ai_call` | Reported, no target |

### v1 to v2 log

Keep this table in the repository and in the assignment write-up. Fill it only with real findings.

| Finding | Evidence | Change made | Result after the change |
| --- | --- | --- | --- |
| | | | |
| | | | |
| | | | |

Prioritise fixes by how many testers hit the problem and how badly it stopped them. Fix the ones that block a session first.

---

## 13. Risks, open questions and the assignment story

### Risks

| Risk | Why it matters | Defence |
| --- | --- | --- |
| Wrong or unnatural German | One visible error costs credibility with a recruiter and with learners | Review process in section 10. Production build fails on unreviewed items |
| Free Gemini quota shrinks or changes | AI feedback could stop mid demo | Rules first, caps per device, cache, demo cache, clean fallback (section 6) |
| Speech recognition is unreliable | Accents, noise and browser gaps cause false "wrong" results | Typed fallback, accept up to 3 alternatives, "I was right" once per session, say the limit openly |
| Scope too large for the deadline | A half built app looks worse than a small finished one | P0 list, phase gates, cut P1 and P2 first |
| The design drifts to generic | The brief asks for professional and distinct | Section 7 checklist, review the first screen before building more |
| Persona rests on desk research | Real nurses may behave differently | Usability test above. Talk to 2 or 3 real learners if you can |
| Differentiators are assumed, not verified | A competitor may already do one of them | Install two or three competitors and record what they actually do |
| No German voice on a device | Audio exercises cannot run | Detect it and swap exercises (section 9) |
| Agent adds features or invents content | Breaks scope and trust | Rules in section 11 (`00-README.md`) |
| Progress lost when browser data is cleared | Learner loses a streak | Export and import (F-24) |

### Open questions, with the default used until answered

| # | Question | Default |
| --- | --- | --- |
| 1 | What is the submission deadline? | Build phase by phase and cut from the end |
| 2 | Who will review the German content? | A tutor or teacher with B2 or higher. Until then everything is marked Draft |
| 3 | Final product name? | Wardwise |
| 4 | What does an A1 learner see as the Daily Case? | A 5 exercise A1 mini session on a rotating topic, until A2 opens |
| 5 | Hindi only, or also Malayalam for Kerala nurses? | Hindi only in v1 |
| 6 | "Pflegefachkraft" or "Schwester" in the nurse vocabulary? | Reviewer decides and notes it in the content file |
| 7 | Public link or login for the reviewer? | Public link with Try demo |

### How to present this in the assignment

Submit five things: the live link, the repository, these documents, a 2 minute screen recording of the demo, and a one page write-up following the brief's own chain: the user, the problem, the learning experience, the build, the test, the improvement.

- **User and problem.** One paragraph with the persona and research findings, with the confidence you gave each.
- **Why this design.** The loop (learn, practise, mistake, feedback, revisit) and the six signature features.
- **What was cut and why.** The cut list in section 4. This shows judgement.
- **How AI is used.** Rules first, AI last, two jobs, the free tier budget, the fallback.
- **What testing showed.** The v1 to v2 log and the metrics table with real numbers, even if small.
- **What you would do next.** For example: pronunciation scoring, more scenarios, a Malayalam support layer, a nurse mentor review of content.

Have three decisions ready to defend in an interview: why speech is controlled and not free chat, why a word cannot become Strong from multiple choice alone, and why progress is shown as Ward Readiness and not points.

### Sources

These came from search results and were not each opened in full. Check them before quoting them in the write-up.

- [Barriers and enabling factors for workplace integration of internationally qualified nurses, Nursing Open 2023](https://pubmed.ncbi.nlm.nih.gov/37060232/)
- [FES report on India and Germany skilled worker migration](https://collections.fes.de/publikationen/content/pagetext/1949028)
- [Foreign nurses in Germany face language and cultural barriers, The Local](https://www.thelocal.de/20250521/foreign-nurses-in-germany-face-language-and-cultural-barriers)
- [Triple Win programme for Kerala nurses, Federal Employment Agency](https://www.arbeitsagentur.de/vor-ort/zav/projects-programs/health-and-care/triple-win/india)
