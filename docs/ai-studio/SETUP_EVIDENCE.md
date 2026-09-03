# Google AI Studio Setup Runbook and Evidence

## Evidence boundary

This document separates operator actions that are planned from observations that are already recorded.

As of 2026-09-03, this documentation task prepared the local Daymark constitution, threat model, and traceability matrix. It did **not** open or configure a Google AI Studio app, submit a prompt there, accept Firebase terms, create or inspect a Gemini key, create cloud resources, push Git history, or deploy Daymark. No such external action is claimed below.

## Recorded evidence

| Evidence item | State on 2026-09-03 | Non-sensitive observation |
| --- | --- | --- |
| Paste-ready security constitution | Recorded locally | [CUSTOM_INSTRUCTIONS.md](CUSTOM_INSTRUCTIONS.md) contains the codelab directives expanded for Daymark and the Context Contract. |
| Design-time threat review | Recorded locally | [THREAT_MODEL.md](THREAT_MODEL.md) covers the five codelab zones plus availability/cost and supply chain. It is not represented as AI Studio output. |
| Requirements traceability | Recorded locally | [REQUIREMENTS.md](../REQUIREMENTS.md) maps R1 through R10 to controls and future acceptance evidence. |
| Local Git branch | Observed | `main` was the active branch during this documentation task. |
| Git remote | Observed | `origin` was `https://github.com/Auenchanters/gen-ai-apac-c3-idea.git` during this documentation task. No push was performed. |
| Daymark app created or selected in AI Studio | Not recorded | No AI Studio UI interaction was performed by this documentation task. |
| Custom instructions saved in AI Studio | Not recorded | The local file is ready to paste; local existence is not proof of remote configuration. |
| First AI Studio prompt | Not recorded | No prompt transcript, timestamp, or sanitized screenshot exists yet. |
| First AI Studio threat-summary response | Not recorded | The repository threat model is authored design evidence, not a substitute for this response. |
| Firebase setup terms accepted in AI Studio | Not recorded | Acceptance is a user-visible external action and requires separate evidence. |
| Gemini key type verified as Authorization/Auth | Not recorded | No key was created, viewed, copied, or tested by this documentation task. |
| Cloud resource creation, Firestore rule deployment, Cloud Run deployment, or GitHub push | Intentionally not performed | The production release gate forbids these actions before Task 12 passes. |

## Planned AI Studio configuration runbook

These steps are the procedure for a future operator. They do not become evidence merely because they are written here.

### 1. Prepare a clean, non-sensitive capture

