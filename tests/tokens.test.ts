// Checks src/styles against section 7 and 8 by reading docs/03-DESIGN.md directly.
import { describe, expect, it } from 'vitest';

import { readRepoFile, stripTicks, tableRows } from './docs.ts';

const design = readRepoFile('docs/03-DESIGN.md');
const tokensCss = readRepoFile('src/styles/tokens.css');
const indexCss = readRepoFile('src/styles/index.css');
const mainTsx = readRepoFile('src/main.tsx');

function cssVars(css: string, prefix: string): Map<string, string> {
  const vars = new Map<string, string>();
  for (const match of css.matchAll(new RegExp(`(${prefix}[\\w-]+):\\s*([^;]+);`, 'g'))) {
    vars.set(match[1] ?? '', (match[2] ?? '').trim());
  }
  return vars;
}

function propertyRow(name: string): string {
  const row = tableRows(design, 'Property').find((cells) => cells[0] === name);
  if (!row?.[1]) throw new Error(`03-DESIGN.md has no "${name}" row`);
  return row[1];
}

function numbers(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

describe('colour tokens', () => {
  const docColours = new Map(
    tableRows(design, 'Token').map(([token, hex]) => [
      stripTicks(token ?? ''),
      (hex ?? '').toLowerCase(),
    ]),
  );
  const cssColours = new Map([...cssVars(tokensCss, '--')].filter(([name]) => name !== '--shadow'));

  it('defines exactly the colours in the table, with the same hex values', () => {
    expect(docColours.size).toBe(14);
    expect(new Map([...cssColours].map(([k, v]) => [k, v.toLowerCase()]))).toEqual(docColours);
  });

  it('exposes every colour to Tailwind and nothing else', () => {
    const themeColours = [...cssVars(indexCss, '--color-')].map(([name, value]) => [
      name.replace('--color-', '--'),
      value,
    ]);
    expect(themeColours.map(([name]) => name).sort()).toEqual([...docColours.keys()].sort());
    for (const [name, value] of themeColours) expect(value).toBe(`var(${name})`);
  });

  it('writes no colour literal outside tokens.css', () => {
    expect(indexCss).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
  });
});

describe('shadow token', () => {
  it('matches the single shadow in the doc', () => {
    const docShadow = stripTicks(propertyRow('Shadow').match(/`--shadow`: `([^`]+)`/)?.[1] ?? '');
    expect(docShadow).not.toBe('');
    expect(cssVars(tokensCss, '--').get('--shadow')).toBe(docShadow);
    expect([...cssVars(indexCss, '--shadow-')].map(([name]) => name)).toEqual(['--shadow-sheet']);
  });
});

describe('spacing, sizes and radii', () => {
  const spacing = cssVars(indexCss, '--spacing-');

  it('defines the spacing scale exactly, named by pixel value', () => {
    const scale = numbers(propertyRow('Spacing scale').split('px')[0] ?? '');
    expect(scale).toEqual([4, 8, 12, 16, 24, 32, 48]);
    const numeric = [...spacing].filter(([name]) => /^--spacing-\d+$/.test(name));
    // The doc allows 0 where a bar or rail meets an edge. It is the only value beyond the scale.
    expect(numeric.map(([name, value]) => [name, value])).toEqual(
      [0, ...scale].map((n) => [`--spacing-${n}`, `${n}px`]),
    );
    expect(propertyRow('Spacing scale')).toMatch(/except 0/);
  });

  it('uses only component sizes named in the doc', () => {
    const named = [...spacing].filter(([name]) => !/^--spacing-\d+$/.test(name));
    const containers = [...cssVars(indexCss, '--container-')];
    for (const [, value] of [...named, ...containers]) {
      const px = Number(value.replace('px', ''));
      expect(design, `${value} must be named in 03-DESIGN.md`).toMatch(new RegExp(`\\b${px} px`));
    }
  });

  it('defines exactly the three radii from the doc plus full circles', () => {
    const docRadii = numbers(propertyRow('Corner radius')).sort((a, b) => a - b);
    expect(docRadii).toEqual([4, 6, 8]);
    const radii = [...cssVars(indexCss, '--radius-')].map(([, value]) => value);
    expect(radii).toEqual(['4px', '6px', '8px', '9999px']);
    expect(design).toMatch(/px circle/);
  });

  it('uses the breakpoints from section 8', () => {
    const breakpoints = cssVars(indexCss, '--breakpoint-');
    expect(design).toMatch(/\| Tablet \| 768 to 1023 px \|/);
    expect(design).toMatch(/\| Desktop \| 1024 px and up \|/);
    expect([...breakpoints]).toEqual([
      ['--breakpoint-tablet', '768px'],
      ['--breakpoint-desktop', '1024px'],
    ]);
  });
});

describe('typography', () => {
  it('defines exactly the font sizes from the doc', () => {
    const sizesLine = design.split('\n').find((line) => line.startsWith('Sizes in px:')) ?? '';
    const docSizes = [...sizesLine.matchAll(/(\d+) \(/g)].map((match) => `${match[1]}px`);
    expect(docSizes).toEqual(['12px', '14px', '16px', '18px', '22px', '28px', '36px']);
    const sizes = [...cssVars(indexCss, '--text-')].map(([, value]) => value);
    expect(sizes).toEqual(docSizes);
  });

  it('uses the line heights and label tracking from the doc', () => {
    expect(design).toMatch(/Line height 1\.5 for body, 1\.25 for headings/);
    expect(design).toMatch(/letter-spacing 0\.06em/);
    expect(cssVars(indexCss, '--leading-')).toEqual(
      new Map([
        ['--leading-body', '1.5'],
        ['--leading-heading', '1.25'],
      ]),
    );
    expect(cssVars(indexCss, '--tracking-')).toEqual(new Map([['--tracking-label', '0.06em']]));
  });

  it('bundles exactly the fonts and weights in the typography table', () => {
    const rows = tableRows(design, 'Role');
    const expected = rows.flatMap(([, font, weights]) => {
      const pkg = (font ?? '').toLowerCase().replaceAll(' ', '-');
      return numbers(weights ?? '').map((weight) => `@fontsource/${pkg}/${weight}.css`);
    });
    const imported = [...mainTsx.matchAll(/'(@fontsource\/[^']+)'/g)].map((match) => match[1]);
    expect(imported.sort()).toEqual(expected.sort());

    const families = [...cssVars(indexCss, '--font-')]
      .filter(([name]) => !name.startsWith('--font-weight'))
      .map(([, value]) => value.split(',')[0]?.replaceAll("'", ''));
    expect(families.sort()).toEqual(rows.map(([, font]) => font).sort());
  });
});
