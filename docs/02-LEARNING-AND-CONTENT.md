# 02 Learning Design and Content

Covers sections 3 and 10. Every rule here is exact on purpose. Implement the numbers as written. Do not invent scheduling logic.

---

## 3. Learning design

### Levels and content scope

| | A1 | A2 |
| --- | --- | --- |
| Learner can | Recognise and say words and short fixed sentences | Build short sentences, ask and answer simple patient questions |
| Item mix | Words with article, plus short phrases | Words, phrases and full sentences |
| Target size | About 70 words and 20 phrases | About 50 words and 30 phrases or sentences |
| Speaking tasks | Say a word, repeat a phrase | Ask a question, answer in a full sentence |
| Unlock | Available at start | Starts immediately if placement says A2. Otherwise opens when 60 percent of A1 items are in box 3 or higher. Learner can also switch manually in Settings |

Total prototype content is 120 to 150 items. Fewer, checked items beat many unchecked ones.

### Topics

| Code | Topic | Main level |
| --- | --- | --- |
| T01 | Body parts | A1 |
| T02 | Symptoms and pain | A1 |
| T03 | Vital signs and numbers | A1 to A2 |
| T04 | Patient admission and basics | A1 |
| T05 | Ward and equipment | A1 |
| T06 | Daily care: washing, eating, moving | A2 |
| T07 | Medication and doses | A2 |
| T08 | Questions to ask a patient | A2 |

### Exercise types

Fixed IDs. Nothing outside this list is built in v1.

| ID | Name | What the learner does | Format | Level |
| --- | --- | --- | --- | --- |
| E1 | Learn card | Sees the word with article, audio, example sentence. Taps "Got it" | Show | A1, A2 |
| E2 | Article pick | Chooses der, die or das for a noun | Recognition | A1, A2 |
| E3 | Meaning pick | Sees German, picks the English meaning from 4 options | Recognition | A1, A2 |
| E4 | Listen and pick | Hears German, picks the meaning | Recognition | A1, A2 |
| E5 | Fill the gap | Taps the missing word in a short sentence | Recognition | A1, A2 |
| E6 | Type it | Sees English (or Hindi if on), types the German | Production | A1, A2 |
| E7 | Say it first | Sees or hears the prompt, speaks the German, then sees the answer | Production | A1, A2 |
| E8 | Sentence builder | Taps word chips into the right order, then optionally says it | Production | A2 |
| E9 | Number dictation | Hears a German number or value, types the digits | Production | A1, A2 |
| E10 | Scenario turn | Reads or hears a patient line, replies by speaking or typing | Production | A2 |

"Production" means the learner has to produce German, not choose it. This matters for the mastery rule.

### Scheduling rules (Leitner boxes)

Every item has a box from 1 to 5, a due time, and counts of correct and wrong answers.

| Box | Wait after moving into this box | State shown to the learner |
| --- | --- | --- |
| 1 | 1 day | Learning |
| 2 | 2 days | Learning |
| 3 | 4 days | Learning |
| 4 | 7 days | Strong |
| 5 | 14 days | Strong |

1. A new item enters box 1 after its first Learn card (E1). Until then its state is New. Its due time is set to now, so the composer can quiz it once later in the same session with E3 or E4.
2. A correct answer moves the item up one box (maximum 5) and sets the due time from the table for the new box.
3. A wrong answer moves the item to box 1, due in 1 day, and adds it to the Mistake Bank with an error type.
4. Recognition-only cap: if the item has never been answered correctly in a Production format, it cannot go above box 3. A word cannot become Strong by multiple choice alone.
5. Same-session retry: a wrong item is asked once more after 2 other exercises, in an easier format (E3 or E4). The retry does not change the box. Its result is shown as "Fixed for now" or "Still tricky".
6. Strong means box 4 or 5.

### Mistake Bank rules

- An item enters on any wrong answer, tagged with one error type: `article`, `spelling`, `meaning`, `listening`, `word_order`, `grammar`, `number`, `speech_mismatch`.
- An item is recovered and leaves the bank when it is answered correctly in two different sessions on two different calendar days after entering, and the second correct answer is in a Production format. Two correct answers on the same calendar day count once.
- The bank screen groups items by error type and offers a drill for each group (feature F-09).

### Session composer

A session has 10 exercises by default (Settings can switch to 5 or 15). Fill in this order and stop when full:

1. Mistake Bank items that are due, or wrong in the last 48 hours: up to 4
2. Other due items, most overdue first: up to 5
3. New items: up to 2, and only if fewer than 12 items are waiting as due. No more than 6 new items per calendar day
4. If still short, fill with Learning items (boxes 1 to 3) not seen today, then random Strong items

