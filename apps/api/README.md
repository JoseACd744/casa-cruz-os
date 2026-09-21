# API de Casa Cruz OS

Servicio independiente. Vive en este monorepo para compartir el modelo de datos
con la web (`@casacruz/core`), pero se despliega solo: el build empaqueta ese
código dentro de `dist/`, así que en el servidor destino sólo hacen falta Node 20
y las dependencias de producción.

```bash
pnpm --filter @casacruz/api dev     # desarrollo en http://localhost:4000
pnpm --filter @casacruz/api build   # genera dist/server.js
pnpm --filter @casacruz/api start   # producción
```

## Sin base de datos todavía

Mientras `DATABASE_URL` esté vacío, la API responde con los datos de
demostración del núcleo y lo avisa en `GET /salud`. Las escrituras aplican las
mismas reglas pero no se guardan. Al poner la cadena de conexión, el servicio
cambia solo a Postgres.

## Poner la base en marcha

```bash
cp .env.example .env            # y escribe DATABASE_URL
pnpm --filter @casacruz/api generate      # cliente de Prisma
pnpm --filter @casacruz/api migrate       # crea las tablas (desarrollo)
pnpm --filter @casacruz/api seed          # carga los datos de demostración
```

En el servidor de producción se usa `migrate:deploy`, que aplica migraciones ya
versionadas sin pedir confirmación.

## Documentación

Con el servicio arriba: **http://localhost:4000/docs** — referencia Scalar generada de los
mismos esquemas (zod) que validan cada petición, así que no puede quedar desactualizada.
La especificación cruda está en `/openapi.json`, lista para importar en Postman o n8n.

## Endpoints

| Método | Ruta | Para qué |
| --- | --- | --- |
| GET | `/salud` | Estado y de dónde salen los datos |
| GET | `/docs` | Documentación navegable (Scalar) |
| GET | `/openapi.json` | Especificación OpenAPI 3 |
| GET | `/plazas` | Plazas activas |
| GET | `/desarrollos` | Inventario, con filtros `q, ciudad, recamaras, precioMin, precioMax, soloPublicados` |
| GET | `/desarrollos/:id` | Un desarrollo completo |
| GET | `/desarrollos/:id/confiabilidad` | Porcentaje y estado de cada campo |
| GET | `/desarrollos/:id/cambios` | Historial del desarrollo |
| POST | `/desarrollos/:id/validaciones` | Confirmar que un campo sigue vigente |
| GET | `/pipeline` | Conteo por estatus de listing |
| GET | `/novedades` | Últimos cambios publicados |
| GET | `/usuarios`, `/usuarios/actual` | Equipo y sesión (sin auth todavía) |
| GET | `/clientes`, `/clientes/:id` | Clientes y leads |
| GET | `/propuestas`, `/propuestas/:slug` | Propuestas generadas |
| POST | `/propuestas/:slug/vista` | El micrositio avisa que el cliente lo abrió |
| GET | `/cambios?estado=pendiente` | Cola de aprobación |
| POST | `/cambios` | Registrar un cambio con su fuente y evidencia |
| POST | `/cambios/:id/aprobar` | Aprobar un cambio pendiente |

## La regla que vive aquí, no en la interfaz

`POST /cambios` decide el estado: si el campo es sensible (comisión, entrega,
esquema, rendimiento) o la fuente no admite evidencia documental, el cambio
queda `pendiente` aunque la web diga otra cosa. El criterio está en
`@casacruz/core` (`requiereAprobacion`) para que ambos lados coincidan.

## Pendiente

- Autenticación y permisos por rol (hoy `usuarioId` viaja en el cuerpo).
- Integración con Kommo: escribir en el lead al generar una propuesta.
- Subida de evidencias y multimedia a almacenamiento externo.
