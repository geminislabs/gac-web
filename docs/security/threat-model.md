# Threat Model — gac-web

High-level security model for the SvelteKit admin frontend. Complements [SECURITY.md](../../SECURITY.md).

## System boundary

| In scope (this repo)                  | Out of scope (other systems)                |
| ------------------------------------- | ------------------------------------------- |
| Browser bundle (`PUBLIC_*`, `VITE_*`) | `gac-api`, `siscom-admin-api`, `siscom-api` |
| SvelteKit routes & client stores      | PostgreSQL, payment provider secrets        |
| Docker image build & EC2 deploy       | Identity provider infrastructure            |

## Assets

1. **User session tokens** — stored client-side (`localStorage` via auth store)
2. **Organization, Nexus and commerce UI data** — rendered from API responses
3. **Public keys** — Google Maps (`VITE_GOOGLE_MAPS_API_KEY`)
4. **CI/CD secrets** — EC2 SSH, API URLs in GitHub Actions (not in repo)

## Trust zones

```text
[Browser]  --HTTPS-->  [SvelteKit Node adapter]  --HTTPS-->  [Backend APIs]
   ^                           ^
   |                           |
 PUBLIC_* / VITE_* (public)  Build-time embed of env vars
```

**Rule:** Never put server secrets in `PUBLIC_*` or `VITE_*` variables — they ship to every client.

## Key flows

### Authentication

- Login calls GAC API via `src/lib/services/api.js` and `src/lib/stores/auth.js`
- Tokens held in `localStorage`; refresh coordinated in `api.js`
- **Risk:** XSS exfiltrating tokens → mitigate with CSP (future), input sanitization, dependency updates
- **Risk:** Session fixation → backend responsibility; frontend redirects unauthenticated users to `/login`

### Nexus & commerce modules

- Nexus routes (`/products/nexus/**`) gated by admin role in layout (`roles.js`)
- Commerce/admin routes (`/admin/**`) require authenticated user; server must authorize every mutation
- **Risk:** Tampering with client-side IDs → server must validate org/client context

## STRIDE summary (frontend-focused)

| Threat                 | Example                    | Mitigation                                      |
| ---------------------- | -------------------------- | ----------------------------------------------- |
| Spoofing               | Fake API responses         | HTTPS, auth headers server-validated            |
| Tampering              | Modified client requests   | Server-side authorization                       |
| Repudiation            | Denied user action         | Backend audit logs (out of scope here)          |
| Information disclosure | Secrets in git             | Gitleaks, `.env` gitignored, `SECURITY.md`      |
| Denial of service      | Heavy client loops         | Rate limiting on API (backend)                  |
| Elevation of privilege | Access Nexus without admin | API enforces roles; UI is not security boundary |

## Sensitive modules (extra review)

- `src/lib/services/api.js`
- `src/lib/stores/auth.js`
- `src/lib/services/billing.js`, `commerce.js`, `payments.js`
- `src/routes/admin/**`
- `src/routes/products/nexus/**`

## Reporting

Follow [SECURITY.md](../../SECURITY.md) for vulnerability disclosure. Do not open public issues for security bugs.
