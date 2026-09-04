# Daymark Threat Model

## Document status

| Field | Value |
| --- | --- |
| System | Daymark private conversational journal |
| Review date | 2026-09-03 |
| Authority | [Daymark secure journal design](../superpowers/specs/2026-09-03-daymark-secure-journal-design.md) |
| Method | Scenario-driven review using the five zones from the [official codelab](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge?hl=en), expanded with availability/cost and supply-chain risks |
| Control state | Design requirements only; this document does not claim that application or cloud controls are implemented |

## Scope and assumptions

In scope are the browser application, Firebase Google Sign-In, the same-origin Cloud Run React and Express container, Firebase Admin token verification, Cloud Firestore, Secret Manager, the Gemini API, source control, CI, container construction, logs, data export, and recursive deletion.

The first release has no uploads, web browsing, model tools, arbitrary URL fetching, analytics, advertising, sharing, external notifications, administrator dashboard, or cross-origin frontend. Adding any of them changes the attack surface and requires a new threat review before implementation.

The Cloud Run endpoint is intentionally public so static content and sign-in can load. Public reachability does not make private APIs public: every journal, memory, Compass, export, deletion, and generation route requires a valid Firebase ID token.

The Context Contract governs whether a proposed memory may be reused as durable conversational context. It does not replace the user's explicit journal-save action: prompts, replies, and summaries are persisted as the journal record under requirement R4.

## Assets and data classification

| Asset | Classification | Handling rule |
| --- | --- | --- |
| Gemini authorization key | Secret | Server-only; numbered Secret Manager version; never source, browser, logs, screenshots, transcripts, or shell history |
| Firebase ID token, OAuth state, cookies | Secret, short-lived | Firebase-managed browser session state only; Daymark application/server code never persists or logs them elsewhere; transport only over HTTPS; verify ID tokens server-side; sign-out or browser-session close clears the chosen session persistence |
| Journal prompts and replies | Highly sensitive user content | UID-scoped storage; bounded model use; no content logging; export/delete only for verified owner |
| Summaries, themes, next steps, Compass | Sensitive derived content | Same isolation as source journal; model output validated and sanitized |
| Context Contract proposals and approved memories | Sensitive durable context | Provenance required; approval controls reuse; revisioned edit/retire/delete |
| Account and service-account identifiers | Sensitive metadata | Use only where operationally necessary; omit from committed screenshots and AI Studio evidence |
| Firebase browser configuration and Cloud Run URL | Public configuration | May be served to the browser; never confuse with operational credentials |
| Source, lockfile, deployment metadata | Public at submission | Secret-scanned; reproducible; no private environment files or generated credentials |

## Actors

- The journal owner, authenticated through Firebase.
- An anonymous internet user probing the public service.
- A hostile authenticated user attempting to access another tenant.
- A prompt author attempting to redirect Gemini or corrupt durable context.
- Gemini, whose output is probabilistic and untrusted.
- A dependency or build artifact that may be vulnerable or tampered with.
- A project operator with legitimate cloud access who may make a configuration mistake.

## Trust boundaries and data flows

| Boundary | Data crossing it | Required enforcement |
| --- | --- | --- |
| Browser to Firebase Authentication | Google sign-in flow and Firebase ID token | Firebase-hosted federated flow; `browserSessionPersistence`; no application-managed passwords or application-managed token storage |
| Browser to Cloud Run | Public config, bearer token, journal input, route IDs, actions | HTTPS, exact origin, body limit, Zod schemas, verified token, per-UID rate limit |
| Express route to domain/repository | Verified UID, validated opaque IDs, validated commands | UID passed explicitly as the first repository argument; no arbitrary path API |
| Cloud Run to Firestore | UID-scoped records and transactions | Dedicated runtime identity, least privilege, server-constructed paths, bounded reads |
| Cloud Run to Gemini | Fixed instruction, approved memories, bounded summary/history, current input | Server-only authorization key, model allowlist, deadline, structured schema, output limit |
| Secret Manager to Cloud Run revision | `GEMINI_API_KEY` value | Numbered version binding and secret-level accessor grant |
| Application to Cloud Logging | Stable event metadata and redacted errors | No tokens, keys, message text, prompts, raw headers, raw model output, or private identifiers |
| Developer or CI to repository/container | Source, tests, configuration, artifacts | Exact dependencies, secret and bundle scans, minimal CI permissions, no environment files |

## Security invariants

