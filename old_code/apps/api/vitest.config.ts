import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Generate coverage reports even when tests fail
      // This allows coverage assessment even with test failures
      force: true,
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        '**/config/**',
        '**/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    // E2E tests may need longer timeouts for service connections
    // Individual tests can override with beforeAll(..., 30000)
    include: ['**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
});
