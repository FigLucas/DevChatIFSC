import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
    {
        ignores: ['coverage/**', 'dist/**', 'node_modules/**'],
    },
    eslint.configs.recommended,
    {
        files: ['src/**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
            },
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettierPlugin,
        },
        rules: {
            'no-console': 'warn',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                },
            ],
            'prettier/prettier': ['error', { endOfLine: 'auto' }],
        },
    },
    prettierConfig,
];
