// Usage: node scripts/validate-content.ts [--release]
// Without --release, drafts (reviewed: null) are warnings. With it, they fail the run.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  validateItems,
  validateScenarios,
  validateTopics,
  type ValidationResult,
} from '../src/content/validate.ts';

const release = process.argv.includes('--release');
const contentDir = fileURLToPath(new URL('../src/content/', import.meta.url));

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(contentDir + file, 'utf8'));
}

const results: [string, ValidationResult][] = [
  ['items.json', validateItems(readJson('items.json'), { release })],
  ['topics.json', validateTopics(readJson('topics.json'))],
];
// scenarios.json ships in Phase 4.
if (existsSync(contentDir + 'scenarios.json')) {
  results.push(['scenarios.json', validateScenarios(readJson('scenarios.json'), { release })]);
}

let errorCount = 0;
let warningCount = 0;
for (const [file, result] of results) {
  for (const warning of result.warnings) console.warn(`warning  ${file}  ${warning}`);
  for (const error of result.errors) console.error(`error    ${file}  ${error}`);
  errorCount += result.errors.length;
  warningCount += result.warnings.length;
}

const mode = release ? 'release' : 'development';
console.log(`Content check (${mode}): ${errorCount} errors, ${warningCount} warnings.`);
process.exit(errorCount > 0 ? 1 : 0);
