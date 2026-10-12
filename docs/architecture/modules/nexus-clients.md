# Módulo: Nexus Clients

## 📌 Descripción

Gestión de clientes del sistema Nexus.
Permite listar, consultar y obtener estadísticas de clientes que utilizan servicios de telemática GPS.

---

## 👤 Actor

- Usuario autenticado con acceso a Nexus
- Rol: user / admin

---

## 🔌 APIs Consumidas

### 🔹 SISCOM Admin API (Gestión de clientes)

| Endpoint                       | Método | Uso                              |
| ------------------------------ | ------ | -------------------------------- |
| /api/v1/internal/clients       | GET    | Listar clientes con filtros      |
| /api/v1/internal/clients/stats | GET    | Obtener estadísticas de clientes |
| /api/v1/internal/clients/{id}  | GET    | Obtener detalles de un cliente   |

### 🔹 SISCOM Admin API (Marca y reventa, B4)

Tarjeta «Marca y reventa» del detalle de cuenta (`/products/nexus/accounts/{id}`,
`AccountBrandSection.svelte`). Requiere `siscom-admin-api#154`.

| Endpoint                                           | Método | Uso                                                       |
| -------------------------------------------------- | ------ | --------------------------------------------------------- |
| /api/v1/internal/accounts/{id}                     | GET    | Incluye `account_type` y `parent_account_id`              |
| /api/v1/internal/accounts/{id}                     | PATCH  | `account_type`: `RESELLER` (marca) o `CUSTOMER`           |
| /api/v1/internal/accounts/{id}/capabilities        | GET    | Capabilities comerciales: valor propio, efectivo y origen |
| /api/v1/internal/accounts/{id}/capabilities/{code} | PUT    | Fija el valor propio (crea o reemplaza la fila)           |
| /api/v1/internal/accounts/{id}/capabilities/{code} | DELETE | Quita la fila: la cuenta vuelve a heredar                 |

- Cambiar el tipo no concede nada: la marca propia la da `white_label_enabled` y la
  reventa `can_resell`.
- Un valor que pide más que el de una cuenta superior se guarda, pero rige recortado:
  la tabla muestra el valor propio, el que rige y quién lo recorta.
- El owner de la cuenta ve «Marca» en Nexus cuando la cuenta es `RESELLER`, no tiene
  padre y `white_label_enabled` rige en verdadero (la tarjeta lo resume).
- Lo valida y lo audita el backend (`account_events`, con el usuario de GAC en
  `metadata`); la tarjeta convierte los tipos porque el backend no lo hace.

**Parámetros de consulta (GET /internal/clients):**

- `limit`: Número máximo de resultados (default: 100)
- Otros filtros personalizados según necesidad

---

## 🔁 Flujo funcional

### Dashboard de Clientes

1. Usuario accede a `/products/nexus`
2. Se realizan llamadas en paralelo:
   - `ClientsService.getAll({ limit: 100 })` → Lista de clientes
   - `ClientsService.getStats()` → Estadísticas totales
   - `DevicesService.getAll()` → Para contar dispositivos por cliente
3. Se mapean dispositivos a clientes
4. Se renderiza tabla con:
   - Nombre del cliente
   - Estado (ACTIVE, PENDING, SUSPENDED)
   - Fecha de creación
   - Fecha de actualización
   - Número de dispositivos asignados

### Ver Detalle de Cliente

1. Usuario hace clic en un cliente
2. Se navega a `/products/nexus/clients/{id}`
3. Se obtiene detalle vía `GET /internal/clients/{id}`
4. Se muestran datos completos del cliente

### Búsqueda de Clientes

1. Usuario escribe en campo de búsqueda
2. Se filtra lista localmente por nombre
3. Se actualiza tabla en tiempo real

---

## ⚠️ Consideraciones

- Requiere token PASETO válido (autenticación interna)
- Los clientes pueden tener estados: ACTIVE, PENDING, SUSPENDED
- La creación de clientes no está disponible en este módulo (registro público)
- El conteo de dispositivos se hace cruzando datos de dos APIs
- La búsqueda es local (cliente), no del servidor

---

## 🧭 Relación C4 (preview)

- **Container:** Web App (Svelte)
- **Consumes:** SISCOM Admin API (clientes internos)
- **Component:** Nexus Clients Module (`/routes/products/nexus/`)
- **Related:** Nexus Devices (para contar dispositivos por cliente)
