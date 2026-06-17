# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Engineering foundation: `AGENTS.md`, `CONTRIBUTING.md`, `SECURITY.md`, `.editorconfig`, `.nvmrc`
- Release discipline: `CHANGELOG.md`, `docs/RELEASE.md`, `scripts/setup.sh`, Husky hooks (commitlint, lint-staged, pre-push)
- CI guardrails: `ci.yml` (lint, type-check, build, audit) + Gitleaks and Semgrep in `security` job
- Separate `deploy.yml` for tag-based EC2 deployments (`v*.*.*` only)
- `scripts/gitleaks-scan.sh` and `npm run scan:secrets` (free CLI; no Gitleaks Action license required)
- Pull request template with base-branch and validate checklist
- Dev container (`.devcontainer/`) with post-create setup from `.env.example`
- Vitest unit tests for `roles`, `apiErrors`, `nexusStatus`, `commercialClient` utils
- Playwright smoke e2e (`e2e/smoke.spec.js`) — login redirect and sign-in UI
- ADRs (`docs/adr/0001`–`0003`) and `docs/security/threat-model.md`
- GitHub issue templates (bug, feature, security contact link)
- CI job `e2e` (informational, `continue-on-error: true`)
- Phase 3 quality gates: coverage thresholds (90% lines/statements/functions on `src/lib/**`), blocking e2e and audit CI jobs
- Expanded unit tests for `api.js`, `auth.js`, stores, and service modules
- `scripts/osv-scan.sh`, `npm run scan:osv`, OSV-Scanner in CI `security` job
- `.github/CODEOWNERS`, `docs/GOVERNANCE.md`, `.github/dependabot.yml`
- CI uploads coverage artifact from `test:coverage`

### Changed

- Split monolithic GitHub Actions workflow into `ci.yml` (quality gates) and `deploy.yml` (releases)
- `npm run validate` shortcut: lint + check + test:coverage + build
- Node.js 22 as target runtime in CI, `.nvmrc`, and `Dockerfile` base image
- Minor type fixes in `Input.svelte`, `billing.js`, and shipments detail page so `svelte-check` passes in CI
- CI: inject `PUBLIC_*` env vars before `svelte-check` (with localhost fallbacks)
- CI `quality` job runs unit tests after `svelte-check`
