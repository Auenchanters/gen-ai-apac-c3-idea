import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/firestore/**/*.test.ts'],
    maxWorkers: 1,
    passWithNoTests: false,
    restoreMocks: true,
    sequence: {
      concurrent: false
    }
  }
});
