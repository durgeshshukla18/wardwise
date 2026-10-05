import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Tailwind arbitrary values (`p-[13px]`, `bg-[#fff]`, `[&>*]:...`) and CSS variable shorthand
// (`p-(--x)`) would let colours and spacing drift from section 7, so they are blocked.
const arbitraryValue = '/\\[|\\(--/';
const arbitraryValueMessage =
  'Tailwind arbitrary values are not allowed. Use a token from docs/03-DESIGN.md.';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=${arbitraryValue}]`,
          message: arbitraryValueMessage,
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${arbitraryValue}]`,
          message: arbitraryValueMessage,
        },
        {
          selector: 'JSXText[value=/\\S/]',
          message: 'No text inside components. Put every user-facing string in src/app/copy.ts.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/] > Literal[value=/\\S/]',
          message: 'No text inside components. Put every user-facing string in src/app/copy.ts.',
        },
      ],
    },
  },
  {
    // The engine is pure: no storage, services, UI or browser, and no hidden clock or randomness.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/data',
                '**/data/**',
                '**/services',
                '**/services/**',
                '**/app/**',
                '**/components/**',
                '**/features/**',
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'react-router',
                'react-router/*',
                'dexie',
              ],
              message: 'src/domain must stay pure. Pass data in as arguments.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...[
          ...new Set([...Object.keys(globals.browser), ...Object.keys(globals.node), 'Date']),
        ].map((name) => ({
          name,
          message: 'src/domain must stay pure. Pass time and other inputs in as arguments.',
        })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Take an rng argument instead.' },
        { object: 'Date', property: 'now', message: 'Take a now argument instead.' },
      ],
    },
  },
  prettier,
);
