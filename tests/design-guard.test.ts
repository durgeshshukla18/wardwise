// Static checks on the source, so no colour, inline style or string slips past the tokens and
// the copy file. The values themselves are checked in tokens.test.ts.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sources = walk('src').filter((path) => /\.(ts|tsx)$/.test(path));
const components = sources.filter((path) => path.endsWith('.tsx'));

describe('design guard', () => {
  it('finds the source files', () => {
    expect(sources.length).toBeGreaterThan(20);
    expect(components.length).toBeGreaterThan(8);
  });

  it('has no colour literal in any source file', () => {
    for (const path of sources) {
      const text = readFileSync(path, 'utf8');
      expect(text, path).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/);
    }
  });

  it('has no inline style on any component', () => {
    for (const path of components) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/\bstyle=/);
    }
  });

  it('keeps user-facing text out of components', () => {
    // Text between tags, or in an aria-label, title, placeholder or alt, belongs in copy.ts.
    for (const path of components) {
      const text = readFileSync(path, 'utf8');
      expect(text, path).not.toMatch(/(aria-label|title|placeholder|alt)="[^"]*\S[^"]*"/);
    }
  });

  it('has no em dash in any source file', () => {
    for (const path of sources) expect(readFileSync(path, 'utf8'), path).not.toContain('—');
  });

  it('has an ESLint rule that rejects text inside components and arbitrary Tailwind values', async () => {
    const eslint = new ESLint();
    const lint = async (code: string) => {
      const [result] = await eslint.lintText(code, {
        filePath: 'src/features/example/Example.tsx',
      });
      return (result?.messages ?? []).map((message) => message.ruleId);
    };
    expect(await lint('export const A = () => <p>Hello</p>;')).toContain('no-restricted-syntax');
    expect(await lint('export const A = () => <p aria-label="Hello" />;')).toContain(
      'no-restricted-syntax',
    );
    expect(await lint('export const A = () => <p className="p-[13px]" />;')).toContain(
      'no-restricted-syntax',
    );
    expect(await lint('export const A = () => <p className="p-16">{copy}</p>;')).not.toContain(
      'no-restricted-syntax',
    );
  });
});
