// @ts-check
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const path = require('path');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // ── Files to ignore ────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // ── TypeScript source files ─────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Enables type-aware linting rules (requires tsconfig.json)
        project: './tsconfig.json',
        tsconfigRootDir: path.resolve(__dirname),
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // ── Core ESLint rules ──────────────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',

      // ── @typescript-eslint — basic rules ───────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // ── @typescript-eslint — type-aware rules ──────────────────────────────
      // These rules require `parserOptions.project` to be set above.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',

      // ── Rules already enforced by the TS compiler ──────────────────────────
      'no-undef': 'off',
    },
  },
];