Exercise choice by box: box 1 uses E1 then E3 or E4. Box 2 uses E2, E5 or E4. Box 3 uses E6 or E9. Box 4 and 5 use E7, E8 or E10. When speech recognition is supported, at least 3 of the 10 exercises must be E7, E8 or E10. When it is not, E6 replaces them.

The app never shows a "you are finished" screen. When today's session is done it shows when the next review is due and offers an optional Extra round.

### Placement

Onboarding shows 5 A1 items as E3 questions. 0 to 2 correct places the learner at A1. 3 to 5 correct asks "You seem ready to start at A2. Start there?" and she chooses. Placement only decides where new items come from. It never locks anything.

### Retention loop

Reasons to come back tomorrow, in order of weight:

1. **Items due.** Today shows "7 items due in the next 24 hours" with the Shift Break button.
2. **Ward Readiness.** Each topic shows its percent of Strong items. It rises with practice and falls slowly if she stops.
3. **Daily Case.** One short scenario a day (about 2 minutes), rotating through the scenario library.
4. **Streak.** A day counts when she completes at least 5 exercises. She earns 1 streak freeze for every 7 day streak, holds a maximum of 2. Each freeze covers one missed day and is used automatically.
5. **Weekly recap.** On Monday: words fixed last week and new Strong words. No points, no leaderboard.

Rewards are calm and professional: a clean check, a readiness bar moving, a short line of text. No confetti, no sound by default.

---

## 10. Content specification

The content is the product. Every word, sentence and scenario lives in reviewed JSON files, and the build agent must never invent German. If a content field is missing, the app shows nothing for it and logs a warning.

### Item schema

```ts
type ErrorType = 'article' | 'spelling' | 'meaning' | 'listening' | 'word_order' | 'grammar' | 'number' | 'speech_mismatch';

type Item = {
  id: string;                 // e.g. 't01-kopf'
  kind: 'word' | 'phrase' | 'sentence';
  pos?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other';  // a 'word' item with no pos is treated as a noun
  level: 'A1' | 'A2';
  topic: 'T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07' | 'T08';
  de: string;                 // 'Kopf' for a noun, full text for a phrase
  article?: 'der' | 'die' | 'das';   // required when pos is 'noun' (or a 'word' with no pos)
  plural?: string;            // 'Köpfe'
  en: string;                 // English meaning
  hi?: string;                // optional Hindi hint in Devanagari
  exampleDe: string;
  exampleEn: string;
  accepted: string[];         // answers accepted when the learner types or speaks
  spoken?: string;            // text for audio when it differs from de
  mistakeNotes?: Partial<Record<ErrorType, string>>;  // fixed one-line explanations
  confusableWith?: string[];  // item ids drilled together
  reviewed: { by: string; date: string } | null;      // null means draft
};
```

### Sample entries

These show the expected style. A German speaker must confirm every one before release.

```json
[
  {
    "id": "t01-kopf", "kind": "word", "pos": "noun", "level": "A1", "topic": "T01",
    "de": "Kopf", "article": "der", "plural": "Köpfe",
    "en": "head",
    "exampleDe": "Mein Kopf tut weh.", "exampleEn": "My head hurts.",
    "accepted": ["der Kopf", "Kopf"],
    "mistakeNotes": { "article": "Kopf is masculine: der Kopf." },
    "reviewed": null
  },
  {
    "id": "t02-fieber", "kind": "word", "pos": "noun", "level": "A1", "topic": "T02",
    "de": "Fieber", "article": "das",
    "en": "fever",
    "exampleDe": "Sie haben Fieber.", "exampleEn": "You have a fever.",
    "accepted": ["das Fieber", "Fieber"],
    "mistakeNotes": { "spelling": "Fieber has an e after the i: F-i-e-b-e-r." },
    "reviewed": null
  },
  {
    "id": "t03-blutdruck", "kind": "word", "pos": "noun", "level": "A2", "topic": "T03",
    "de": "Blutdruck", "article": "der",
    "en": "blood pressure",
    "exampleDe": "Ich messe Ihren Blutdruck.", "exampleEn": "I am measuring your blood pressure.",
    "accepted": ["der Blutdruck", "Blutdruck"],
    "reviewed": null
  },
  {
    "id": "t08-seit-wann", "kind": "sentence", "pos": "other", "level": "A2", "topic": "T08",
    "de": "Seit wann haben Sie die Schmerzen?",
    "en": "Since when have you had the pain?",
    "exampleDe": "Seit wann haben Sie die Schmerzen?", "exampleEn": "Since when have you had the pain?",
    "accepted": ["Seit wann haben Sie die Schmerzen?", "Seit wann haben Sie Schmerzen?"],
    "mistakeNotes": { "word_order": "In a question the verb comes second: haben Sie." },
    "reviewed": null
  }
]
```

