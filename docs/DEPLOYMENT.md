# Cloud Run deployment contract

This document is a release plan, not a record of a completed deployment. Cloud account access was intentionally deferred for this submission path.

## Required runtime configuration

- Cloud Run runs the single non-root container from `Dockerfile`.
- The service listens on `0.0.0.0:$PORT` and exposes `/healthz` and `/readyz`.
- Firebase Admin uses Application Default Credentials from the attached runtime service identity. No service-account JSON key is used.
- Grant the runtime identity only the Firestore access required by the repository and `roles/secretmanager.secretAccessor` on the Gemini secret revision.
- Bind a numbered Secret Manager revision to `GEMINI_API_KEY` with `--set-secrets`. The value must be a current Gemini authorization key bound to the runtime service account, not a deprecated standard key.
- Configure `APP_ORIGIN` to the exact HTTPS Cloud Run origin and set the Firebase web identifiers from the target project.

## Release settings

The release script must verify the exact project and service identity, require a green local release manifest, and attach:

```text
dev-tutorial=cloud-run-ai-challenge
```

Use bounded memory and concurrency, a maximum instance count, startup CPU boost, and a short request timeout. Do not deploy from a working tree containing environment files, credentials, dependency output, source maps, or private screenshots.

## Post-deployment checks

Read response bodies, not only status codes:

1. `/healthz` returns exactly `{"status":"ok"}`.
2. `/.well-known/security.txt` returns the security contact text.
3. `/api/config` contains only Firebase browser configuration.
4. Private routes return a sanitized 401 without a Firebase token.
5. The service metadata has the required label, attached identity, and numbered secret binding.
6. A two-user test proves that one verified UID cannot list, load, mutate, export, or delete another user's records.

Deployment remains locked until formatting, lint, type-checking, coverage, rules emulator, browser accessibility, build, smoke, dependency, secret, duplication, dead-code, and container checks are green.

## Rollback and rotation

Keep the previous healthy revision available for rollback. Rotate the Gemini authorization key by creating a new numbered Secret Manager revision, updating the binding, validating a new revision, and disabling the old credential only after traffic is healthy. Never put the new key in GitHub Actions logs or local files.
