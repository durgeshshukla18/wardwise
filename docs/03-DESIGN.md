# 03 Design

Covers sections 7 and 8.

---

## 7. Design doc

Wardwise should look like a well run clinical education platform: calm, ruled, precise, closer to a hospital chart or a medical journal than to a game. The learner is a working nurse, so the interface treats her as a professional and keeps every screen quiet, readable and fast.

### Design idea: the ward sheet

The visual language borrows from documents nurses already trust: handover sheets, observation charts and patient labels.

- Screens are laid out as sheets with small uppercase section labels ("DUE NOW", "WEAK WORDS", "WARD READINESS") and thin rules between sections.
- A word card has a header strip like a record label: topic code, level and item number on one line, with the German word below in large serif type.
- Progress uses ruled bars and a calendar grid, like a vitals chart, not badges and trophies.
- Colour is rare. Teal marks the one main action on a screen. Article colours and feedback colours carry meaning and are never decoration.

### Colour tokens

Define as CSS variables. Light theme only in v1. Do not add colours that are not in this table.

| Token | Hex | Use |
| --- | --- | --- |
| `--paper` | #F5F3EE | Page background |
| `--surface` | #FFFFFF | Cards, sheets, inputs |
| `--ink` | #17232D | Main text |
| `--ink-soft` | #55636E | Secondary text, labels |
| `--line` | #D9D5CA | Borders and rules |
| `--primary` | #0E6B6B | The one main button per screen, active tab, links |
| `--primary-hover` | #0A5454 | Hover and pressed |
| `--primary-tint` | #E1EEEC | Selected rows, quiet highlights |
| `--correct` | #1F7A4D | Correct answer border and check icon |
| `--wrong` | #B3261E | Wrong answer border and cross icon |
| `--attention` | #B45309 | Due items, streak at risk, weak word count |
| `--der` | #2B5C8A | Article der |
| `--die` | #A63D5B | Article die |
| `--das` | #3E7D4B | Article das |

Rules: text must meet WCAG AA contrast (4.5 to 1 for body text), checked with a contrast tool before release. Feedback never relies on colour alone: it always adds an icon and the words "Correct" or "Not quite". No gradients, no glass blur, no coloured shadows.

### Typography

Self-host fonts with `@fontsource` packages so the app works offline.

| Role | Font | Weights |
| --- | --- | --- |
| Headings and German words | Source Serif 4 | 600 |
| Interface and body | Source Sans 3 | 400, 500, 600 |
| Hindi hints | Noto Sans Devanagari | 400, 500 |

Sizes in px: 12 (labels, uppercase, letter-spacing 0.06em), 14 (secondary), 16 (body), 18 (option text), 22 (screen title), 28 (large stat), 36 (German word on the learn card). Line height 1.5 for body, 1.25 for headings. Numbers use tabular figures.

German nouns are always written with the article in its article colour and the noun in ink: der Kopf (der in blue). Plurals are written in full: der Kopf, die Köpfe.

### Space, shape and elevation

| Property | Value |
| --- | --- |
| Spacing scale | 4, 8, 12, 16, 24, 32, 48 px. Nothing outside the scale, except 0 where a bar or rail meets an edge |
| Corner radius | 6 px buttons and inputs, 8 px cards, 4 px chips |
| Borders | 1 px `--line` on every card. Cards have no shadow |
| Shadow | One token only, `--shadow`: `0 4px 16px rgba(23, 35, 45, 0.12)`. Used only on bottom sheets and menus |
| Touch targets | 44 by 44 px minimum |
| Page padding | 16 px mobile, 24 px tablet, 32 px desktop |

### Components

| Component | Behaviour |
| --- | --- |
| Primary button | Teal fill, white text, 48 px high, full width on mobile. One per screen |
| Secondary button | White fill, 1 px line border, ink text |
| Text button | Teal text, no border. Used for "Type instead", "Skip" |
| Answer option | Full width, 56 px high, 18 px text, 1 px line border. Selected: primary tint. Correct: green border plus check icon. Wrong: red border plus cross icon. Options lock after the answer |
| Article tag | Article in its colour, semibold, followed by the noun. Used on every noun everywhere |
| Audio button | 44 px circle, line speaker icon. Long press or second tap plays slow audio |
| Mic button | 64 px circle, line microphone icon. States: ready, listening (three small level bars), processing. A "Type instead" text button sits under it |
| Progress bar | 4 px, teal fill on line track. Session progress also shown as text "4 of 10" |
| Readiness bar | 8 px, segmented in 10 parts, teal fill. Always paired with the percent as text |
| Feedback panel | Bottom sheet on mobile, inline panel on desktop. Status line, correct answer, one sentence of why, error type chip, Next button |
| Error type chip | 4 px radius, 1 px line border, ink-soft text, for example "Article" |
| Streak calendar | 28 small squares in a 7 column grid. Filled teal for practised days, outlined for missed, hatched for a day saved by a freeze |
| Tab bar | 56 px high, four tabs with icon and label. Active tab uses teal text and a 2 px top rule |
| Empty state | One short sentence and one action. No illustrations |

### Icons and imagery

- One icon family, line style, 1.5 px stroke, 24 px. Lucide fits. No filled icons, no emoji in the interface.
- No stock photos, no cartoon mascots, no AI generated art.
- The Body Map is a clean line drawing in `--ink`, 1.25 px stroke, drawn as SVG with named regions. Anatomically plain and neutral.
- The app icon is a teal square with a white serif W. The wordmark is the word Wardwise in Source Serif 4, 600.

### Motion

- 150 ms ease-out for colour and border changes. 200 ms for bottom sheets.
- No bounce, no confetti, no screen shake, no animated mascots.
- A correct answer: border turns green and a check icon fades in. A readiness bar grows over 300 ms when the learner returns to Today after a session.
- Respect the reduced motion setting: transitions become instant.
- Sound is off by default. No sound effects in v1.

