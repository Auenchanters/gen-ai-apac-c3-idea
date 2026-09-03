# Daymark Requirements Traceability

This matrix turns the binding [Daymark secure journal design](superpowers/specs/2026-09-03-daymark-secure-journal-design.md) into auditable implementation and evidence obligations. The [official Cloud Run AI Challenge codelab](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge?hl=en) supplies the starter directives and challenge baseline; the design is authoritative where Daymark strengthens that baseline.

## Evidence semantics

- **Recorded locally** means a repository artifact exists in the current revision.
- **Specified** means the design names the control, but no passing implementation or external-state claim follows from that.
- **Not recorded** means no acceptable evidence has been captured. It must not be interpreted as passing.
- A model statement, checklist entry, or design paragraph cannot substitute for a test, scan, measured result, or observed cloud configuration.
- Evidence must identify the relevant revision and must not contain credentials, tokens, user content, or private account identifiers.
- Requirement R6 retains the design's phrase “Gemini API key,” but the only acceptable credential type is a current service-account-bound authorization key. The [Gemini key documentation](https://ai.google.dev/gemini-api/docs/api-key) states that Standard keys are rejected in September 2026.

## Current baseline

| Area | Current state |
| --- | --- |
| Security constitution | Recorded locally in [CUSTOM_INSTRUCTIONS.md](ai-studio/CUSTOM_INSTRUCTIONS.md). |
| Design-time threat model | Recorded locally in [THREAT_MODEL.md](ai-studio/THREAT_MODEL.md). |
| AI Studio configuration and first response | Not recorded; follow [SETUP_EVIDENCE.md](ai-studio/SETUP_EVIDENCE.md). |
| Application behavior, automated tests, cloud configuration, and deployment | This matrix makes no implementation or pass claim. Evidence is admitted only as later tasks produce it. |
| Push, publication, and deployment | Intentionally blocked until the local Task 12 release gate passes and the relevant external action is authorized. |

## Product requirements

