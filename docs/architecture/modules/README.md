# Module Dependency Documentation

These documents describe which APIs are consumed by each application module and how they interact at runtime.

This documentation supports C4 container and component diagrams.

---

## 📋 Resumen de Dependencias Externas

### APIs Consumidas por Módulo

| Módulo                                  | GAC API                          | SISCOM Admin API                    | SISCOM API        | WebSocket | Otros |
| --------------------------------------- | -------------------------------- | ----------------------------------- | ----------------- | --------- | ----- |
| [auth](auth.md)                         | ✅ Login, Refresh, Me            | ✅ Internal Auth                    | -                 | -         | -     |
| [dashboard](dashboard.md)               | ✅ Users                         | ✅ Devices, Clients Stats           | -                 | -         | -     |
| [admin-users](admin-users.md)           | ✅ Users, Roles                  | -                                   | -                 | -         | -     |
| [nexus-clients](nexus-clients.md)       | ✅ GAC Orders/Payments/Shipments | ✅ Internal Accounts, Orgs, Billing | -                 | -         | -     |
| [nexus-organizations](nexus-clients.md) | -                                | ✅ Internal Organizations + Billing | -                 | -         | -     |
| [nexus-devices](nexus-devices.md)       | -                                | ✅ Devices, Events                  | ✅ Communications | ✅ Stream | -     |
| [nexus-commands](nexus-commands.md)     | -                                | ✅ Commands                         | -                 | -         | -     |
| [nexus-trips](nexus-trips.md)           | -                                | ✅ Trips                            | -                 | -         | -     |
| [orders](orders.md)                     | ✅ Orders                        | -                                   | -                 | -         | -     |
| [products](products.md)                 | -                                | ✅ Internal Products                | -                 | -         | -     |
| [payments](payments.md)                 | ✅ Payments                      | ✅ Org Billing (read)               | -                 | -         | -     |

---

## 🔌 APIs Externas

### GAC API

**Base URL:** `PUBLIC_GAC_API_URL`  
**Descripción:** API administrativa interna para gestión de usuarios, roles, órdenes comerciales, pagos y envíos (schema `gac`).  
**Autenticación:** Bearer Token (JWT)

### SISCOM Admin API

**Base URL:** `PUBLIC_SISCOM_ADMIN_API_URL`  
**Descripción:** API de gestión administrativa de Nexus (cuentas, organizaciones, billing, dispositivos, comandos, viajes, catálogo).  
**Autenticación:** Bearer Token (PASETO) obtenido vía `/auth/internal`

### SISCOM API

**Base URL:** `PUBLIC_SISCOM_API_URL`  
**Descripción:** API de datos en tiempo real para comunicaciones de dispositivos.  
**Autenticación:** Bearer Token (PASETO)

### WebSocket

**Base URL:** `ws(s)://PUBLIC_SISCOM_API_URL`  
**Endpoint:** `/stream?device_ids={ids}`  
**Descripción:** Stream en tiempo real de datos de dispositivos GPS.

---

## 📚 Módulos Documentados

### Autenticación y Administración

- **[auth.md](auth.md)** - Autenticación y autorización de usuarios
- **[dashboard.md](dashboard.md)** - Vista principal del sistema
- **[admin-users.md](admin-users.md)** - Gestión de usuarios internos y roles

### Nexus (Telemática GPS)

- **[nexus-clients.md](nexus-clients.md)** - Gestión de clientes Nexus
- **[nexus-devices.md](nexus-devices.md)** - Gestión de dispositivos GPS
- **[nexus-commands.md](nexus-commands.md)** - Envío de comandos a dispositivos
- **[nexus-trips.md](nexus-trips.md)** - Consulta de viajes y tracking

### Negocio

- **[orders.md](orders.md)** - Gestión de órdenes
- **[products.md](products.md)** - Catálogo de productos
- **[payments.md](payments.md)** - Gestión de pagos

---

## 🎯 Uso de esta Documentación

Esta documentación está diseñada para:

1. **Diagramas C4:** Facilitar la creación de diagramas de contenedores y componentes
2. **Onboarding:** Ayudar a nuevos desarrolladores a entender las dependencias
3. **Arquitectura:** Documentar las integraciones entre sistemas
4. **Troubleshooting:** Identificar rápidamente qué APIs consume cada módulo