Number dictation items use `spoken` for the words and `accepted` for the digits:

```json
{
  "id": "t03-bp-1", "kind": "phrase", "pos": "other", "level": "A2", "topic": "T03",
  "de": "hundertzwanzig zu achtzig", "spoken": "hundertzwanzig zu achtzig",
  "en": "120 over 80",
  "exampleDe": "Ihr Blutdruck ist hundertzwanzig zu achtzig.", "exampleEn": "Your blood pressure is 120 over 80.",
  "accepted": ["120/80", "120 80", "120 zu 80"],
  "reviewed": null
}
```

### Scenario schema and sample

A scenario is a short scripted conversation. The learner plays the nurse. Patient lines are fixed. Replies are checked by the rules in section 6, with the AI judge only for replies that match nothing in `accepted`.

```ts
type Scenario = {
  id: string; title: string; level: 'A2';
  topic: ('T01' | 'T02' | 'T03' | 'T04' | 'T05' | 'T06' | 'T07' | 'T08')[];  // one or more topic codes, e.g. ['T02', 'T08']
  turns: {
    id: string;
    patientDe: string; patientEn: string;   // what the patient says before the nurse replies (can be empty on turn 1)
    goal: string;                           // what the learner must do, in English
    accepted: string[];                     // accepted nurse replies
    hintDe?: string;                        // shown on request
  }[];
  reviewed: { by: string; date: string } | null;
};
```

Sample, "Pain check":

| Turn | Patient says | Learner goal (shown in English) | Accepted replies |
| --- | --- | --- | --- |
| 1 | (silent) | Ask whether the patient has pain | Haben Sie Schmerzen? |
| 2 | Ja, mein Kopf tut weh. | Ask since when | Seit wann haben Sie die Schmerzen? / Seit wann haben Sie Schmerzen? / Seit wann tut Ihr Kopf weh? |
| 3 | Seit gestern Abend. | Ask how strong the pain is | Wie stark sind die Schmerzen? |
| 4 | Sehr stark. | Say you will get the doctor | Ich hole den Arzt. / Ich hole die Ärztin. / Ich rufe den Arzt. / Ich rufe die Ärztin. |

After the last turn the debrief lists replies that needed correction and adds those sentences to the Mistake Bank.

### Required scenarios for v1

| ID | Title | Topic focus |
| --- | --- | --- |
| SC1 | Admission | T04, T08 |
| SC2 | Pain check | T02, T08 |
| SC3 | Taking vitals | T03 |

The Daily Case rotates through these. Add more only after the first three are reviewed.

### Authoring rules

1. Every noun has its article and, where it exists, its plural.
2. Use the formal "Sie" with patients in all examples and scenarios.
3. A1 example sentences have at most 6 words. A2 example sentences have at most 10.
4. An example sentence may only use words that are the item itself or already taught at the same or a lower level.
5. All numbers, values and doses in examples are made up for practice. The app gives no clinical advice and says so in Settings.
6. Hindi hints are written only for genuinely tricky items (about 30), in Devanagari, and only if a Hindi speaker has confirmed them. A missing hint is better than a wrong one.
7. The `accepted` list includes common correct variants (with and without the article for a noun, with and without `die` in "die Schmerzen").
8. Whether to teach "Pflegefachkraft" or the older, still spoken "Schwester" is a decision for the German reviewer. Record it in the content file notes.

### Review process

1. Draft items offline, with Gemini if helpful. Drafts are saved with `reviewed: null`.
2. Check each word against the Goethe-Institut word lists for A1 and A2 where it appears, and mark anything outside them as an extra medical word.
3. A German speaker (a teacher or tutor with at least B2, ideally C1) reviews every item, example, scenario and Hindi hint. Record their name and the date in `reviewed`.
4. A validation script (`npm run validate-content`) checks schema, missing articles, duplicate ids and sentence lengths, and fails on any of them. Unreviewed items (`reviewed: null`) are reported as warnings only, so `npm run build` works while content is in draft. The release build (`npm run build:release`) fails if any shipped item has `reviewed: null`. Development builds show a "Draft" label on those items.

### Demo seed

The demo profile (F-01) is created by a script (`/scripts/seed-demo.ts`), not by hand. It sets a 9 day streak with 1 freeze held, about 40 items spread across boxes 1 to 5, and these 6 Mistake Bank items:

| Item | Error type |
| --- | --- |
| der Bauch | article |
| die Hand | article |
| das Fieber | spelling |
| die Tablette | listening |
| hundertzwanzig zu achtzig | number |
| t08-seit-wann (Seit wann haben Sie die Schmerzen?) | word_order |
