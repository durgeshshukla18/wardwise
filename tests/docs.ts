import { readFileSync } from 'node:fs';

export function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

/** Rows of every markdown table in `markdown` whose header row starts with `firstHeader`. */
export function tableRows(markdown: string, firstHeader: string): string[][] {
  const lines = markdown.split('\n');
  const rows: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    const cells = splitRow(lines[i] ?? '');
    if (cells[0] !== firstHeader) continue;
    for (let j = i + 2; j < lines.length && (lines[j] ?? '').startsWith('|'); j++) {
      rows.push(splitRow(lines[j] ?? ''));
    }
  }
  return rows;
}

function splitRow(line: string): string[] {
  if (!line.startsWith('|')) return [];
  return line
    .slice(1, line.endsWith('|') ? -1 : undefined)
    .split('|')
    .map((cell) => cell.trim());
}

export function stripTicks(cell: string): string {
  return cell.replaceAll('`', '');
}
