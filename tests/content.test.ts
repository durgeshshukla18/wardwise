import { describe, expect, it } from 'vitest';

import items from '../src/content/items.json';
import topics from '../src/content/topics.json';
import { countWords, isNoun, validateItems, validateTopics } from '../src/content/validate.ts';

const dev = { release: false };
const release = { release: true };

// Fixtures reuse the shipped items so no German is written here.
function itemById(id: string): Record<string, unknown> {
  const found = items.find((item) => item.id === id);
  if (!found) throw new Error(`fixture item ${id} not found`);
  return structuredClone(found) as Record<string, unknown>;
}

describe('shipped content', () => {
  it('has 20 items that pass every check in development mode', () => {
    expect(items).toHaveLength(20);
    const result = validateItems(items, dev);
    expect(result.errors).toEqual([]);
  });

  it('reports every draft as a warning in development mode', () => {
    const result = validateItems(items, dev);
    expect(result.warnings).toHaveLength(20);
  });

  it('fails in release mode while items are drafts', () => {
    const result = validateItems(items, release);
    expect(result.errors).toHaveLength(20);
  });

  it('has no Hindi hints yet', () => {
    expect(items.some((item) => 'hi' in item)).toBe(false);
  });

  it('lists all eight topics once', () => {
    expect(validateTopics(topics).errors).toEqual([]);
  });
});

describe('item rules', () => {
  it('treats a word with no pos as a noun', () => {
    expect(isNoun({ kind: 'word', pos: undefined })).toBe(true);
    expect(isNoun({ kind: 'word', pos: 'adverb' })).toBe(false);
    expect(isNoun({ kind: 'phrase', pos: undefined })).toBe(false);
  });

  it('requires an article on a noun', () => {
    const kopf = itemById('t01-kopf');
    delete kopf.article;
    expect(validateItems([kopf], dev).errors).toEqual(['item t01-kopf: noun has no article']);
  });

  it('requires an article on a word with no pos', () => {
    const kopf = itemById('t01-kopf');
    delete kopf.article;
    delete kopf.pos;
    expect(validateItems([kopf], dev).errors).toEqual(['item t01-kopf: noun has no article']);
  });

  it('does not require an article on a non-noun word', () => {
    const kopf = itemById('t01-kopf');
    delete kopf.article;
    kopf.pos = 'adverb';
    expect(validateItems([kopf], dev).errors).toEqual([]);
  });

  it('limits A1 examples to 6 words and A2 examples to 10', () => {
    const tablette = itemById('t07-tablette');
    expect(countWords(tablette.exampleDe as string)).toBe(7);
    expect(validateItems([tablette], dev).errors).toEqual([]);

    tablette.level = 'A1';
    expect(validateItems([tablette], dev).errors).toEqual([
      'item t07-tablette: exampleDe has 7 words, A1 allows at most 6',
    ]);
  });

  it('rejects duplicate ids', () => {
    const kopf = itemById('t01-kopf');
    expect(validateItems([kopf, kopf], dev).errors).toEqual(['item t01-kopf: duplicate id']);
  });

  it('rejects confusableWith ids that do not exist', () => {
    const kopf = itemById('t01-kopf');
    kopf.confusableWith = ['t99-missing'];
    expect(validateItems([kopf], dev).errors).toEqual([
      'item t01-kopf: confusableWith unknown id t99-missing',
    ]);
  });

  it('rejects fields that are not in the schema', () => {
    const kopf = itemById('t01-kopf');
    kopf.colour = 'blue';
    expect(validateItems([kopf], dev).errors.length).toBeGreaterThan(0);
  });

  it('rejects a Hindi hint that is not Devanagari', () => {
    const kopf = itemById('t01-kopf');
    kopf.hi = 'sir';
    expect(validateItems([kopf], dev).errors).toEqual([
      'item t01-kopf: hi: hi must be written in Devanagari',
    ]);
  });
});
