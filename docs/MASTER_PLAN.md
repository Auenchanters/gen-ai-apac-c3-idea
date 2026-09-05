# Daymark Production Build Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task. Every behavior change follows red-green-refactor and every checkpoint is evidence-based.

**Goal:** Build, secure, verify, document, and prepare Daymark for the Cloud Run AI Challenge. Push reviewed, credential-scanned source milestones as authorized on 2026-09-05; keep Cloud account access and deployment deferred.

**Architecture:** One stateless Cloud Run container serves a code-split React client and an Express backend-for-frontend. Firebase verifies identity; backend repositories derive every Firestore path from the verified UID; Gemini and Firestore remain server-only; Secret Manager injects the Gemini key.

**Tech Stack:** Node.js 22, TypeScript, React, Vite, React Router, Radix Themes, Express 5, Firebase Auth/Admin/Firestore, `@google/genai`, Zod, Vitest, Testing Library, Supertest, Firebase Emulator Suite, fast-check, Playwright, axe, Docker, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-03-daymark-secure-journal-design.md`

## Global constraints

- Target Google Cloud project: `gen-ai-apac-c3-idea` (`379963899770`). Verify with read-only commands before using it.
- Target repository: `https://github.com/Auenchanters/gen-ai-apac-c3-idea.git`; it was empty at planning time.
- Reviewed, credential-scanned source commits may be pushed to the user-specified GitHub repository (authorization updated 2026-09-05). Cloud account access, cloud resource creation, Firestore rule deployment, Cloud Run deployment, and public submission remain deferred. Deployment additionally requires Task 12 to pass.
- Required Cloud Run label: `dev-tutorial=cloud-run-ai-challenge`.
- Gemini primary model: `gemini-3.6-flash`; recoverable fallback sequence: `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.7-flash`.
- The Gemini credential must be an authorization key, not a standard API key. Google documents rejection of standard keys beginning September 2026.
- Use a dedicated runtime service account and Application Default Credentials. Never create a service-account JSON key.
- All production source files remain focused, with explicit exported types, documented public symbols, no unsafe casts, no debug logs, and no unfinished markers.
- The client never sends an authoritative UID, Firestore path, model ID, system instruction, or generation settings.
- Store plain text only. Model output is untrusted until schema validation and sanitization pass.
- Keep the repository free of generated output, environment files, credentials, screenshots containing private data, and dependency directories.
- Treat submission rules absent from the official page as unknown. Do not present assumed limits as organizer rules.

---

## Execution board

### Task 1: Version the plan and secure AI Studio constitution

**Files:**

- Create `docs/ai-studio/CUSTOM_INSTRUCTIONS.md`
- Create `docs/ai-studio/THREAT_MODEL.md`
- Create `docs/ai-studio/SETUP_EVIDENCE.md`
- Create `docs/REQUIREMENTS.md`

**Produces:** A copied-and-versioned set of custom instructions covering the five threat zones, secure coding, authentication, Firestore isolation, secret management, model-output handling, tests, deployment, and the Context Contract.

- [ ] Write the enhanced instructions from the official codelab and the design threat model.
- [ ] Open Google AI Studio, create or select the Daymark app, and paste the instructions before requesting code-oriented output.
- [ ] Ask AI Studio for a threat-summary review of the design and record non-sensitive evidence.
- [ ] Confirm no credential, token, or private account identifier appears in evidence.
- [ ] Initialize Git on `main`, add the empty GitHub repository as `origin`, and commit only planning/evidence artifacts with `docs: define secure Daymark architecture`.

**Checkpoint:** The constitution exists locally and in AI Studio, the first model output is a threat review, and no application source exists yet.

### Task 2: Install the quality rails before features

**Files:**

- Create `package.json`, exact lockfile, TypeScript and Vite configs, ESLint flat config, Prettier config, Vitest configs, Playwright config, `.editorconfig`, `.gitignore`, `.dockerignore`, `.env.example`
- Create `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `.github/dependabot.yml`
- Create `AGENTS.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- Create `Dockerfile`, `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`

**Produces:** Strict build, lint, type, test, coverage, security, and container gates before feature implementation.

