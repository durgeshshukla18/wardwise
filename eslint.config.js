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
      ],
    },
  },
  prettier,
);
