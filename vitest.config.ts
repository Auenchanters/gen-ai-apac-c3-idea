import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/tooling/**/*.test.ts'
    ],
    passWithNoTests: false,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/**/index.ts'],
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      }
    }
  }
});