1. A UID becomes authoritative only after Firebase Admin verifies the request token.
2. Every private Firestore path begins with `users/{verifiedUid}` and is constructed on the server.
3. A foreign resource and a missing resource are externally indistinguishable.
4. Gemini and Firestore are server-only; every journal or derived-data read and write goes through the verified same-origin backend, and the browser cannot choose a model, system instruction, safety setting, UID, or data path.
5. A Gemini authorization key is never shipped to the browser or stored in Git, and a Standard key is invalid as of September 2026.
6. Model output is data, not authority: schema validation, provenance validation, sanitization, and length limits precede storage or rendering.
7. A model-proposed memory is excluded from future context until the user approves it; only the user can change durable memory state.
8. A successful turn means the complete user/model pair and derived state committed atomically.
9. Data deletion is recursive and owner-authorized.
10. Missing release evidence blocks deployment; a prose assertion cannot replace a test or recorded observation.

## Threat register

Risk ratings describe the unmitigated design risk. Controls and evidence are required outcomes, not statements of current implementation.

### Zone 1: Input surfaces

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| IN-01 | High | An attacker sends an oversized or deeply nested body to exhaust memory or block request handling. | JSON-only mutation routes, global body ceiling, per-field and collection limits, early rejection, request deadline. | Integration tests for content type, maximum body, nesting, and stable `413` or `400` responses. |
| IN-02 | Critical | A forged UID, document path, slash-containing ID, or unknown field escapes the caller's tenant. | Closed Zod schemas, opaque UUID route IDs, ignore no unknown ownership field, server-built paths from verified UID only. | Property tests for path containment and two-user negative tests for every resource route. |
| IN-03 | High | HTML, script-like text, or control characters are stored and later executed or corrupt the interface. | Plain-text storage, React escaping, model-output sanitizer, control-character policy, no unsafe HTML rendering. | Unit/property sanitizer tests and browser tests using hostile stored text. |
| IN-04 | High | A journal entry instructs the model to reveal its system prompt, bypass safety, or treat user text as higher-priority policy. | Fixed server instruction, explicit trust hierarchy, no model tools, structured response contract, refusal to disclose hidden instructions. | Prompt-injection contract tests that assert bounded, schema-valid responses and no instruction disclosure. |
| IN-05 | High | Repeated valid prompts consume quota or create excessive cost. | Authenticated per-UID rate limits, input cap, bounded history, output cap, deadline, instance cap. | Rate-limit tests and deployment-setting verification. |

### Zone 2: Planning and reasoning

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| PR-01 | Critical | Gemini follows hostile content embedded in history or stored memory as if it were a system instruction. | Delimit untrusted content as data, fixed instruction first, include only approved memories, no tool access, schema validation. | Prompt-assembly tests covering hostile messages and memory text. |
| PR-02 | Critical | Gemini invents a source message ID and creates an apparently attributable memory. | Validate every proposed source ID against the authorized journal window before persistence; reject the full malformed response. | Generation tests for fabricated, foreign, missing, and duplicate source IDs. |
| PR-03 | Critical | A proposed fact becomes permanent context without informed user approval. | Explicit proposal state, user-only approve/edit/reject/retire/delete actions, approved-only prompt inclusion, visible provenance. | State-machine, UI, and end-to-end tests for every transition and exclusion rule. |
| PR-04 | High | A stale edit overwrites a newer user decision or the model modifies a confirmed memory. | Monotonic revision, compare-and-set update, action allowlist, no model path to confirmation. | Concurrency tests for stale revisions and adapter tests proving model results can only propose. |
| PR-05 | High | Reflective output diagnoses, coerces, encourages dependency, or mishandles imminent danger. | Safety-focused system instruction, no professional-authority claims, crisis-oriented escalation wording, refusal and blocked-model UI states. | Safety scenario tests and human review of representative responses. |
| PR-06 | Medium | A summary silently drops nuance and later bounded history treats it as fact. | Separate summaries from approved memories, label derived content, retain source messages, allow journal deletion, use bounded recent messages. | Prompt-builder tests and UI copy review. |

### Zone 3: Tool execution

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| TE-01 | Critical | Gemini or browser code retrieves a secret or calls Gemini directly, exposing the key. | No model tools, no browser Gemini SDK call, server-only environment access, bundle and container scans. | Built-asset scan and tests that public config excludes `GEMINI_API_KEY`. |
| TE-02 | Critical | Attacker-controlled URLs or tool names trigger SSRF, arbitrary network access, or code execution. | No URL-fetching tools, uploads, dynamic execution, or shell calls in first release; allowlist any future integration after review. | Static review plus negative route/schema tests showing unsupported fields are rejected. |
| TE-03 | High | The browser selects a costly model, weakens safety, or expands output limits. | Server-owned model ladder, schema, safety settings, deadline, and output ceiling; reject unknown client generation settings. | API tests with injected model/safety/system fields. |
| TE-04 | High | A server function performs an operation before authorization or with a raw client path. | Authenticate before lookup, domain methods accept verified UID and validated IDs, no public arbitrary-path method. | Boundary tests and code review of every repository interface. |

