import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Formatting methods can throw when the receiver is undefined/null.
      // Always go through src/utils/formatters.ts so we have consistent null handling.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name=/^(toLocaleString|toLocaleDateString|toLocaleTimeString|toFixed)$/]",
          message:
            'Do not call locale/formatting methods directly. Use formatDate()/formatMoney()/formatNumber()/formatFixed() from src/utils/formatters.ts instead.',
        },
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name='NumberFormat']",
          message:
            'Do not use Intl.NumberFormat directly. Add a helper in src/utils/formatters.ts and use it instead.',
        },
      ],
    },
  },
  {
    files: ['src/utils/logger.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['functions/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/utils/formatters.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
