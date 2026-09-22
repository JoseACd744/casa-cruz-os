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

## Sesión y permisos

Todo lo interno exige token. Se obtiene en `POST /sesion` y se manda como
`Authorization: Bearer …`.

| Rol | Puede |
| --- | --- |
| cliente | Ver una propuesta por su enlace. Nada más. |
| cerrador | Inventario completo, argumentos, información interna, alta y edición de producto, propuestas, carga de archivos. |
| gerente | Todo lo anterior más aprobar o rechazar cambios pendientes y ver el equipo. |
| corporativo | Todo lo anterior más mover un desarrollo a due diligence, aprobado o publicado. |

Dos reglas que el servidor no negocia:

- **La autoría sale del token, no del cuerpo.** `POST /cambios` firma el cambio
  con el usuario de la sesión: nadie registra un cambio a nombre de otro.
- **Sin sesión de cerrador, la información interna y los argumentos salen
  vacíos** del endpoint de desarrollos (`src/visibilidad.ts`). Las advertencias
  que el cliente sí debe conocer, como "torres sin elevador", siguen viajando.

Mientras no haya base de datos, cualquier usuario del catálogo entra con
`CLAVE_DEMO` (por omisión `casacruz`). Con Postgres se valida el hash scrypt de
cada usuario.

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
| POST | `/sesion` | Iniciar sesión |
| GET | `/sesion` | Quién soy |
| POST | `/desarrollos` | Crear un desarrollo (nace en borrador) |
| PATCH | `/desarrollos/:id` | Editar datos generales |
| GET | `/desarrollos/:id/requisitos` | Qué le falta para publicarse |
| POST | `/desarrollos/:id/estatus` | Mover el flujo de alta |
| PUT | `/desarrollos/:id/tipologias` | Crear o actualizar tipología con sus niveles |
| DELETE | `/desarrollos/:id/tipologias/:tipologiaId` | Eliminar tipología |
| POST | `/desarrollos/:id/multimedia` | Subir imagen o documento al bucket |
| DELETE | `/desarrollos/:id/multimedia` | Quitar un archivo |
| POST | `/clientes`, PATCH `/clientes/:id` | Crear y editar clientes |
| POST | `/propuestas` | Generar propuesta (congela precios, avisa a Kommo) |
| POST | `/propuestas/:slug/enviar` | Marcar como enviada |
| POST | `/cambios/:id/rechazar` | Rechazar un cambio pendiente |
| GET | `/pdf/ficha/:id` | Ficha de propiedad en PDF (1440 × 810 pt) |
| GET | `/pdf/analisis/:slug` | Análisis de propiedades en PDF (carta) |

## Los PDFs

Se imprimen con Chromium (Playwright) desde plantillas HTML que viven en
`src/pdf/`. La paleta y los tamaños salen de los documentos originales del
diseñador: tan `#AE9479`, fondo del análisis `#DFDAD6`, fondo de la ficha
`#F9F8F6`, y la ficha mide 1440 × 810 pt, igual que el archivo original.
Montserrat viaja embebida en el PDF, así que no hace falta instalarla en el
servidor.

Para ajustar el diseño sin generar el PDF: `?html=1` devuelve el HTML.

```bash
curl "http://localhost:4000/pdf/ficha/playa-park?tipologia=pp-3hab" -o ficha.pdf
curl "http://localhost:4000/pdf/analisis/berenice-fabian" -o analisis.pdf
```

En desarrollo hace falta bajar el navegador una vez: `pnpm exec playwright install chromium`.
En producción se usa la imagen de Playwright del Dockerfile, que ya lo trae.

## La regla que vive aquí, no en la interfaz

`POST /cambios` decide el estado: si el campo es sensible (comisión, entrega,
esquema, rendimiento) o la fuente no admite evidencia documental, el cambio
queda `pendiente` aunque la web diga otra cosa. El criterio está en
`@casacruz/core` (`requiereAprobacion`) para que ambos lados coincidan.

## Archivos

Los renders, planos y fotos van a un bucket compatible con S3 (el de Railway),
no al disco del servidor: la API puede reiniciarse o cambiar de máquina sin
perder el material. Lo que se guarda en la Base Maestra es la URL.

El orden importa: el primer archivo es la fachada o el render principal de la
ficha. Sin `S3_ENDPOINT` y credenciales, la carga responde 503 y lo dice.

## Kommo

Al enviar una propuesta se escribe una nota en el lead con la fecha, las
propiedades presentadas y el enlace. Si Kommo no está configurado queda en el
log y la propuesta se genera igual: que falte el CRM no debe tumbar una venta.

## Pendiente

- Conectar Postgres: el esquema y el seed están listos, pero **todavía no se ha
  ejecutado ni una migración**. Mientras tanto las escrituras viven en memoria y
  se pierden al reiniciar.
- Refrescar el token (hoy dura 12 horas y hay que volver a entrar).
- Webhooks de Kommo hacia Casa Cruz OS (hoy sólo escribimos nosotros).
