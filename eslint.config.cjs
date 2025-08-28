const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');
const globals = require('globals');
const reactRefresh = require('eslint-plugin-react-refresh');

module.exports = tseslint.config(
  {
    ignores: [
      'node_modules', 'dist', 'build', 'apps/api/prisma/dev.db', 'apps/api/prisma/dev.db-journal', 'scratch.ts'
    ],
  },
  
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
    rules: {}
  },
  
  {
    files: ['apps/web/src/components/ui/**/*.{ts,tsx,js}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    files: ['apps/api/**/*.{ts,tsx,js}', '*.cjs', 'apps/**/*.cjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  prettier,

  // Rules for CJS configuration files
  {
    files: ['*.cjs', 'apps/**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-empty-interface': 'off'
    },
  },
);