- [ ] Pin runtime and development packages exactly and commit one npm lockfile.
- [ ] Configure strict TypeScript including unchecked-index, exact-optional, unused, return, and casing checks.
- [ ] Configure ESLint strict type-aware rules, JSX accessibility, documentation checks, complexity, and file/function size gates; CI treats warnings as errors.
- [ ] Configure coverage thresholds at 95 percent while aiming for 100 percent on deterministic modules.
- [ ] Add CI order: format check, lint, typecheck, unit/integration coverage, rules tests, build, smoke, secret scan, audits, E2E, and container build.
- [ ] Configure Dependabot alerts with zero automatic pull-request branches during the event window.
- [ ] Commit with `chore: establish production quality gates`.

**Checkpoint:** A deliberately failing smoke test can run through the harness, and the repository contains no template residue.

### Task 3: Build the secure server foundation with TDD

**Files:**

- Create `src/server/config/`, `src/server/errors/`, `src/server/middleware/`, `src/server/infrastructure/`, `src/server/app.ts`, `src/server/index.ts`
- Create adjacent unit tests and `src/server/app.integration.test.ts`

**Interfaces:**

- `loadEnvironment(source): ServerEnvironment`
- `authenticateRequest(header): Promise<AuthenticatedUser>`
- `AppError(status, code, safeMessage)`
- `createApplication(dependencies): Express`

- [ ] Write failing tests for crash-fast environment validation and public/private configuration separation.
- [ ] Implement the minimum validated environment loader.
- [ ] Write failing tests for missing, malformed, expired, and valid bearer tokens.
- [ ] Implement Firebase Admin initialization through Application Default Credentials and verified-token authentication.
- [ ] Write failing integration tests for headers, JSON-only POSTs, body limits, origin checks, rate limits, static 404s, redacted errors, health, and `security.txt`.
- [ ] Implement Helmet CSP with no unsafe grants, permissions policy, compression, no-store API caching, structured redacted logging, centralized errors, and graceful shutdown.
- [ ] Commit with `feat(server): add hardened authenticated API foundation`.

**Checkpoint:** Unauthenticated data routes fail closed; health and security metadata return exact expected bodies; logs contain no request content or tokens.

### Task 4: Prove tenant isolation in the persistence layer

**Files:**

- Create `src/server/features/journals/journal-repository.ts`, contracts, Firestore adapter, fake repository, and tests
- Create `src/server/features/privacy/data-lifecycle-service.ts` and tests
- Create `tests/firestore/firestore.rules.test.ts`

**Interfaces:**

- Repository methods accept `uid` as their first argument and validated opaque IDs after it.
- No public method accepts an arbitrary document path.
- `deleteAllUserData(uid)` recursively deletes the caller's hierarchy.

- [ ] Write two-user failing tests for list, load, write, memory update, export, single-journal delete, and account-data delete.
- [ ] Implement UID-scoped repository methods with server timestamps, strict payload construction, cursor bounds, and recursive deletion.
- [ ] Write failing emulator tests proving every browser/client read and write is denied, including authenticated-owner attempts, plus unmatched-path default deny.
- [ ] Implement Firestore rules and indexes until the emulator suite passes.
- [ ] Add property tests proving generated paths cannot escape `users/{verifiedUid}`.
- [ ] Commit with `feat(storage): enforce user-isolated journal persistence`.

**Checkpoint:** User A cannot learn whether User B's resource exists through API behavior or Firestore rules.

### Task 5: Implement resilient Gemini turns with TDD

**Files:**

- Create `src/server/features/generation/` gateway, prompt builder, schemas, sanitizer, fallback policy, and tests
- Create `src/server/features/journals/turn-service.ts` and tests

**Interfaces:**

- `generateJournalTurn(input, signal): Promise<JournalTurnResult>`
- `submitTurn(uid, journalId, request): Promise<CommittedTurn>`

- [ ] Write failing tests for bounded multi-turn history, fixed system instructions, approved-memory inclusion, and unapproved-memory exclusion.
- [ ] Write failing tests for valid output, malformed JSON, fabricated source IDs, HTML/control characters, oversized output, safety refusal, timeout, and recoverable/non-recoverable model errors.
- [ ] Implement the official SDK adapter, primary model, fallback sequence, deadline, output ceiling, structured response schema, validation, and sanitization.
- [ ] Write failing tests for request idempotency, active lease, expired lease recovery, and atomic message-pair persistence.
- [ ] Implement reservation and commit transactions so the UI never reports success before both messages and summary are stored.
- [ ] Commit with `feat(journal): add resilient multi-turn Gemini reflections`.

