# AGENTS.md — Guía para agentes de código

Instrucciones para asistentes de IA (Cursor, Copilot, etc.) que trabajen en este repositorio.

## Proyecto

**gac-web** (`geminislabs-admin-control`) — panel de administración SvelteKit de Geminis Labs: auth, dashboard, módulos Nexus (clientes, organizaciones, dispositivos), commerce/admin (órdenes, pagos, envíos).

## Stack

| Capa        | Tecnología                     |
| ----------- | ------------------------------ |
| Framework   | SvelteKit 2, Svelte 5          |
| Build       | Vite 7                         |
| Estilos     | Tailwind CSS 4                 |
| Lint/format | ESLint 9 flat, Prettier (tabs) |
| Runtime     | Node.js 22                     |
| Deploy      | Docker + adapter-node → EC2    |

## Estructura

```text
src/lib/services/     # api.js, billing, commerce, organizations, etc.
src/lib/stores/       # auth, toast, theme
src/lib/components/   # UI reutilizable
src/lib/utils/        # Helpers puros (apiErrors, roles, …)
src/routes/           # admin/, products/nexus/, …
docs/architecture/    # Mapa de módulos y APIs consumidas
```

Antes de modificar integraciones con backend, lee `docs/architecture/modules/README.md` y el módulo correspondiente.

## Convenciones

- **Lenguaje:** JavaScript (`.js`, `.svelte`). No migrar a TypeScript sin RFC explícito.
- **Formato:** Tabs, comillas simples, `printWidth: 100` (ver `.prettierrc`).
- **Imports:** Usar alias `$lib/` de SvelteKit.
- **API:** `src/lib/services/api.js` usa `initApi(auth)` para romper dependencia circular con el store de auth.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- **Alcance:** Cambios mínimos y enfocados. No reformatear código no relacionado.

## Comandos obligatorios antes de terminar

```bash
npm run validate
```

Equivalente: `npm run lint`, `npm run check`, `npm run build`.

## Módulos sensibles

Trata con cuidado extra (revisión humana; tests en fases posteriores):

- `src/lib/services/api.js` — capa HTTP, refresh token
- `src/lib/stores/auth.js` — sesión en `localStorage`
- `src/lib/services/billing.js`, `commerce.js`, `payments.js`
- `src/routes/admin/**` — órdenes, pagos, envíos
- `src/routes/products/nexus/**` — clientes, organizaciones, facturación

## Variables de entorno

Variables públicas de SvelteKit (`PUBLIC_*`) y `VITE_*` se embeben en el bundle. **Nunca** pongas secretos ahí.

Referencias: variables en workflows de CI/deploy y `Dockerfile`.

## Lo que NO debes hacer

- Commitear secretos, `.env`, o credenciales
- Agregar dependencias sin justificación clara
- Desactivar reglas de ESLint para “hacer pasar” el CI
- Modificar workflows de deploy sin coordinación explícita

## Documentación humana

- Contribución: [CONTRIBUTING.md](CONTRIBUTING.md)
- Seguridad: [SECURITY.md](SECURITY.md)
- Arquitectura por módulo: [docs/architecture/modules/](docs/architecture/modules/)

## Release y changelog

- **Changelog:** `CHANGELOG.md` — actualizar `[Unreleased]` en PRs con cambios de release note
- **Pre-push:** valida rama y presencia de changelog vs `origin/develop`
- **CI:** `.github/workflows/ci.yml` — lint, check, build, audit (informativo), Gitleaks, Semgrep
- **Deploy:** `.github/workflows/deploy.yml` — solo tags `v*.*.*`; ver [docs/RELEASE.md](docs/RELEASE.md)

## PRs

Base branch: `develop`. Usar plantilla en `.github/pull_request_template.md`.
