import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  // Base ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*.backup.ts',
      '**/*backup*.ts',
      '**/*.complex-backup.ts',
      '*.tsbuildinfo',
    ],
  },
  // TypeScript ESLint recommended configs
  ...tseslint.configs.recommendedTypeChecked,
  // Parser options for type-aware linting
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Prettier integration (must be last)
  prettier,
  // Custom rules
  {
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off', // Too strict for existing codebase
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      
      // General rules
      'no-console': 'off', // We use structured logging, but console is acceptable in some contexts
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn',
      'prefer-arrow-callback': 'warn',
      
      // Code quality
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // Best practices
      'no-return-await': 'off', // TypeScript handles this
      '@typescript-eslint/return-await': ['warn', 'in-try-catch'], // Warn instead of error for existing codebase
      'no-await-in-loop': 'warn',
      'require-await': 'off',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-empty-object-type': ['warn', { allowObjectTypes: 'always' }], // Allow {} for flexibility
    },
  },
]);