**Checkpoint:** A dependency failure cannot create a half-saved conversation, leak raw model output, or clear the user's retryable draft.

### Task 6: Implement Context Contract and Reflection Compass

**Files:**

- Create `src/server/features/memory/` state machine, routes, and tests
- Create `src/server/features/compass/` aggregation/generation services, routes, and tests

**Interfaces:**

- `updateMemory(uid, journalId, memoryId, revision, action): Promise<MemoryItem>`
- `buildCompass(uid, period): Promise<ReflectionCompass>`

- [ ] Write failing tests for proposal provenance, approve, edit, reject, retire, stale revision, and foreign-resource behavior.
- [ ] Implement user-authorized memory transitions; Gemini cannot directly approve or modify a confirmed item.
- [ ] Write failing tests that Compass reads only the caller's bounded summaries and approved memories.
- [ ] Implement deterministic topic counts plus an optional structured retrospective call with UID-keyed, short-lived caching.
- [ ] Commit with `feat(memory): add consentful context and private compass`.

**Checkpoint:** Durable memory is inspectable, attributable, reversible, and impossible for the model to change silently.

### Task 7: Build the accessible client shell and authentication

**Files:**

- Create `src/client/app/`, `src/client/features/auth/`, `src/client/lib/`, `src/client/styles/`, and tests
- Create `index.html`
- Add one generated editorial hero asset under `src/client/assets/`

**Interfaces:**

- `AuthProvider` exposes loading, signed-out, signed-in, sign-in, sign-out, and token retrieval states.
- `ApiClient` adds a fresh Firebase token and maps stable server errors without exposing internals.

- [ ] Generate an original Daymark hero illustration with no text or logos.
- [ ] Write failing client tests for auth loading, Google sign-in failure, sign-out, protected redirects, offline configuration, and token refresh.
- [ ] Implement Firebase browser configuration loading and federated sign-in; do not add a password form.
- [ ] Implement the landing page, skip link, theme support, responsive navigation, focus states, and route-level lazy loading.
- [ ] Verify the landing composition at phone and desktop sizes in light and dark modes.
- [ ] Commit with `feat(web): add accessible Firebase sign-in experience`.

**Checkpoint:** The public bundle contains only documented Firebase public configuration and no operational secret.

### Task 8: Build the complete journal experience

**Files:**

- Create `src/client/features/journal/`, `history/`, `memory/`, `compass/`, `privacy/`, and tests

- [ ] Write failing tests for journal creation, multi-turn messages, pending state, confirmed save, retained draft on failure, same-request retry, and model refusal.
- [ ] Implement the Today conversation with semantic messages, bounded composer, accessible status announcements, and retry.
- [ ] Write failing tests for history loading/empty/error states, topic and date filters, and delete confirmation.
- [ ] Implement history and journal detail routes.
- [ ] Write failing tests for Context Contract approval/edit/retire and Compass periods/empty/error states.
- [ ] Implement the memory side panel and Compass route using real persisted data.
- [ ] Write failing tests for export and destructive data deletion confirmation.
- [ ] Implement the Privacy route with plain-language retention and safety statements.
- [ ] Commit with `feat(web): complete private journal and context controls`.

**Checkpoint:** Every visible action has a loading, success, empty, error, keyboard, and retry path.

### Task 9: Complete end-to-end and resilience verification

**Files:**

- Create `tests/e2e/`, test-only dependency adapters, and build smoke scripts
- Update CI configuration

- [ ] Build a hermetic browser journey with fake network dependencies at the test boundary, never a production auth bypass.
- [ ] Cover sign-in state, new journal, two turns, reload/history, memory approval, Compass, export, delete, sign-out, and axe scans.
- [ ] Add API full-journey and concurrent duplicate-request tests.
- [ ] Add post-build smoke checks for response bodies, MIME types, CSP, hashed-asset caching, HTML no-cache, and SPA fallback.
- [ ] Add bundle scans for secrets, source maps, service-account material, debug residue, and unsafe HTML execution.
- [ ] Commit with `test: cover the authenticated journal journey`.

**Checkpoint:** Tests exercise behavior through public interfaces and fail when isolation, persistence, or accessibility is deliberately broken.

### Task 10: Production deployment and observability artifacts

**Files:**

