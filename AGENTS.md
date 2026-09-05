# Daymark agent guide

## Mission

Build a secure, accessible Personal Gemini Journal for the Cloud Run AI Challenge. Preserve the same-origin React and Express architecture, verified Firebase identity boundary, UID-scoped Firestore access, and server-only Gemini integration described in `docs/MASTER_PLAN.md`.

## Non-negotiable boundaries

- The user authorized reviewed, credential-scanned source commits to be pushed to the specified GitHub repository on 2026-09-05. Cloud account access, resource creation, deployment, and public submission remain deferred; deployment also requires Task 12's green release manifest. Never expose credentials.
- Never create or commit service-account JSON, Firebase ID tokens, Gemini keys, `.env` files, private screenshots, or generated dependency/build directories.
- The backend derives the UID from a verified Firebase bearer token. The browser never supplies an authoritative UID, Firestore path, model, system instruction, or generation setting.
- Persist and render plain text only. Validate and sanitize every model response and every external input.
- Preserve default-deny behavior. Do not weaken authentication, tenant-isolation tests, security headers, origin checks, rate limits, or audit gates to make a test pass.
- Use the current Gemini authorization-key flow through Secret Manager; do not use a deprecated standard API key or service-account key file.

## Engineering workflow

1. Read the relevant master-plan task and design section before editing.
2. Add a focused failing test and observe the expected failure.
3. Implement the smallest complete behavior, then make the focused test pass.
4. Run formatting, zero-warning lint, strict type-checking, relevant tests, and the production build.
5. Keep exported types explicit, public symbols documented, modules single-purpose, files under 300 logical lines, functions under 60 logical lines, and cyclomatic complexity at or below 10.
6. Use `AppError`-style stable public errors and structured redacted logs; never log request content, authorization headers, prompts, model responses, or user journal text.

## Commands

- `npm run format:check` checks repository formatting.
- `npm run lint` runs strict, type-aware ESLint with warnings treated as errors.
- `npm run typecheck` checks client, server, configuration, and test TypeScript projects.
- `npm run test:coverage` runs unit and integration tests with 95 percent global thresholds.
- `npm run test:rules` runs Firestore rules tests in the emulator.
- `npm run build` creates client and server production artifacts without source maps.
- `npm run test:e2e` runs browser journeys and accessibility checks.

Keep changes scoped to the active task and preserve unrelated user work in a dirty tree.
