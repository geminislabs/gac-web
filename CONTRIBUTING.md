# Guía de contribución

Gracias por contribuir a **gac-web**. Este documento define el flujo mínimo para mantener calidad y consistencia.

## Requisitos previos

- **Node.js 22** (ver `.nvmrc` y `engines` en `package.json`)
- npm (incluido con Node)

```bash
nvm use              # si usas nvm
bash scripts/setup.sh
```

`scripts/setup.sh` ejecuta `npm ci` y configura los hooks de Husky.

### 1. Rama base

Trabaja siempre desde `develop`:

```bash
git checkout develop
git pull origin develop
git checkout -b <tipo>/<descripcion-corta>
```

Prefijos de rama:

| Prefijo     | Uso                                         |
| ----------- | ------------------------------------------- |
| `feature/`  | Nueva funcionalidad                         |
| `fix/`      | Corrección de bug                           |
| `chore/`    | Tooling, docs, dependencias, CI             |
| `refactor/` | Cambio interno sin cambio de comportamiento |
| `test/`     | Solo tests                                  |

### 2. Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/). Husky valida el mensaje con commitlint.

Formato:

```text
<tipo>(<alcance opcional>): <descripción en imperativo>
```

Tipos habituales: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`.

Ejemplos:

```text
feat(orders): add shipment status filter
fix(auth): handle expired refresh token
chore: add CONTRIBUTING guidelines
```

### 3. Antes de abrir un PR

Ejecuta localmente:

```bash
npm run validate   # lint + check + build (atajo recomendado)
```

Equivalente manual:

```bash
npm run lint       # prettier + eslint
npm run check      # svelte-check
npm run build      # build de producción
```

Opcional pero recomendado:

```bash
npm run audit           # vulnerabilidades npm (nivel high+)
npm run scan:secrets    # Gitleaks sobre archivos en git (`.env` local está en .gitignore)
```

Los hooks de Husky ejecutan:

- **pre-commit:** lint-staged (formato y lint en archivos staged)
- **commit-msg:** validación Conventional Commits (commitlint)
- **pre-push:** nombre de rama válido y `CHANGELOG.md` cuando aplica

No omitas hooks con `--no-verify` salvo emergencia justificada.

### 4. Pull requests

- Base branch: **`develop`**
- Usa la plantilla en `.github/pull_request_template.md`
- Actualiza `CHANGELOG.md` bajo `[Unreleased]` si el cambio merece release note

### 5. CI

En cada PR y push a `develop`/`master`:

| Job        | Qué hace                         |
| ---------- | -------------------------------- |
| `quality`  | lint, svelte-check, build, audit |
| `security` | Gitleaks + Semgrep               |

El deploy a EC2 solo ocurre con tags `v*.*.*` (ver [docs/RELEASE.md](docs/RELEASE.md)).

## Estilo de código

- Tabs para indentación (`.editorconfig`, Prettier)
- Alias `$lib/` para imports internos
- Servicios en `src/lib/services/` — lógica de API fuera de componentes Svelte

## Arquitectura

Consulta `docs/architecture/modules/README.md` antes de tocar integraciones GAC API / SISCOM.