- Create `scripts/deploy-cloud-run.ps1`, `scripts/verify-deployment.ps1`, and `scripts/preflight.ps1`
- Create `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, and `docs/decisions.md`
- Finalize `Dockerfile` and container health behavior

- [ ] Encode API enablement, dedicated service account, least-privilege IAM, authorization-key validation guidance, numbered secret binding, Firebase/Firestore setup checks, bounded Cloud Run settings, and mandatory label in an idempotent deployment script.
- [ ] Make the script stop before mutation unless the exact project/account/region are confirmed and the local release manifest is green.
- [ ] Add post-deploy checks for label, service identity, secret binding metadata, headers, body signatures, auth protection, and revision health.
- [ ] Document rollback, secret rotation, quota/cost controls, incident response, data deletion, and judging-window availability.
- [ ] Build and run the image locally as the non-root user.
- [ ] Commit with `ops: add gated Cloud Run release workflow`.

**Checkpoint:** Deployment is reproducible, least-privileged, labeled, reversible, and still has not been executed publicly.

### Task 11: Make quality and submission evidence legible

**Files:**

- Create `README.md`, `docs/ARCHITECTURE.md`, `docs/CODE-QUALITY.md`, `docs/TESTING.md`, `docs/ACCESSIBILITY.md`, `docs/SECURITY-CHECKLIST.md`, `docs/API.md`
- Create `docs/submission/DEMO_SCRIPT.md`, `SOCIAL_POST.md`, `DASHBOARD_CHECKLIST.md`, `SCREENSHOT_PLAN.md`

- [ ] Add the exact problem-statement traceability table and evaluation map.
- [ ] Include `Chosen Vertical`, `Approach and Logic`, `How the Solution Works`, and `Assumptions Made` headings while identifying unconfirmed organizer rules honestly.
- [ ] Diagram each load-bearing Google service and point to its implementation file.
- [ ] Record only measured coverage, audit, accessibility, performance, image-size, and test-count values.
- [ ] Write a sub-90-second demo flow that visibly proves auth, two-turn context, persistence, isolation explanation, Context Contract, Compass, and privacy controls.
- [ ] Prepare a public social post draft using `#AccelerateAIwithCloudRun` and a dashboard completion checklist without publishing either.
- [ ] Commit with `docs: prepare verifiable challenge submission`.

**Checkpoint:** A reviewer can map every challenge requirement and quality claim to code, tests, or a live-verification step in under one minute.

### Task 12: Blocking security and production release gate

**Files:**

- Update evidence documents only with real results
- Create `release-manifest.json` after all checks pass

- [ ] Run format, zero-warning lint, strict typecheck, full coverage, rules emulator, browser tests, accessibility scans, production build, build smoke, dead-code, duplication, secret, dependency, and container scans.
- [ ] Inspect the two largest source files and refactor if either lacks one clear responsibility.
- [ ] Run a fresh-context code-quality review and a separate security red-team review; resolve every high/critical issue and every score below 95.
- [ ] Verify Git history and generated bundle contain no secret, environment file, service-account material, private screenshot, or dependency output.
- [ ] Confirm the repository is small, clean, on one intentional branch locally, and that the remote is still the exact user-provided empty target.
- [ ] Generate the signed-off local release manifest with tool versions, commit, artifact digest, and check results.
- [ ] Commit with `chore: certify production release candidate`.

**Checkpoint:** Only a completely green manifest unlocks Task 13. Any red or unverifiable claim blocks release and is reported plainly.

### Task 13: Release, verify, and finalize submission

**Precondition:** Task 12 is green. This task is intentionally unreachable before then.

- [ ] Re-verify the active Google identity and exact target project without displaying tokens or secrets.
- [ ] Run the gated deployment script and capture non-sensitive output.
- [ ] Verify the live revision body, authentication boundary, headers, service identity, numbered secret binding, Firestore behavior, and required label.
- [ ] Run live Playwright, axe, and Lighthouse checks; feed measured results back into documentation.
- [ ] Push the verified commit to the user-provided GitHub repository and verify the remote commit, rendered README, workflow status, visibility, branch list, and repository size.
- [ ] Capture clean submission screenshots and finalize the demo script, social post, and dashboard checklist with the real URLs.
- [ ] Do not publish the social post or submit the dashboard form without the user's explicit instruction because those actions speak publicly on the user's behalf.

**Done:** The live Cloud Run URL, public repository, social-post draft, and dashboard checklist are complete, verified, and ready for the user's final public-post and submission actions.