### Zone 4: Memory and state

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| MS-01 | Critical | User A reads, changes, exports, summarizes, or deletes User B's data by guessing IDs. | Verified-token UID only, UID-scoped repositories, uniform `404`, no existence oracle, server-side Firestore. | Two-user tests for list, load, turn, memory, Compass, export, journal delete, and account delete. |
| MS-02 | Critical | A browser bypasses the API to read or write Firestore directly, including its authenticated owner's path. | Firestore default deny for every browser/client read and write; every journal and derived-data operation uses the verified same-origin backend; server/Admin code still derives the UID from the verified token and constructs only UID-scoped paths because Admin bypasses rules. | Emulator tests denying anonymous and authenticated-client reads and writes, including owner-path attempts, plus unmatched-path deny. |
| MS-03 | High | Concurrent or retried requests save duplicates or split a user/model pair. | Unique request ID, short reservation lease, completed-result replay, transaction for pair and metadata. | Tests for active lease, expired-lease recovery, simultaneous duplicate requests, and transactional rollback. |
| MS-04 | High | A database failure clears the draft or UI reports success despite incomplete persistence. | Confirm transaction before success; preserve draft and request ID; accessible retry; sanitize database errors. | Client and service tests for each failure point. |
| MS-05 | Critical | Deleting a parent leaves message, turn, or memory subcollections behind. | Enumerated recursive deletion for one journal and the complete user hierarchy; bounded batch/retry behavior. | Repository tests that inspect all descendant collections after deletion. |
| MS-06 | High | Compass combines foreign or unapproved data and reveals another tenant's content. | Read only caller's bounded summaries and approved memories; UID-keyed, short-lived cache. | Two-user Compass tests and tests excluding proposed, rejected, and retired memories. |

### Zone 5: Inter-system communication

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| IC-01 | Critical | Bearer tokens, cookies, prompts, or authorization keys enter logs or error responses. | Redaction allowlist, no request-body logging, stable safe errors, no raw dependency output. | Log-capture tests using sentinel secrets and secret scans over artifacts. |
| IC-02 | High | Permissive CORS or origin handling enables an attacker-controlled site to invoke authenticated actions. | Same-origin API, exact origin allowlist, no wildcard with credentials, secure browser auth handling. | Origin integration tests for accepted, missing, and hostile origins. |
| IC-03 | Critical | A long-lived service-account file or broad default identity grants excessive access. | Dedicated user-managed runtime identity, ADC, no service-account key files, minimum Firestore permissions, secret-level accessor grant. | Deployment metadata check, IAM review, repository/container key-file scan. |
| IC-04 | Critical | A deprecated Standard Gemini key causes outage or weaker identity controls. | AI Studio-created authorization key bound to a service account; verify key type; reject Standard keys; rotation runbook. | Sanitized AI Studio evidence recording only key type, plus a server-side smoke call without disclosing the value. |
| IC-05 | High | Secret Manager exposes a moving or unintended value at deploy time. | Bind a numbered secret version, verify revision metadata, rotate through a new version and revision, never echo the value. | Post-deploy metadata inspection and rotation rehearsal output. |
| IC-06 | High | Raw Gemini or Firestore errors expose implementation, identifiers, or user data. | Dependency error mapping, redacted structured logs, stable client codes, no stack traces in production. | Integration tests with hostile fake dependency errors and response/log assertions. |

### Zone 6: Availability and cost

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| AC-01 | High | A prompt or history grows without bound, increasing latency and token spend. | Explicit input, summary, message-window, collection, and output limits. | Boundary tests for every limit and prompt-size assertions. |
| AC-02 | High | A model outage or throttling creates retry storms or an unusable journal. | One deadline, bounded fallback ladder, retry only four recoverable conditions, accessible retry, no infinite loops. | Fake-gateway tests for each recoverable and non-recoverable outcome. |
| AC-03 | Medium | Cold starts or unhealthy revisions disrupt judging and ordinary use. | Health endpoint, startup CPU boost, bounded container startup, optional minimum instance during a declared judging window. | Container smoke test and deployment health evidence. |
| AC-04 | High | Unlimited Cloud Run scale or abusive callers create unexpected cost. | Maximum instances, bounded concurrency/memory, per-UID limits, quota monitoring, documented incident response. | Deployment configuration inspection and rate-limit/load checks. |
| AC-05 | Medium | Large exports, listings, or recursive deletion monopolize resources. | Cursor pagination, record ceilings, bounded batches, deadlines, retry-safe deletion. | Repository and API boundary tests with maximum-size fixtures. |

