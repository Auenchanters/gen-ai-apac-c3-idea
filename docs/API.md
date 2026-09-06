# API overview

All `/api` data routes require a Firebase bearer token and the exact configured origin for mutations. The server derives the UID from the verified token. Request and response bodies are strict JSON and plain text only.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/healthz` | Minimal liveness response |
| GET | `/readyz` | Dependency readiness |
| GET | `/api/config` | Public Firebase browser configuration |
| GET | `/api/journals` | Cursor-bounded caller-owned journal list |
| POST | `/api/journals` | Create a journal |
| GET | `/api/journals/:journalId` | Load one journal and its messages/memories |
| DELETE | `/api/journals/:journalId` | Recursively delete one journal |
| POST | `/api/journals/:journalId/turns` | Save one idempotent Gemini turn |
| PATCH | `/api/journals/:journalId/memories/:memoryId` | Approve, edit, reject, retire, or delete a memory |
| POST | `/api/compass` | Build a private 7-day or 30-day retrospective |
| GET | `/api/export` | Export all caller-owned journals |
| DELETE | `/api/account-data` | Recursively delete caller-owned data |

Unknown resources intentionally return the same 404 shape whether they are absent or owned by another user. Error responses use `{ "error": { "code", "message", "requestId" } }`; internal dependency messages never cross the boundary.
