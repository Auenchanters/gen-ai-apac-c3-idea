# Daymark: a secure Personal Gemini Journal

*Walkthrough article for the Cloud Run AI Challenge*

## The idea

Most AI demos stop at a chat box. Daymark treats a journal as private data that needs a clear boundary, an audit trail, and an undo button. The app helps a person think through a decision or a difficult day with Gemini, then saves a concise summary and a possible next step.

The important rule is simple: Gemini can suggest memory, but it cannot silently keep it.

## What the walkthrough shows

1. The signed-out landing screen explains the privacy model and starts Google sign-in.
2. A signed-in user creates a journal and chooses a reflection tone: gentle, practical, or curious.
3. The user sends an entry. Gemini receives bounded conversation history and returns a structured reply, summary, themes, next step, and optional memory proposals.
4. The user opens the Context Contract panel. Each proposal shows its type and the source text that led to it. Approve, edit, reject, retire, or delete are explicit actions.
5. History reloads the saved conversation. Reflection Compass counts themes and shows only approved memories for the selected 7-day or 30-day period.
6. Privacy provides a JSON export and a typed `DELETE` confirmation for recursive account-data deletion.

## Security boundary

Firebase Auth handles Google identity in the browser with session-scoped persistence. The browser sends a fresh Firebase ID token to the same-origin Express backend. Firebase Admin verifies the token, including revocation, and the backend derives the UID. Client payloads never choose a UID, Firestore path, Gemini model, system prompt, or generation setting.

Firestore records are stored beneath `users/{verifiedUid}`. The repository accepts a verified UID and validated opaque UUIDs, not arbitrary paths. Browser Firestore reads and writes are denied by default because all data access goes through the server boundary. API responses strip leases, deletion tombstones, and other coordination fields.

Gemini is server-only. The gateway uses the official `@google/genai` SDK, an allowlisted model ladder, a deadline, structured JSON validation, plain-text sanitization, and provenance checks. A Firestore transaction reserves the turn and enforces a per-user quota; the user message, Gemini reply, summary, and memory proposals are committed together. If generation fails, the draft remains available and no half-saved turn is reported.

## Google Cloud design

The production shape is one stateless Cloud Run container serving the React client and Express backend. Firebase Authentication supplies identity, Firestore supplies UID-scoped persistence, Gemini supplies the reflection, and Secret Manager supplies a numbered revision of the service-account-bound Gemini authorization key. Cloud Run receives the secret binding at runtime and uses Application Default Credentials for Firebase Admin. No service-account JSON file is required.

The deployment plan includes bounded concurrency and instance limits, HTTPS-only production origins, security headers, redacted structured logs, and the challenge verification label `dev-tutorial=cloud-run-ai-challenge`.

## Why Context Contract matters

AI memory is useful only when it is legible. A proposed memory keeps its source message IDs and a revision. Approval is a user action. Editing preserves provenance. Retirement stops reuse without rewriting history. Deletion removes the item. This makes durable context inspectable, attributable, and reversible.

## Repository and verification

The public source repository is:

<https://github.com/Auenchanters/gen-ai-apac-c3-idea>

The repository includes strict TypeScript, zero-warning lint, unit and API integration tests, Firestore rules tests, browser accessibility checks, production build checks, a non-root Dockerfile, release documentation, and a submission checklist. Cloud account setup and deployment are intentionally kept as a final user-owned step; this article does not claim a live Cloud Run URL until one is actually verified.

## Suggested screenshots

- Landing page with the privacy promise and Google sign-in button.
- A two-turn conversation showing saved Gemini context.
- Context Contract with a proposal awaiting approval and its source text.
- Reflection Compass with the period selector.
- Privacy page showing export and typed deletion confirmation.

## Closing

Daymark is a small application with a strict promise: your journal is yours, and AI memory is opt-in. The same design scales from a local walkthrough to a Cloud Run deployment without moving secrets or authorization into the browser.
