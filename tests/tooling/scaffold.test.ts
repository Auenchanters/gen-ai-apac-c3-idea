import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const packageSchema = z.object({
  engines: z.object({ node: z.string() }),
  scripts: z.record(z.string(), z.string()),
  dependencies: z.record(z.string(), z.string()),
  devDependencies: z.record(z.string(), z.string())
});

const readText = async (file: string): Promise<string> => readFile(file, 'utf8');

const readJson = async (file: string): Promise<unknown> => {
  const source = await readText(file);
  return JSON.parse(source) as unknown;
};

describe('production scaffold', () => {
  it('pins the runtime and every direct dependency', async () => {
    const packageJson = packageSchema.parse(await readJson('package.json'));
    const versions = [
      ...Object.values(packageJson.dependencies),
      ...Object.values(packageJson.devDependencies)
    ];

    expect(packageJson.engines.node).toBe('>=22.22.2');
    expect(versions).not.toHaveLength(0);
    expect(versions.every((version) => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version))).toBe(
      true
    );
  });

  it('enables strict compiler and coverage gates', async () => {
    const compiler = await readText('tsconfig.base.json');
    const coverage = await readText('vitest.config.ts');

    for (const option of [
      'exactOptionalPropertyTypes',
      'forceConsistentCasingInFileNames',
      'noImplicitReturns',
      'noUncheckedIndexedAccess',
      'noUnusedLocals',
      'noUnusedParameters',
      'strict'
    ]) {
      expect(compiler).toContain(`"${option}": true`);
    }
    expect(coverage.match(/:\s*95/gu)).toHaveLength(4);
  });

  it('keeps Firestore denied and environment examples empty by default', async () => {
    const rules = await readText('firestore.rules');
    const environment = await readText('.env.example');

    expect(rules).toContain('allow read, write: if false;');
    expect(rules).not.toMatch(/allow\s+(?:read|write)[^;]*:\s*if\s+true/u);
    expect(environment).toContain('GEMINI_API_KEY=');
    expect(
      environment
        .trim()
        .split(/\r?\n/u)
        .every((line) => /^[A-Z][A-Z0-9_]*=$/u.test(line))
    ).toBe(true);
  });

  it('pins the container and CI supply chain', async () => {
    const dockerfile = await readText('Dockerfile');
    const workflow = await readText('.github/workflows/ci.yml');

    expect(dockerfile).toContain('node:22.22.2-bookworm-slim@sha256:');
    expect(dockerfile).toContain('USER node');
    expect(dockerfile).not.toContain('COPY .env');

    const orderedGates = [
      'npm run format:check',
      'npm run lint',
      'npm run typecheck',
      'npm run test:coverage',
      'npm run test:rules',
      'npm run build',
      'npm run test:smoke',
      'gitleaks/gitleaks-action@',
      'npm audit --omit=dev',
      'npm run test:e2e',
      'docker build --tag daymark:ci .'
    ];
    const positions = orderedGates.map((gate) => workflow.indexOf(gate));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });
});