### Zone 7: Supply chain

| ID | Risk | Abuse scenario and impact | Required controls | Required evidence |
| --- | --- | --- | --- | --- |
| SC-01 | High | Floating or compromised dependencies change behavior between builds. | Exact versions, one committed lockfile, lockfile-respecting install, minimal dependencies, automated audit. | Clean reproducible install and dependency audit output. |
| SC-02 | Critical | Credentials or private artifacts enter Git history, browser assets, CI logs, or the image. | Ignore environment/generated files, gitleaks, bundle scan, history scan, container scan, no private screenshots. | Release-gate scan results over history, working tree, build, and image. |
| SC-03 | High | CI has write privileges or creates unsolicited event branches. | Least-privilege workflow permissions, pinned actions, CodeQL, Dependabot alerts without automatic event-window pull requests. | Workflow review and repository security-setting evidence. |
| SC-04 | High | The container runs as root or contains unnecessary build tools and source maps. | Multi-stage minimal image, non-root runtime, no source maps, deterministic build, image vulnerability scan. | Image metadata, runtime identity check, contents scan, and vulnerability report. |
| SC-05 | Medium | Template code, debug flags, dead code, or duplicated security logic bypasses the intended boundary. | Focused modules, no debug residue, dead-code and duplication scans, fresh-context review. | Quality-gate output and code-review report. |

## High-value abuse cases

| Abuse case | Expected secure result |
| --- | --- |
| Anonymous caller posts a turn | Authentication fails before resource lookup or Gemini use. |
| User A requests User B's known journal ID | Response matches the absent-resource `404`; no metadata or timing-sensitive detail is exposed. |
| Client sends User B's UID in JSON | Closed schema rejects it or ignores no ownership field; repository still uses User A's verified UID. |
| Prompt asks Gemini to reveal policy and approve a memory | No hidden instruction is disclosed; output can only contain a validated proposal; future context excludes it. |
| Gemini returns HTML, control characters, oversized fields, or a fabricated source ID | The entire response is rejected or sanitized according to the field contract before storage and rendering. |
| Network failure occurs after a user submits | No half-turn is committed, the draft remains, and retry reuses the request ID. |
| The same request arrives concurrently | At most one generation/commit wins; later callers receive the stable stored result or an active-lease response. |
| User deletes an account | Journals and all descendant messages, turns, and memories are removed through verified recursive deletion. |
| A Standard Gemini key is selected | Configuration is rejected as release-blocking; no deployment proceeds. |
| A dependency emits a credential-like error string | Client response is sanitized and structured logs contain no sentinel value. |

## Required release evidence

The following evidence is blocking. Absence is a failed gate, not an accepted residual risk:

1. AI Studio instructions and first threat-only response recorded without secrets or private account identifiers.
2. Firebase authentication and protected-route tests.
3. Two-user negative API tests for every resource operation.
4. Firestore Emulator tests denying every browser/client read and write, including authenticated-owner attempts, plus unmatched-path default deny.
5. Gemini schema, sanitizer, prompt-injection, provenance, deadline, and fallback tests.
6. Context Contract proposal, approval, edit, rejection, retirement, deletion, provenance, and stale-revision tests.
7. Transaction, idempotency, retry, and recursive-deletion tests.
8. Secret, Git history, browser bundle, source-map, service-account material, and container scans.
9. Accessibility, browser journey, build smoke, dependency audit, and non-root container checks.
10. Cloud Run service identity, numbered secret binding, bounded scaling settings, health, and exact `dev-tutorial=cloud-run-ai-challenge` label verification.

## Residual risks and user-visible truths

- Users may enter highly sensitive text. Daymark sends the bounded content needed for a requested reflection to Gemini and stores the journal in Firestore; the product must disclose this plainly.
- Cloud administrators with sufficient legitimate privilege remain capable of accessing service configuration or stored data. Least privilege, auditability, and key rotation reduce but do not eliminate this trust.
- Secret Manager protects distribution and rotation; the running server process still needs access to the Gemini authorization key.
- Gemini can be inaccurate or refuse a request. Structured validation and the Context Contract limit persistence and reuse but do not make model statements true.
- Owner-only access is application isolation, not end-to-end encryption. The product must not advertise stronger privacy than the architecture provides.
- Retention is indefinite until deletion in the first release. Export and recursive deletion must remain visible and usable.
- Immediate-danger guidance is a safety response, not medical care or an emergency service.
