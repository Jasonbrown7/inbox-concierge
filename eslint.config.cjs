const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules', 'dist', 'build', 'apps/api/prisma/dev.db', 'apps/api/prisma/dev.db-journal', 'scratch.ts'
    ],
  },
  
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [
          './apps/api/tsconfig.json',
          './apps/web/tsconfig.json',
          './packages/shared/tsconfig.json'
        ],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {}
  },

  {
    files: ['apps/api/**/*.{ts,tsx,js}', '*.cjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  prettier,
  // TODO: add prettier rules
  {
    rules: {
      // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  
  // Rules for CJS configuration files
  {
    files: ['*.cjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
