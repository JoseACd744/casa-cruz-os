# Casa Cruz OS

Sistema central de producto, conocimiento comercial y generación de propuestas de Casa Cruz.

Monorepo con pnpm. La web y la API son dos aplicaciones independientes: comparten el
modelo de datos y las reglas, pero **cada una se despliega en su propio servidor**.

```
apps/
  web/     Next.js 16 — portal del equipo y micrositio del cliente
  api/     Fastify + Prisma — Base Maestra, gobierno del dato (se despliega sola)
packages/
  core/    tipos, reglas de negocio y datos de demostración (se empaqueta dentro de cada app)
```

## Arrancar

```bash
pnpm install             # Node 22 o superior
pnpm dev                 # web en :3000 y API en :4000
pnpm dev:web             # sólo la web
pnpm dev:api             # sólo la API
pnpm typecheck && pnpm lint && pnpm test
```

La web usa la API si existe `API_URL` (ver `apps/web/.env.example`). Con API, todo sale de
ella y un error se muestra como error: **nunca se rellena con datos de demostración**, que en
producción parecerían inventario real. Sin `API_URL`, la web trabaja sola en modo
demostración de sólo lectura.

La API usa Postgres si existe `DATABASE_URL`; si no, trabaja en memoria con los mismos datos
de demostración y lo avisa en `GET /salud`. En desarrollo lee `apps/api/.env` si existe.

## Documentación de la API

Con la API levantada: **http://localhost:4000/docs** (Scalar). La especificación sale de los
mismos esquemas que validan cada petición, así que no puede quedar desactualizada; se puede
importar en Postman, Insomnia o n8n desde `/openapi.json`.

## Accesos

El token lo emite la API y vive en una cookie httpOnly de la web. El rol, las plazas y si la
cuenta sigue activa se leen de la base en cada petición: desactivar a alguien o cambiarle el rol
surte efecto de inmediato, aunque tenga una sesión abierta.

- **Cuentas nuevas**: corporativo invita desde *Control del dato → Usuarios*. La cuenta nace con
  una clave temporal que se muestra una sola vez; al entrar, la persona elige la suya (10+
  caracteres, letras y números, sin su nombre ni su correo).
- **Demostración (sin base de datos)**: cualquier usuario del catálogo entra con `casacruz`:

| Correo | Rol |
| --- | --- |
| jorge.diaz@casacruz.mx | cerrador |
| gerente.rivieramaya@casacruz.mx | gerente |
| direccion@casacruz.mx | corporativo |

- **Con Postgres**, la clave de demostración deja de servir (salvo que se defina `CLAVE_DEMO` a
  propósito). El primer acceso de una base nueva se da con
  `pnpm --filter @casacruz/api acceso direccion@casacruz.mx`, que imprime una clave temporal.

## Reglas que ya están en código

- **La confiabilidad no se captura, se calcula** (`core/confiabilidad.ts`): cada campo crítico
  pesa distinto y caduca a distinto ritmo.
- **Un dato que no existe no se inventa**: viaja como `null` y la interfaz lo muestra como
  `[CAMPO]`. Al cliente nunca se le muestra un marcador: sin nombre capturado, se le saluda sin
  nombre.
- **Un cambio publicado modifica el dato** (`core/cambios.ts`, `api/gobierno.ts`): el cambio sabe
  a dónde va (campo, tipología y nivel), el servidor calcula el valor anterior e interpreta el
  nuevo, y al publicarse lo escribe en la Base Maestra y lo cuenta como validado, todo en una
  transacción. Si el campo es sensible (comisión, entrega, esquema de pago) o la fuente no deja
  documento, espera aprobación.
- **Nadie aprueba su propio cambio**, uno resuelto no se vuelve a resolver y, si el dato se movió
  mientras esperaba, aprobar responde 409 en lugar de pisarlo.
- **El alta va paso por paso** (`core/alta.ts`): el cerrador envía a revisión, el gerente pasa a
  due diligence, corporativo aprueba (con el due diligence validado) y publica (con precio,
  esquema, 3 imágenes, argumentos y objeciones).
- **Aprobado, lo que ve el cliente sólo cambia por un cambio registrado**: precio,
  disponibilidad, entrega, promoción y enganche dejan de editarse a mano.
- **Sólo lo publicado llega al cliente, y un cerrador sólo propone en sus plazas certificadas**
  (`core/comercial.ts`).
- **La certificación se gana** (`core/capacitacion.ts`): módulos de la plaza y evaluación con
  80 %, calificada en el servidor. Dura un año; vencida, la plaza deja de poder proponerse.
