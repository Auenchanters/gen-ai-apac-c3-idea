import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typedFiles = ['**/*.{ts,tsx}'];
const testFiles = ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}'];

export default tseslint.config(
  {
    ignores: [
      '.firebase/**',
      '.superpowers/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked.map((configuration) => ({
    ...configuration,
    files: typedFiles
  })),
  ...tseslint.configs.stylisticTypeChecked.map((configuration) => ({
    ...configuration,
    files: typedFiles
  })),
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      jsdoc
    },
    rules: {
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { IIFEs: true, max: 60, skipBlankLines: true, skipComments: true }
      ],
      'max-params': ['error', 4],
      'no-console': 'error',
      'no-warning-comments': ['error', { location: 'anywhere', terms: ['todo', 'fixme', 'xxx'] }],
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/require-description': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
            MethodDefinition: true
          }
        }
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { disallowTypeAnnotations: true, fixStyle: 'inline-type-imports' }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true }
      ],
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        { allowNullableBoolean: false, allowNullableObject: false, allowNumber: false }
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error'
    }
  },
  {
    files: ['src/client/**/*.tsx'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      react,
      'react-hooks': reactHooks
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat['recommended-latest'].rules,
      ...jsxA11y.configs.strict.rules,
      'react/jsx-no-leaked-render': 'error',
      'react/no-array-index-key': 'error',
      'react/no-danger': 'error',
      'react/prop-types': 'off'
    },
    settings: {
      react: { version: 'detect' }
    }
  },
  {
    files: ['src/server/**/*.ts', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: testFiles,
    rules: {
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { IIFEs: true, max: 120, skipBlankLines: true, skipComments: true }
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off'
    }
  },
  {
    files: ['**/*.config.{js,mjs}', 'eslint.config.mjs'],
    languageOptions: {
      globals: globals.node
    }
  }
);
