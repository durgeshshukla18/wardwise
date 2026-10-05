// Content checks from section 10, review process step 4. Pure: takes parsed JSON, returns findings.
import type { z } from 'zod';

import {
  TOPICS,
  itemSchema,
  scenarioSchema,
  topicEntrySchema,
  type Item,
  type Level,
} from './schema.ts';

export type ValidationResult = {
  errors: string[];
  warnings: string[];
};

export type ValidateOptions = {
  /** Release mode: drafts (`reviewed: null`) are errors instead of warnings. */
  release: boolean;
};

/** Authoring rule 3: maximum words in an example sentence, per level. */
export const MAX_EXAMPLE_WORDS: Record<Level, number> = { A1: 6, A2: 10 };

export function countWords(sentence: string): number {
  return sentence.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** A word item with no `pos` is treated as a noun. */
export function isNoun(item: Pick<Item, 'kind' | 'pos'>): boolean {
  return item.pos === 'noun' || (item.pos === undefined && item.kind === 'word');
}

function describeIssues(label: string, error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${label}: ${path}: ${issue.message}`;
  });
}

function labelFor(entry: unknown, index: number): string {
  if (typeof entry === 'object' && entry !== null && 'id' in entry) {
    return `${String(entry.id)}`;
  }
  return `#${index}`;
}

function checkDraft(
  label: string,
  reviewed: unknown,
  options: ValidateOptions,
  result: ValidationResult,
): void {
  if (reviewed !== null) return;
  const message = `${label}: not reviewed (reviewed: null)`;
  if (options.release) result.errors.push(message);
  else result.warnings.push(message);
}

function checkDuplicateIds(ids: string[], kind: string, result: ValidationResult): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) result.errors.push(`${kind} ${id}: duplicate id`);
    seen.add(id);
  }
}

export function validateItems(data: unknown, options: ValidateOptions): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  if (!Array.isArray(data)) {
    result.errors.push('items: file must contain a JSON array');
    return result;
  }

  const items: Item[] = [];
  data.forEach((entry, index) => {
    const parsed = itemSchema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
    else result.errors.push(...describeIssues(`item ${labelFor(entry, index)}`, parsed.error));
  });

  checkDuplicateIds(
    items.map((item) => item.id),
    'item',
    result,
  );

  const ids = new Set(items.map((item) => item.id));
  for (const item of items) {
    const label = `item ${item.id}`;

    if (isNoun(item) && item.article === undefined) {
      result.errors.push(`${label}: noun has no article`);
    }

    const words = countWords(item.exampleDe);
    const max = MAX_EXAMPLE_WORDS[item.level];
    if (words > max) {
      result.errors.push(
        `${label}: exampleDe has ${words} words, ${item.level} allows at most ${max}`,
      );
    }

    for (const other of item.confusableWith ?? []) {
      if (other === item.id) result.errors.push(`${label}: confusableWith lists itself`);
      else if (!ids.has(other)) result.errors.push(`${label}: confusableWith unknown id ${other}`);
    }

    checkDraft(label, item.reviewed, options, result);
  }

  return result;
}

export function validateScenarios(data: unknown, options: ValidateOptions): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  if (!Array.isArray(data)) {
    result.errors.push('scenarios: file must contain a JSON array');
    return result;
  }

  const ids: string[] = [];
  data.forEach((entry, index) => {
    const parsed = scenarioSchema.safeParse(entry);
    if (!parsed.success) {
      result.errors.push(...describeIssues(`scenario ${labelFor(entry, index)}`, parsed.error));
      return;
    }
    const scenario = parsed.data;
    ids.push(scenario.id);
    checkDuplicateIds(
      scenario.turns.map((turn) => turn.id),
      `scenario ${scenario.id} turn`,
      result,
    );
    checkDraft(`scenario ${scenario.id}`, scenario.reviewed, options, result);
  });

  checkDuplicateIds(ids, 'scenario', result);
  return result;
}

export function validateTopics(data: unknown): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] };
  if (!Array.isArray(data)) {
    result.errors.push('topics: file must contain a JSON array');
    return result;
  }

  const ids: string[] = [];
  data.forEach((entry, index) => {
    const parsed = topicEntrySchema.safeParse(entry);
    if (parsed.success) ids.push(parsed.data.id);
    else result.errors.push(...describeIssues(`topic ${labelFor(entry, index)}`, parsed.error));
  });

  checkDuplicateIds(ids, 'topic', result);
  for (const topic of TOPICS) {
    if (!ids.includes(topic)) result.errors.push(`topic ${topic}: missing`);
  }
  return result;
}
