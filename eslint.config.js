import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // reference/ is read-only input and docs/ is the spec (HANDOFF §4.1); baselines are generated
  globalIgnores([
    'dist',
    'coverage',
    'reference',
    'docs',
    'e2e/visual/__baseline__',
    'playwright-report',
    'test-results',
    'fonts-src',
  ]),
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
]);
