# Release Guide — gac-web

## Version source of truth

- **Package version:** `package.json` → `version`
- **Git tags:** annotated tags `v*.*.*` (e.g. `v1.4.0`)
- **Changelog:** `CHANGELOG.md` — move `[Unreleased]` entries under the new version header before tagging

## Prerequisites

- All changes merged to `develop` via PR with **CI green**
- `CHANGELOG.md` updated in the release PR or release commit
- GitHub Actions secrets and variables configured for deploy (EC2 SSH, API URLs, Google Maps key)

## Release sequence

1. Sync `develop`:

   ```bash
   git checkout develop
   git pull origin develop
   ```

2. Prepare the release commit (version bump + changelog):

   ```bash
   # Edit package.json version and CHANGELOG.md [X.Y.Z] section
   git add package.json CHANGELOG.md
   git commit -m "chore(release): vX.Y.Z"
   git push origin develop
   ```

3. Create and push an annotated tag:

   ```bash
   git tag -a vX.Y.Z -m "release: vX.Y.Z"
   git push origin vX.Y.Z
   ```

4. **Deploy workflow** (`.github/workflows/deploy.yml`) runs automatically on `v*.*.*` tag push:
   - Builds Docker image
   - Deploys to EC2 test environment

5. Verify deployment in GitHub Actions and on the target server.

## CI vs deploy

| Workflow     | Trigger                         | Purpose                                        |
| ------------ | ------------------------------- | ---------------------------------------------- |
| `ci.yml`     | PR + push to `develop`/`master` | Lint, type-check, build, audit, security scans |
| `deploy.yml` | Push tag `v*.*.*`               | Docker build + EC2 deployment                  |

Never skip CI by pushing tags directly from unmerged branches.

## Rollback

1. Identify the last known-good tag.
2. Re-deploy by pushing the previous tag again, or run the deploy workflow manually with `workflow_dispatch`.
3. Document the incident in `CHANGELOG.md` under `[Unreleased]` if a hotfix follows.
