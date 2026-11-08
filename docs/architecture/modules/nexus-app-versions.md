# Módulo: Nexus App Versions (Política de Versiones Móviles)

## 📌 Descripción

Gestión de la política de versiones de clientes móviles (iOS y Google Play Android) de Nexus.
Permite consultar la configuración actual, verificar las instalaciones activas por versión en los últimos 30 días, simular el impacto operativo de una actualización antes de guardarla (`preview`) y aplicar los umbrales de actualización obligatoria (`min_supported_version`), aviso opcional (`latest_version`), versiones revocadas (`blocked_versions`) y enlace a tiendas (`store_url`).

Sustituye la manipulación manual por SQL de la tabla `client_version_policy` de `siscom-admin-api`.

---

## 👤 Actor

- Usuario interno de GAC autenticado con acceso al módulo Nexus (`canAccessNexus`).
- Rol: `admin` / `user`.

---

## 🔌 APIs Consumidas

### 🔹 SISCOM Admin API

Todas las llamadas se autentican con token PASETO interno vía `internalApi` (`src/lib/services/api.js`).

| Endpoint                                                    | Método | Uso                                                                             |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| `/api/v1/client-version-policy`                             | GET    | Obtener la lista completa de políticas de versión (iOS y Android)               |
| `/api/v1/client-version-policy/{platform}`                  | PUT    | Reemplazar la política para la plataforma (`ios` o `android`)                   |
| `/api/v1/client-version-policy/{platform}/installs?days=30` | GET    | Obtener conteo de instalaciones activas agrupadas por versión de app            |
| `/api/v1/client-version-policy/{platform}/preview?days=30`  | POST   | Simular el impacto de la política (versiones bloqueadas vs aviso) sin persistir |

### 🔹 GAC API

| Endpoint                 | Método | Uso                                                                                    |
| ------------------------ | ------ | -------------------------------------------------------------------------------------- |
| `/api/v1/users/{userId}` | GET    | Resolver información de nombre y correo cuando `updated_by` corresponde a `gac:<uuid>` |

---

## 🔁 Flujo Funcional

### 1. Consulta y visualización inicial

1. El usuario navega a `/products/nexus/app-versions`.
2. Se ejecuta `AppVersionsService.getAll()` para obtener la política de cada plataforma. Si falla la carga, se muestra un mensaje de error explícito y el botón **Reintentar**, sin guardar datos simulados en producción.
3. Se cargan en paralelo las métricas de instalaciones activas vía `AppVersionsService.getInstalls(platform, 30)`. Si la llamada falla, la sección muestra el aviso _"No se pudieron cargar las instalaciones"_ con botón de reintento.
4. Si `updated_by` contiene un identificador interno de GAC (`gac:<uuid>`), se consulta `userService.getUser(uuid)` para mostrar el nombre y correo del usuario responsable; de lo contrario se muestra el texto literal o referencia de migración.
5. Se muestra en pantalla la fecha de última actualización formateada en hora local y el aviso fijo de ventana de propagación.

### 2. Simulación de impacto previo (Preview)

1. El usuario modifica los umbrales de versión, enlace a tienda o lista de versiones bloqueadas.
2. Al pulsar **Guardar cambios**, se ejecuta primero una validación de formato en el cliente (`validatePolicyClient`).
3. Se invoca `POST /client-version-policy/{platform}/preview?days=30` enviando el payload normalizado (`store_url` vacío se serializa como `null`).
4. Si la API devuelve un error de validación `422`, se mapea el error directamente al campo indicado en `field` (o banner general si no hay campo) y se aborta el guardado.
5. Si la simulación es exitosa, se abre el modal de impacto mostrando el desglose en lenguaje claro: instalaciones activas totales, cuántas quedarán bloqueadas (`required`) y cuántas verán aviso opcional (`optional`).

### 3. Confirmación crítica y persistencia

1. Si la nueva política incrementa `min_supported_version` o añade versiones a `blocked_versions` y el número de instalaciones bloqueadas es mayor a cero (`required > 0`), se activa un mecanismo de confirmación explícita evaluando la plataforma de `previewResult`:
   - Casilla de confirmación obligatoria entendiendo el impacto.
   - Confirmación por teclado escribiendo la versión mínima configurada.
2. Una vez confirmada, se ejecuta `PUT /client-version-policy/{platform}`.
3. Se actualiza el estado local con la fila guardada y se notifica al usuario con un toast de confirmación.

---

## ⚠️ Consideraciones de Operación y Seguridad

- **Ventana de propagación:** Los cambios surten efecto de manera inmediata en el endpoint `GET /api/v1/client-config` de las aplicaciones móviles, y en hasta **60 segundos** en el middleware de control de versiones del resto de la API de SISCOM debido al tiempo de vida de su caché en memoria.
- **Validación estricta de dominios de tienda:** La URL de la tienda para iOS debe ser `https://apps.apple.com/...` y para Android `https://play.google.com/...`. No se permite fijar un mínimo de versión sin tener configurada una URL de tienda válida.
- **Prevención de bloqueos accidentales:** Ninguna política con `required > 0` que endurezca los umbrales puede aplicarse con un solo clic.
- **Aislamiento de modo Mock:** El modo mock (`?mock=1`) está estrictamente limitado al entorno de desarrollo (`import.meta.env.DEV`). En compilaciones de producción no se procesa ni emite datos de prueba.

---

## 📸 Regeneración de Capturas

Las imágenes de demostración no se versionan en el repositorio para evitar bloat binario.
Para regenerarlas localmente utilizando Playwright:

```bash
# Iniciar servidor en modo desarrollo
npm run dev

# Ejecutar el script generador de capturas (en otra terminal)
npx playwright test scripts/generate-screenshots.js
```

Los artefactos resultantes se depositan en `docs/screenshots/app-versions/` (ignorado por Git).

---

## 📋 Pedidos al contrato (Backend SISCOM Admin API)

1. **Atributo `field` consistente en errores 422:** Confirmar que todos los validadores de Pydantic/FastAPI en `PUT /client-version-policy/{platform}` y `POST /client-version-policy/{platform}/preview` retornen `{ "detail": "...", "field": "nombre_del_campo" }` (o `loc: ["body", "nombre_del_campo"]`). `formatApiErrorMessage` y `AppVersionsService` soportan ambas formas.
2. **Filtrado numérico estricto en Preview:** Asegurar que cuando `min_supported_version` sea `null`, las versiones activas desconocidas o sin formato no sean clasificadas como `required`, sino `none` o `unknown`.
3. **Paginación o límite en `installs`:** Si con el tiempo crecen las variantes de compilación de las apps móviles, podría ser útil contar con un parámetro `limit` o agrupar automáticamente las versiones residuales (< 1% de instalaciones) bajo una categoría general.

---

## ⏳ Qué falta

- **Despliegue de endpoints en `siscom-admin-api`:** Esperar a que Claude libere y despliegue los endpoints de la API (§3.2). Una vez activos en el entorno de desarrollo/staging, la pantalla de GAC cambiará automáticamente de modo mock a backend real sin requerir cambios de código.
- **Fijación de la primera política real:** Jesús fijará la primera política oficial en producción para iOS y Android una vez desplegados ambos repositorios.

---

## 🧭 Relación C4

- **Container:** Web App (`gac-web`, SvelteKit 2 + Svelte 5)
- **Consumes:**
  - `siscom-admin-api` (endpoints `/client-version-policy/*`)
  - `gac-api` (resolución de usuarios en `/users/{id}`)
- **Component:** Nexus App Versions (`/routes/products/nexus/app-versions/`, `src/lib/services/appVersions.js`)
