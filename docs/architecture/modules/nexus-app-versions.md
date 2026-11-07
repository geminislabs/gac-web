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
2. Se ejecuta `AppVersionsService.getAll()` para obtener la política de cada plataforma.
3. Se cargan en paralelo las métricas de instalaciones activas vía `AppVersionsService.getInstalls(platform, 30)`.
4. Si `updated_by` contiene un identificador interno de GAC (`gac:<uuid>`), se consulta `userService.getUser(uuid)` para mostrar el nombre y correo del usuario responsable; de lo contrario se muestra el texto literal o referencia de migración.
5. Se muestra en pantalla la fecha de última actualización formateada en hora local y el aviso fijo de ventana de propagación.

### 2. Simulación de impacto previo (Preview)

1. El usuario modifica los umbrales de versión, enlace a tienda o lista de versiones bloqueadas.
2. Al pulsar **Guardar cambios**, se ejecuta primero una validación de formato en el cliente (`validatePolicyClient`).
3. Se invoca `POST /client-version-policy/{platform}/preview?days=30` enviando el payload propuesto.
4. Si la API devuelve un error de validación `422`, se mapea el error directamente al campo indicado en `field` (o banner general si no hay campo).
5. Si la simulación es exitosa, se abre el modal de impacto mostrando el desglose en lenguaje claro: instalaciones activas totales, cuántas quedarán bloqueadas (`required`) y cuántas verán aviso opcional (`optional`).

### 3. Confirmación crítica y persistencia

1. Si la nueva política incrementa `min_supported_version` o añade versiones a `blocked_versions` y el número de instalaciones bloqueadas es mayor a cero (`required > 0`), se activa un mecanismo de confirmación explícita:
   - Casilla de confirmación obligatoria entendiendo el impacto.
   - Confirmación por teclado escribiendo la versión mínima configurada.
2. Una vez confirmada, se ejecuta `PUT /client-version-policy/{platform}`.
3. Se actualiza el estado local con la fila guardada y se notifica al usuario con un toast de confirmación.

---

## ⚠️ Consideraciones de Operación y Seguridad

- **Ventana de propagación:** Los cambios surten efecto de manera inmediata en el endpoint `GET /api/v1/client-config` de las aplicaciones móviles, y en hasta **60 segundos** en el middleware de control de versiones del resto de la API de SISCOM debido al tiempo de vida de su caché en memoria.
- **Validación estricta de dominios de tienda:** La URL de la tienda para iOS debe ser `https://apps.apple.com/...` y para Android `https://play.google.com/...`. No se permite fijar un mínimo de versión sin tener configurada una URL de tienda válida.
- **Prevención de bloqueos accidentales:** Ninguna política con `required > 0` que endurezca los umbrales puede aplicarse con un solo clic.

---

## 🧭 Relación C4

- **Container:** Web App (`gac-web`, SvelteKit 2 + Svelte 5)
- **Consumes:**
  - `siscom-admin-api` (endpoints `/client-version-policy/*`)
  - `gac-api` (resolución de usuarios en `/users/{id}`)
- **Component:** Nexus App Versions (`/routes/products/nexus/app-versions/`, `src/lib/services/appVersions.js`)
