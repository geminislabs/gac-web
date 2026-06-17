# Política de seguridad

## Versiones soportadas

| Versión         | Soportada | Notas                             |
| --------------- | --------- | --------------------------------- |
| Último tag `v*` | Sí        | Releases desplegados a producción |
| `develop`       | Sí        | Rama de integración activa        |
| Otras ramas     | No        | Sin garantía de parches           |

## Reportar una vulnerabilidad

**No reportes vulnerabilidades de seguridad mediante issues públicos de GitHub.**

Envía un reporte privado a:

**[security@geminislabs.com](mailto:security@geminislabs.com)**

Si el buzón no está disponible, usa **[contacto@geminislabs.com](mailto:contacto@geminislabs.com)** con asunto `SECURITY: gac-web`.

Incluye en tu reporte:

1. Descripción del problema y el impacto potencial
2. Pasos para reproducir (o prueba de concepto)
3. Versión o commit afectado
4. Tu contacto para seguimiento

### Qué esperar

| Plazo           | Acción                                  |
| --------------- | --------------------------------------- |
| 72 horas        | Acuse de recibo del reporte             |
| 7 días          | Evaluación inicial y severidad estimada |
| Según severidad | Fix, mitigación o plan de remediación   |

## Buenas prácticas del proyecto

Este panel admin consume GAC API, SISCOM Admin API y Google Maps:

- **Nunca** commitees API keys ni tokens en el repositorio
- Las variables `PUBLIC_*` y `VITE_*` son **públicas** en el bundle
- Los tokens de sesión se persisten en `localStorage` vía `src/lib/stores/auth.js` — no loguear tokens en consola

## Dependencias

Las vulnerabilidades en dependencias npm se gestionan vía `npm audit` en CI. Si encuentras una CVE sin alerta automática, repórtala por el canal de seguridad.