### Copy voice

The app talks like a calm senior colleague: short, plain, direct. It speaks to "you". It uses full stops, not exclamation marks. No em dashes anywhere in product copy.

| Moment | Write | Do not write |
| --- | --- | --- |
| Correct answer | "Correct." | "Awesome! Great job!" |
| Wrong answer | "Not quite. It is der Kopf. Kopf is masculine." | "Oops! Try again!" |
| Streak | "9 days in a row." | "You are on fire!" |
| Nothing due | "Nothing due now. Your next review is in 6 hours." | "You are all done! Come back tomorrow!" |
| Weak words | "These 6 words keep slipping. Practise them for 3 minutes." | "Let's crush those mistakes!" |
| AI unavailable | "Basic checking is on. Smart feedback will return shortly." | "Sorry, something went wrong." |

Avoid in all copy: unlock, supercharge, level up, journey, boost, seamless, empower, dive in, awesome, amazing, oops.

### Accessibility

- WCAG AA contrast, visible focus ring (2 px teal, 2 px offset), every control reachable by keyboard.
- Desktop shortcuts in the session runner: keys 1 to 4 choose an option, Enter submits or continues, Space plays audio.
- Feedback is announced to screen readers with an `aria-live` region.
- Layout stays usable at 200 percent text size.

### Checklist: does it look generic

The build is rejected if any of these is true:

- Purple, blue to violet or neon gradients anywhere
- Inter, Poppins, Roboto or a system default as the main font
- Glassmorphism, large blurred shapes, glowing shadows
- Emoji or cartoon icons as interface elements
- A hero with three identical feature cards
- Everything centred, every card the same size and pill shaped
- Lorem ipsum, placeholder names or fake round numbers in demo data
- Confetti, bouncing buttons or exaggerated praise
- More than one primary button on a screen
- Any colour or spacing value that is not in the tables above

### Wireframes (structure only, 390 px phone)

```text
TODAY                               SESSION (after a wrong answer)        MISTAKE BANK
+------------------------------+    +------------------------------+      +------------------------------+
| Today              9 day streak|  | Leave                 4 of 10|      | Mistake Bank                 |
| +--------------------------+ |    | [=====-----------------]     |      | 6 items to fix               |
| | Shift Break              | |    | ARTICLE PICK                 |      | +--------------------------+ |
| | 10 exercises, 3 minutes  | |    | Kopf                    (>)  |      | | Article                  | |
| | Start session            | |    | head                         |      | | der Bauch                | |
| +--------------------------+ |    | [ der            Correct   ] |      | | die Hand                 | |
| DUE NOW                      |    | [ die        Your answer   ] |      | | [ Drill this group ]     | |
| 7 items due in 24 hours      |    | [ das                      ] |      | +--------------------------+ |
| WARD READINESS               |    |------------------------------|      | [ Spelling               ]   |
| Body parts          [====  ] |    | Not quite. It is der Kopf.   |      | [ Listening              ]   |
| Symptoms and pain   [===   ] |    | Kopf is masculine.           |      | [ Numbers                ]   |
| Vital signs         [==    ] |    | (Article)                    |      |                              |
| [ Daily Case: Admission ]    |    | [ Next ]                     |      |                              |
| Today | Practice | Mistakes... |    +------------------------------+      | Today | Practice | Mistakes..|
+------------------------------+                                            +------------------------------+
```

---

## 8. Responsive behaviour

Phone first at 390 px wide, scaling up to a desktop with a left navigation rail. The learner can start a session on her phone during a shift and review progress on a laptop at home, with the same screens in a different arrangement.

### Breakpoints

| Name | Width | Navigation | Content |
| --- | --- | --- | --- |
| Mobile | 360 to 767 px | Bottom tab bar | Single column, full width |
| Tablet | 768 to 1023 px | Bottom tab bar | Single column, centred, max width 640 px |
| Desktop | 1024 px and up | Left rail, 232 px wide | Main area max width 1040 px, two columns on Today, Progress and Mistake Bank |

### Screen arrangements

| Screen | Mobile | Desktop |
| --- | --- | --- |
| Today | One column: greeting and streak, Shift Break card, items due, Ward Readiness for 3 weakest topics, Daily Case | Two columns. Left: Shift Break and Ward Readiness. Right: items due, streak calendar, Daily Case |
| Session runner | Full screen, no tab bar. Options stacked. Feedback as a bottom sheet | Centred 640 px column, no rail. Feedback as an inline panel under the options. Keyboard hints 1 to 4 visible |
| Mistake Bank | Error type groups as expandable cards | Left list of error types, right panel with the items and a Drill button |
| Progress | Stacked sections | Readiness list left, streak calendar and counts right |
| Scenario runner | Patient line at the top, reply area at the bottom above the keyboard | Same, in a 640 px column, with the transcript visible on the side |

### Phone and PWA details

- Use `100dvh` for full screen layouts and `env(safe-area-inset-bottom)` for bars.
- Run in `standalone` display mode when installed. Theme colour equals `--paper`.
- When the on-screen keyboard opens during typing exercises, the input and Submit button stay visible.
- Portrait is the design target. Landscape on a phone must stay usable but is not optimised.
- Offline banner at the top when there is no connection: "Offline. Practice still works. Smart feedback needs internet."

### Performance targets

| Measure | Target |
| --- | --- |
| First load JavaScript | Under 200 KB gzipped, fonts excluded |
| Largest content paint on a mid range Android over 4G | Under 2.5 seconds |
| Time from tapping Shift Break to the first exercise | Under 500 ms |
| Rule based answer feedback | Under 300 ms |
