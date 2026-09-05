# Contributing to Daymark

Thank you for helping make private reflection safer and more useful.

## Local setup

Use Node.js 22.22.2 and npm. Copy `.env.example` to `.env` only on your own machine and supply values through an approved local secret source. Never commit that file. Install the exact dependency graph with:

```sh
npm ci --ignore-scripts
```

The application uses Application Default Credentials for Google Cloud services. Do not create or download a service-account key file.

## Change workflow

Start with a focused failing test, implement the smallest complete change, and keep commits scoped. Before opening a pull request, run the checks relevant to your change and then the complete local gate:

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run test:rules
npm run build
```

Do not reduce a threshold or bypass an authorization check to make a change pass. Document exported public symbols and update security or deployment guidance when a boundary changes.

## Pull requests

Explain the user-visible outcome, list verification performed, and call out security or privacy implications. Never include real journal entries, tokens, account identifiers, credentials, or screenshots with private data.

Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not a public issue.