1. Work from a browser profile authorized for the intended Google Cloud project.
2. Confirm the target project in the UI is `gen-ai-apac-c3-idea` without copying the signed-in email address, avatar, billing details, browser session data, or numeric account identifiers into evidence.
3. Read the current repository versions of [CUSTOM_INSTRUCTIONS.md](CUSTOM_INSTRUCTIONS.md), [THREAT_MODEL.md](THREAT_MODEL.md), and [REQUIREMENTS.md](../REQUIREMENTS.md).
4. Confirm the instructions still require a Gemini authorization key. The [current Gemini key documentation](https://ai.google.dev/gemini-api/docs/api-key) says Standard keys are rejected in September 2026.
5. Prepare to capture only the AI Studio app name, UTC timestamp, instruction revision, model label shown by the UI, and a sanitized threat-review result. Do not record credentials or account chrome.

### 2. Create or select the Daymark app

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Under Build, create a new app named Daymark or select the existing Daymark app whose ownership and project association were verified in the UI.
3. Open Settings, locate System instructions, and open Custom instructions.
4. Copy from the `# Daymark Production Directives` heading through the end of [CUSTOM_INSTRUCTIONS.md](CUSTOM_INSTRUCTIONS.md), then paste it into the Custom instructions field.
5. Save the setting.
6. Reopen the field and compare the first heading, all numbered sections, the authorization-key rule, the exact Cloud Run label, and the final scope constraint with the repository copy.
7. Capture a cropped screenshot or textual observation that shows the Daymark app name and enough instruction text to establish that the correct constitution is saved. Exclude account names, email addresses, avatars, project numbers, browser storage, cookies, keys, and URL query parameters.

### 3. Make the first model response a threat review

Submit this as the first prompt in the newly configured app:

> Perform a design-only security review of Daymark before any code generation. Daymark is a private conversational journal using Firebase Google Sign-In, a same-origin React and Express container on Cloud Run, server-verified Firebase ID tokens, UID-scoped server-only Firestore access, server-only Gemini calls, a September 2026 authorization key stored through Secret Manager, and the Context Contract. The Context Contract allows Gemini to propose memories with source message references, but excludes them from future context until the user approves them and lets the user edit, reject, retire, or delete them. Return a Threat Summary Table covering Input Surfaces, Planning and Reasoning, Tool Execution, Memory and State, Inter-System Communication, Availability and Cost, and Supply Chain. For every row include the asset or data flow, abuse scenario, severity, countermeasure, and verification evidence. Then list release-blocking questions. Do not produce application code, file contents, deployment commands, resource mutations, credentials, or private identifiers.

Evaluate the response before continuing:

- The threat table appears before any implementation material.
- All five codelab zones and both Daymark extensions are present.
- Firebase token verification and verified-token UID derivation are explicit.
- Cross-user Firestore reads, writes, existence disclosure, export, Compass, and deletion are addressed.
- The Gemini credential is called an authorization or auth key, is service-account-bound, remains server-only, and is not confused with a Standard key.
- Model output is treated as untrusted structured data.
- Context Contract approval, provenance, reversibility, and approved-only prompt reuse are addressed.
- Verification includes negative tests rather than prose assurances.
- The response contains no code, credential, token, email address, service-account address, private account identifier, or user journal content.

If the response produces code before the threat review, omits a required zone, or contradicts a binding invariant, the Task 1 checkpoint has not passed. Strengthen the saved instruction, create a fresh app or conversation whose first response can be verified, and repeat the threat-only prompt. Record the unsuccessful attempt factually if it is retained; do not relabel it as passing evidence.

### 4. Record the first-response evidence

After a passing response is visible, update the Recorded evidence table with concrete observations only:

1. Record the UTC date and time shown or observed.
2. Record the non-sensitive AI Studio app name and visible model label.
3. Record the Git commit containing the exact instructions that were pasted.
4. State that the Custom instructions field was reopened and compared with that revision.
5. Summarize the response's covered zones and highest-severity findings in original words. A cropped, redacted screenshot may supplement this summary.
6. State whether the response preceded all code-oriented output in that app or conversation.
7. Link only repository-hosted evidence that has passed the redaction checks below.

Do not add empty form fields, provisional values, guessed timestamps, or unverified pass statements. Until concrete evidence exists, keep the state as `Not recorded`.

### 5. Handle Firebase setup terms separately

The [official codelab](https://codelabs.developers.google.com/codelabs/cloud-run/cloud-run-ai-challenge?hl=en) says AI Studio may present Firebase setup terms that must be reviewed and accepted before Firebase Authentication and Firestore setup can continue.

1. Read the terms in the AI Studio prompt.
2. Confirm the Firebase project association in the UI without recording the signed-in account.
3. Accept only through the user-visible control after the terms have been reviewed.
4. Record the UTC time and a sanitized observation of acceptance. Do not record account identifiers, OAuth state, tokens, or browser session details.
5. Keep this evidence distinct from proof that authentication, Firestore rules, and tenant isolation work; those require automated tests later.

### 6. Verify the September 2026 authorization-key requirement

This verification is required before the server can make a release candidate Gemini call:

1. Open the API Keys area of Google AI Studio for `gen-ai-apac-c3-idea`.
2. Inspect the Key Type column. If an existing key is Standard, do not use it.
3. Create a new key through AI Studio when needed. Current AI Studio keys are created as authorization keys bound to a Google Cloud service account.
4. Verify the UI reports the key as Authorization or Auth and shows that it is bound. Record only that type and binding were verified; omit the key value, key identifier, service-account address, project number, and account identity.
5. Transfer the value directly into an approved secret-entry flow. Do not paste it into source, chat, issue text, documentation, screenshots, command arguments, shell history, or CI logs.
6. Later deployment work must store it as `GEMINI_API_KEY` in Secret Manager and bind a numbered version to the Cloud Run revision. That later step remains blocked by the release gate.
7. After server implementation exists, make a server-side smoke request and record only pass/fail, timestamp, model, and sanitized error class. Never record request headers or the key.

## Evidence sanitization rules

Evidence must not contain:

- Gemini authorization-key values or key identifiers;
- Firebase ID tokens, OAuth credentials, cookies, session storage, request headers, or signed URLs;
- email addresses, account names, avatars, service-account addresses, or numeric private account identifiers;
- journal prompts, replies, summaries, Context Contract content, or any other user data;
- raw browser URLs containing query strings or fragments;
- environment-file contents, service-account JSON, Secret Manager payloads, or console output that echoes a secret;
- raw model output that accidentally repeats sensitive input.

Before committing evidence:

1. Crop screenshots to the smallest relevant UI region.
2. Remove account chrome and metadata panels.
3. Review text manually for the prohibited categories above.
4. Run the repository secret scanner and a credential-pattern scan over every new text and image artifact.
5. Inspect the staged diff rather than only the working tree.
6. If a real secret ever entered Git, revoke or rotate it and remove it from history through the approved incident process; deleting the latest line is insufficient.

## Evidence acceptance rules

| Claim | Minimum acceptable proof |
| --- | --- |
| Custom instructions configured | Sanitized, dated observation of the reopened Custom instructions field tied to a Git commit |
| Threat review was first output | Sanitized first-turn transcript summary or cropped capture showing order, plus the instruction revision |
| Threat review passed | Coverage check against all seven zones and Daymark invariants, with contradictions recorded rather than hidden |
| Firebase terms accepted | Dated, sanitized UI observation; this does not prove runtime behavior |
| Authorization key is current | Dated observation that Key Type is Authorization/Auth and a binding exists, with no key or identity copied |
| Tenant isolation works | Two-user API tests and Firestore Emulator tests, not an AI Studio assertion |
| Secret stayed server-only | Configuration review plus Git, bundle, log, and container scans |
| Deployment is compliant | Post-deploy metadata and behavior checks after the release gate, including the exact required label |
