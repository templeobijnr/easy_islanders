import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
    {
        files: ['**/*.{ts,tsx}'],
        ignores: [
            'node_modules/**',
            'dist/**',
            '.expo/**',
            'android/**',
            'ios/**',
            '*.config.js',
            'babel.config.js',
        ],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
        },
        rules: {
            // Align with web 300-line limit
            'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
            // No console except warn/error
            'no-console': ['error', { allow: ['warn', 'error'] }],
        },
    },
    {
        // Allow console in logger utility
        files: ['**/utils/logger.ts', '**/services/logger.ts'],
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
];
