# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Tarjeta «Marca y reventa» en el detalle de cuenta Nexus (B4): convertir la cuenta en marca (`RESELLER`) o regresarla a cliente final, y fijar o quitar sus capabilities comerciales (marca propia, reventa, subcuentas y dominios máximos) con motivo opcional. Muestra el valor propio, el que rige tras el techo de las cuentas superiores y quién lo recorta, y si su owner ya ve «Marca» en Nexus. Requiere `siscom-admin-api#154`

### Security

- Dependencias con avisos publicados después del último CI de `develop` (14/09), que dejaban en rojo `quality` (`npm audit`) y `security` (OSV) en cualquier PR. `devalue` 5.8.1 → 5.9.4, que llega al navegador con SvelteKit (DoS y serialización de memoria compartida); `brace-expansion`, `fast-uri` y `source-map-js` a sus parches. `lint-staged` 15 → 17, porque su cadena `micromatch` → `braces` no tiene versión corregida. Se quita `@tailwindcss/typography`: ninguna vista usa `prose`, el CSS compilado sale idéntico byte a byte sin él, y fijaba `postcss-selector-parser` 6.0.10, que es vulnerable. El lock se reparó a mano contra el anterior para no perder los `@emnapi` que npm poda en macOS (`npm ci` verificado en macOS y en Linux)

### Changed

- `docs/RELEASE.md` gana el paso de espejo —`git push origin develop:master`, para que `master` siga significando «lo que está en producción»— y una sección de **dependencias entre repos**: cuando una release necesita un cambio de API que aún no está desplegado, la API va primero y se dice en el mensaje del tag. El caso del 9/09 queda escrito: `v1.7.4` exigía `siscom-admin-api v1.29.1`, y sacar la consola antes habría dado 401 en Asignación con un despliegue en verde.

> **Nota.** Lo que queda aquí abajo ya salió en `1.7.3` o antes —`AGENTS.md`,
> `CONTRIBUTING.md` y `SECURITY.md` están en ese tag— y nunca se movió a su
> sección. Se deja como está: repartirlo exigiría saber qué entró en cada tag
> anterior, y adivinarlo produciría un historial falso.

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

## [1.7.4] - 2026-09-09

### Fixed

- La pantalla de dispositivos deja de llamar a siscom-api desde el navegador (ese origen no está en `ALLOWED_ORIGINS` y el preflight se rechazaba). Las comunicaciones van same-origin por `/api/public`; el Node de producción las reenvía. El resto de GAC no cambia.
- El panel de asignación ya no escribe `'preparado'` por el `PATCH` plano: usa `PATCH /devices/{id}/status`. Si el equipo ya tiene dueño, muestra titular y estado; si está montado en una unidad, hay que liberarlo antes de reasignar.
- El mapa no se marca listo hasta que Google Maps termina de cargar. Si falla, se muestra el error y no se reintenta en bucle.

### Security

- **El proxy `/api/public` pasa a lista blanca.** Es el primer endpoint de servidor de gac-web y no tiene autenticación delante —la sesión de GAC vive en el cliente—, así que lo que deje pasar queda expuesto a cualquiera que alcance el dominio, y al otro lado siscom-api sirve el histórico de posiciones sin autenticar. Se acota a lo que el panel usa:
  - Solo las dos rutas de comunicaciones (`devices/{id}/communications` y `.../latest`). Cualquier otra: 404.
  - Solo `GET`/`HEAD`. Un método de escritura no cruza aunque alguien exporte el handler en la ruta.
  - `publicBackendUrl` resuelve la URL con `new URL` y comprueba el prefijo **después** de normalizar: sin eso, un `%2e%2e` se salía de `/api/v1/` y alcanzaba cualquier ruta del mismo host, porque `fetch` normaliza sin avisar.
  - Cabeceras por lista blanca en las dos direcciones. Hacia el backend **no viaja `Authorization`**: `internalApi` adjunta el PASETO interno de GAC a todas sus llamadas, y ese token es del plano de control — que llegue al plano de datos contradice la separación de claves de la Fase 1. Hacia el navegador se cae `Set-Cookie`, que al ser same-origin instalaría cookies del backend **en el dominio de GAC**.

### Changed

- Lockfile de CI: `npm audit fix` y Vitest 4.1.11 para cerrar los high/OSV que tumbaban `quality` y `security` (el código del corte no tocaba esas dependencias).

## [1.7.3] - 2026-08-10

### Added

- Botón **Regenerar acceso** en la ficha de la demo: libera una cuenta que quedó a medias y emite un código nuevo sin salir de la consola, para cuando el cliente se registró pero no consigue iniciar sesión

## [1.7.2] - 2026-08-10

### Fixed

- Los botones de copiar fallaban en la consola servida por HTTP: `navigator.clipboard` solo existe en contextos seguros. Se añade respaldo con `document.execCommand`, que es el único que funciona ahí
- El diálogo del código decía que el entorno se estaba creando. No es cierto: lo crea el invite-gate cuando el cliente canjea el código, porque necesita datos que nacen de ese registro

## [1.7.1] - 2026-08-10

### Fixed

- El alta de demo ofrecía un escenario inexistente (`alertas`). Los válidos son `commercial`, `normal` y `alerts`, resueltos por el entorno de demo; elegir uno inventado fallaba al aprovisionar, después de entregar el código al cliente
- Faltaba el escenario `commercial` (`Presentación comercial Querétaro`), el diseñado para esta pantalla. Pasa a ser el valor por defecto
- La ficha de detalle mostraba dos formatos de fecha distintos según de dónde viniera el dato

## [1.7.0] - 2026-08-10

### Added

- Accesos de demo de Nexus en `/sales/demos` (listado, alta y detalle) para que un vendedor genere y administre demostraciones a prospectos
- Sección `sales` en el Sidebar, con acceso para los roles `admin` y `vendedor`
- `demoStatus.js` (estado y vigencia derivados del reloj) y `clipboard.js` (copiado anunciado y mensaje listo para el cliente), con cobertura completa
- `DemoAccessReveal.svelte`: entrega del código de un solo uso, no descartable por accidente
- Prop opcional `confirmPhrase` en `ConfirmDialog` para las acciones irreversibles