| ID | Binding requirement | Design and implementation trace | Acceptance evidence | Planned task ownership | Current state |
| --- | --- | --- | --- | --- | --- |
| R1 | Configure Google AI Studio with security-first custom instructions before code generation. | Paste-ready constitution; seven-zone threat model; first-output threat-only protocol; evidence redaction rules. | Versioned [custom instructions](ai-studio/CUSTOM_INSTRUCTIONS.md), [threat model](ai-studio/THREAT_MODEL.md), and dated, sanitized AI Studio configuration plus first-response evidence in [SETUP_EVIDENCE.md](ai-studio/SETUP_EVIDENCE.md). | Task 1 | Local documents recorded; AI Studio configuration and first model response not recorded. |
| R2 | Authenticate with Firebase Google Sign-In. | Firebase Web federated sign-in; fresh bearer token; Firebase Admin verification on each protected request; auth persistence; protected routes; sign-out. No application-managed passwords. | Unit/integration tests for missing, malformed, expired, and valid tokens; client tests for loading, sign-in failure, persistence, token refresh, protected redirect, and sign-out; hermetic browser journey. | Tasks 3, 7, 9, 12 | Specified; runtime evidence not recorded. |
| R3 | Support real multi-turn Gemini conversations. | Server-only `@google/genai` gateway; bounded ordered history; fixed system instruction; approved memories plus current summary and recent messages; allowlisted fallback ladder. | Prompt-assembly and gateway contract tests proving follow-up context, order, bounds, approved-memory inclusion, unapproved-memory exclusion, fallback behavior, deadline, and output ceiling; two-turn browser journey. | Tasks 5, 8, 9, 12 | Specified; runtime evidence not recorded. |
| R4 | Persist prompts, Gemini replies, and summaries in Cloud Firestore. | UID-scoped journal/message/turn repositories; request lease and idempotency; one transaction commits the message pair, summary, metadata, and proposals; retry preserves draft. | Repository and service tests for transaction success, rollback, duplicate request, active/expired lease, server timestamps, history reload, retained draft, and same-request retry. | Tasks 4, 5, 8, 9, 12 | Specified; runtime evidence not recorded. |
| R5 | Prevent cross-user data leakage. | UID derived only from verified token; no UID/path client authority; server-built paths beneath `users/{verifiedUid}`; uniform foreign/missing `404`; owner-bound reads, denied client writes, default-deny rules; recursive deletion. | Two-user negative tests for every journal, turn, memory, Compass, export, and deletion route; path property tests; Firestore Emulator anonymous/foreign/read/write/default-deny tests; sanitized error/log assertions. | Tasks 3, 4, 5, 6, 9, 12 | Specified; isolation evidence not recorded. |
| R6 | Keep the Gemini API key out of source and browser bundles. | Current authorization key only; server-side environment access; Secret Manager numbered-version binding; dedicated runtime identity; no service-account key file or `GOOGLE_APPLICATION_CREDENTIALS`; no browser Gemini call. | Sanitized Key Type observation; environment/public-config tests; Git history, working-tree, bundle, source-map, log, test-artifact, and container scans; Cloud Run secret-binding and IAM metadata. | Tasks 2, 5, 9, 10, 12, 13 | Specified; key type and runtime handling not recorded. |
| R7 | Deploy one container to Cloud Run with the required verification label. | React and Express in one non-root container; public static/sign-in surface with protected APIs; gated idempotent deployment; bounded memory, concurrency, maximum instances, startup CPU boost, health check; exact `dev-tutorial=cloud-run-ai-challenge` label. | Reproducible local image build/run; green release manifest; post-deploy service/revision health, label, service identity, numbered secret, headers, auth boundary, and rollback evidence. | Tasks 2, 10, 12, 13 | Specified; deployment intentionally not performed. |
| R8 | Ship an original enhancement beyond the starter. | Context Contract typed proposals with valid source-message provenance; user-only approve, edit, reject, retire, and delete actions; revision checks; approved-only reuse; private Reflection Compass from caller summaries and approved memories. | State-machine, repository, API, UI, two-user, provenance, stale-revision, prompt-inclusion, Compass-period, empty/error, and end-to-end tests; demonstration evidence. | Tasks 5, 6, 8, 9, 11, 12 | Specified; implementation evidence not recorded. |
| R9 | Be usable, stable, accessible, and production-ready. | Radix Themes and Phosphor only; keyboard/focus semantics; light/dark and reduced motion; accessible status and retry; strict quality rails; resilient generation and persistence; security and container hardening. | Zero-warning lint, strict typecheck, format check, measured coverage, unit/integration/rules/property/React/Playwright/axe suites, build smoke, dependency and secret audits, dead-code/duplication scans, non-root container scan, hostile review, and live checks. | Tasks 2 through 9, 12, 13 | Specified; measured quality evidence not recorded. |
| R10 | Prepare all submission materials. | Public-repository README; architecture/security/testing/accessibility/API docs; walkthrough; screenshot plan; social-post draft; dashboard checklist; only verified claims and known official rules. | Repository and deployed URL verification; rendered README; sub-90-second walkthrough; clean screenshots; `#AccelerateAIwithCloudRun` draft; completed dashboard checklist. Publishing or submitting remains a separate user-authorized action. | Tasks 11 and 13 | Specified; submission evidence not recorded. |

## Challenge-source mapping

