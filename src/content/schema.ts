// Content schemas from section 10 (docs/02-LEARNING-AND-CONTENT.md).
import { z } from 'zod';

export const LEVELS = ['A1', 'A2'] as const;
export const TOPICS = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08'] as const;
export const ERROR_TYPES = [
  'article',
  'spelling',
  'meaning',
  'listening',
  'word_order',
  'grammar',
  'number',
  'speech_mismatch',
] as const;

export const levelSchema = z.enum(LEVELS);
export const topicSchema = z.enum(TOPICS);
export const errorTypeSchema = z.enum(ERROR_TYPES);

const text = z.string().trim().min(1);

const reviewedSchema = z
  .strictObject({
    by: text,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  })
  .nullable();

export const itemSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be lowercase words joined by -'),
  kind: z.enum(['word', 'phrase', 'sentence']),
  pos: z.enum(['noun', 'verb', 'adjective', 'adverb', 'other']).optional(),
  level: levelSchema,
  topic: topicSchema,
  de: text,
  article: z.enum(['der', 'die', 'das']).optional(),
  plural: text.optional(),
  en: text,
  hi: z
    .string()
    .regex(/^[ऀ-ॿ\s.,?!]+$/, 'hi must be written in Devanagari')
    .optional(),
  exampleDe: text,
  exampleEn: text,
  accepted: z.array(text).min(1),
  spoken: text.optional(),
  mistakeNotes: z.partialRecord(errorTypeSchema, text).optional(),
  confusableWith: z.array(z.string()).optional(),
  reviewed: reviewedSchema,
});

export const scenarioTurnSchema = z.strictObject({
  id: z.string().min(1),
  patientDe: z.string(),
  patientEn: z.string(),
  goal: text,
  accepted: z.array(text).min(1),
  hintDe: text.optional(),
});

export const scenarioSchema = z.strictObject({
  id: z.string().min(1),
  title: text,
  level: z.literal('A2'),
  topic: z.array(topicSchema).min(1),
  turns: z.array(scenarioTurnSchema).min(1),
  reviewed: reviewedSchema,
});

export const topicEntrySchema = z.strictObject({
  id: topicSchema,
  name: text,
  mainLevel: text,
});

export type Level = z.infer<typeof levelSchema>;
export type TopicId = z.infer<typeof topicSchema>;
export type ErrorType = z.infer<typeof errorTypeSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type TopicEntry = z.infer<typeof topicEntrySchema>;
