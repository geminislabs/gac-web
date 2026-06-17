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

### Changed

- Split monolithic GitHub Actions workflow into `ci.yml` (quality gates) and `deploy.yml` (releases)
- `npm run validate` shortcut: lint + check + build
- Node.js 22 as target runtime in CI and `.nvmrc` (Dockerfile base image unchanged in this PR)
- Minor type fixes in `Input.svelte`, `billing.js`, and shipments detail page so `svelte-check` passes in CI
