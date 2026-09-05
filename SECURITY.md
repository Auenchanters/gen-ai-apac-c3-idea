# Security policy

## Supported version

Until the first release, only the latest commit on `main` is supported.

## Reporting a vulnerability

Use GitHub's private vulnerability-reporting or security-advisory flow for this repository. Do not open a public issue for a suspected vulnerability. Include reproduction steps and affected boundaries, but remove credentials, Firebase ID tokens, personal journal text, and other private data.

If private reporting is unavailable, contact a repository owner through a private channel and ask for a secure reporting path before sharing technical details.

## Security expectations

Daymark treats authentication, cross-user isolation, secret handling, model-output validation, recursive deletion, and abuse controls as release blockers. No production deployment is approved until the local release manifest is green and high or critical findings are resolved.
