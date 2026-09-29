# Security Policy

## Supported Scope

This repository is prepared for public hackathon review. It is not yet a hardened production system.

Security-sensitive configuration must stay outside Git:

- Sectors API keys
- SumoPod API keys and webhook secrets
- Database URLs with credentials
- AI provider API keys
- Demo account passwords
- Private deployment SSH keys or server credentials

Use `backend/.env.example` and `frontend/.env.local.example` as templates, then keep real values in local environment files or deployment secret managers.

## Reporting

For hackathon review, report security issues privately to the project maintainer/team before opening a public issue. Include:

- affected route or component,
- reproduction steps,
- expected impact,
- logs or screenshots with secrets redacted.

## Public Release Checklist

Before pushing:

- run a secret scan over the repository,
- confirm `.env`, local databases, generated videos, and recordings are ignored,
- rotate any key that was ever pasted into chat, logs, screenshots, or commits,
- keep registration disabled on public deployments unless intentionally testing onboarding,
- use SumoPod sandbox only unless production payment handling has been reviewed.