- **La propuesta congela el precio** de cada opción al generarse.
- **El rol decide qué se devuelve**: sin sesión de cerrador, la información interna y los
  argumentos comerciales salen vacíos de la API.

## Rutas de la web

| Ruta | Qué es |
| --- | --- |
| `/login`, `/cuenta/contrasena` | Acceso y cambio de clave (obligatorio con clave temporal) |
| `/inicio` | Tablero del cerrador |
| `/propiedades`, `/propiedades/[id]` | Inventario y ficha interna (con CONFIRMAR vigencia por campo) |
| `/propiedades/[id]/cambio` | Registrar un cambio con su fuente y evidencia |
| `/propiedades/[id]/editar` | Editor de seis pasos del desarrollo |
| `/propiedades/[id]/simulador` | Simulador de crédito (imprimible) |
| `/alta` | Alta de un nuevo desarrollo |
| `/comparar` | Comparador de las propiedades seleccionadas |
| `/propuestas`, `/propuestas/nueva` | Propuestas y su generador |
| `/clientes`, `/clientes/nuevo`, `/clientes/[id]` | Clientes, leads y Kommo |
| `/capacitacion`, `/capacitacion/[plaza]/evaluacion` | Ruta por plaza y evaluación |
| `/control`, `/control/usuarios` | Aprobaciones, responsables, equipo y bitácora |
| `/preguntar` | Capa de IA (por ahora, preguntas de ejemplo) |
| `/p/[slug]` | **Micrositio público** de la propuesta |
| `/doc/ficha/[id]`, `/doc/pdf/[slug]`, `/doc/presentacion/[slug]` | Documentos para el equipo |
| `/descargas/…` | PDF y bitácora CSV, pedidos a la API con la sesión |

## Base de datos (Postgres en Railway)

El esquema completo está en `apps/api/prisma/schema.prisma` y la migración inicial en
`apps/api/prisma/migrations`. Se probó contra Postgres 18: las mismas 46 pruebas de la API pasan
en memoria y en Postgres.

1. En Railway, crear el Postgres (conviene la plantilla con **pgvector**: no se usa todavía, pero
   evita migrar de servidor cuando llegue la capa de IA).
2. Poner su `DATABASE_URL` en el servicio de la API y correr `pnpm db:deploy`.
3. Cargar los datos de demostración (opcional, borra lo que haya): `pnpm db:seed`.
4. Dar el primer acceso: `pnpm --filter @casacruz/api acceso <correo del corporativo>`.

Pruebas contra una base de pruebas (se vacía y se vuelve a sembrar en cada archivo):

```bash
DATABASE_URL=postgresql://…/casacruz_pruebas CLAVE_DEMO=casacruz pnpm --filter @casacruz/api test:postgres
```

## Kommo

- **Notas en los leads** (`KOMMO_SUBDOMINIO` + `KOMMO_TOKEN`): al enviar una propuesta, al abrirla
  el cliente por primera vez y cuando pide conocer una propiedad.
- **Webhook de entrada** (`KOMMO_WEBHOOK_SECRETO`): en Kommo → Ajustes → Integraciones →
  Webhooks, la URL `https://<api>/webhooks/kommo?clave=<secreto>` para los eventos de leads. Un
  lead nuevo crea al cliente y un cambio de etapa la actualiza; cada aviso queda en la bitácora
  (visible en Clientes para gerente y corporativo).

## Desplegar

Son dos despliegues distintos y no dependen uno del otro:

- **API** → cualquier servidor con Node 20+. `pnpm --filter @casacruz/api build` deja
  `dist/server.js` con el código compartido ya empaquetado, o se usa `apps/api/Dockerfile`.
  Variables: `DATABASE_URL`, `JWT_SECRET` (obligatoria), `CORS_ORIGIN`, `URL_PUBLICA`,
  `URL_API`, el bucket (`S3_*`), `GOOGLE_MAPS_API_KEY` y Kommo (ver `apps/api/.env.example`).
- **Web** → Vercel o un Node propio. Sólo necesita `API_URL` apuntando al servidor de la API.

## Pendiente

- Conectar la base de Railway (pasos arriba) y el bucket de archivos (`S3_*`).
- Capa de IA en `/preguntar` (Claude sobre la Base Maestra aprobada).
- Contenido real de la capacitación (hoy hay módulos y preguntas de ejemplo, marcados como tal) y
  una pantalla para editarlo.
- Refresco de token: hoy la sesión dura 12 h y al vencer vuelve al acceso con aviso.