| Official codelab expectation | Daymark requirement | Daymark strengthening |
| --- | --- | --- |
| Configure AI Studio Custom instructions before building. | R1 | Versioned constitution, threat-only first response, seven-zone review, evidence redaction, and no remote-configuration claim without observation. |
| Use Firebase Authentication and Google Sign-In rather than application-managed passwords. | R2 | Same-origin bearer-token boundary, Firebase Admin verification on every protected route, and no client-authoritative UID. |
| Provide multi-turn Gemini interaction. | R3 | Deterministic bounded history, fixed server instruction, approved Context Contract memory, schema validation, deadline, and exact fallback policy. |
| Save interactions and summaries in Firestore for each user. | R4 and R5 | Server-only Firestore, atomic pair persistence, idempotency leases, uniform foreign/missing responses, two-user tests, denied client writes, and recursive deletion. |
| Keep the Gemini key in Secret Manager or server environment configuration. | R6 | September 2026 authorization key only, service-account binding, numbered secret revision, dedicated Cloud Run identity, and scans across Git, bundle, logs, and image. |
| Deploy the application to Cloud Run. | R7 | Single non-root container, release-manifest gate, bounded scaling, health and header checks, exact verification label, and rollback evidence. |
| Add unique capabilities beyond the starter journal. | R8 | Context Contract makes model memory attributable, user-approved, editable, rejectable, retireable, deletable, and reusable only with consent; Compass remains tenant-private. |
| Demonstrate authenticity, usability, stability, and security. | R8 and R9 | Original memory contract plus accessibility, resilience, isolation, security, property, browser, and container verification. |
| Share source with a deployment README and public showcase material. | R10 | Submission artifacts distinguish official rules, measured results, planned steps, and actions that still require explicit publication authority. |

## Security control traceability

| Control | Protects | Requirements | Verification |
| --- | --- | --- | --- |
| Verified-token UID derivation | Journal, memory, Compass, export, deletion | R2, R5 | Auth parser tests, protected-route integration tests, two-user negative tests |
| UID-scoped repository paths | Every Firestore record | R4, R5, R8 | Interface review, path property tests, repository isolation tests |
| Default-deny rules and denied client writes | Firestore from browser bypass | R5 | Firebase Emulator suite |
| Fixed system instruction and no model tools | Reasoning boundary and operational systems | R3, R5, R9 | Prompt-injection and unsupported-field tests |
| Structured response validation and sanitizer | Browser, Firestore, future prompts | R3, R4, R8, R9 | Schema, provenance, hostile-output, and rendering tests |
| Context Contract approval and revision state machine | Durable conversational memory | R3, R8 | Transition, stale-write, provenance, and prompt inclusion/exclusion tests |
| Idempotent lease and atomic transaction | Conversation integrity | R4, R9 | Concurrent duplicate, retry, rollback, and retained-draft tests |
| Authorization key plus numbered Secret Manager binding | Gemini credential | R6, R7 | Key Type observation, public-config/bundle scans, deployment metadata |
| Dedicated Cloud Run identity and least privilege | Firestore and secret access | R5, R6, R7 | IAM review and post-deploy service-identity checks |
| Exact-origin, body, rate, and output limits | Sessions, availability, and cost | R5, R9 | Integration, boundary, and load-oriented tests |
| Recursive deletion | User privacy and memory reversibility | R4, R5, R8, R9 | Descendant inspection after journal and account deletion |
| Release manifest and hostile review | All production claims | R7, R9, R10 | Complete Task 12 evidence set with no high or critical finding |

## Requirement dependencies

| Dependent outcome | Must already be true |
| --- | --- |
| A private journal turn can be accepted | R2 authentication and R5 UID isolation are verified. |
| A turn can be reported as saved | R4 atomic persistence and idempotency are verified. |
| A memory can enter future prompts | R8 source provenance, explicit approval, and current revision are verified. |
| Compass can generate a retrospective | R5 tenant isolation and R8 approved-only selection are verified. |
| A Gemini request can run in a release candidate | R6 authorization-key type, server-only handling, secret scans, and deadline/output bounds are verified. |
| Cloud Run deployment can begin | R2 through R9 local gates pass and Task 12 creates a green release manifest. |
| Submission claims can be finalized | R7 live behavior and R9 measured quality evidence exist; R10 materials cite those exact observations. |

## Evidence update discipline

When later work satisfies a requirement:

1. Preserve the binding requirement text and update only trace links, evidence references, and the current-state description.
2. Name the exact test, scan, artifact, commit, or sanitized external observation.
3. Record measured values only after running the named check on the referenced revision.
4. Keep design evidence distinct from implementation evidence and local evidence distinct from cloud evidence.
5. Treat a missing, skipped, flaky, or unverifiable check as not recorded.
6. Reopen requirements affected by any architecture, identity, data-flow, model, third-party service, or retention change.
