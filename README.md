# Casa Cruz OS

Sistema central de producto, conocimiento comercial y generación de propuestas de Casa Cruz.

Monorepo con pnpm. La web y la API son dos aplicaciones independientes: comparten el
modelo de datos y las reglas, pero **cada una se despliega en su propio servidor**.

```
apps/
  web/     Next.js 16 — portal del cerrador y micrositio del cliente
  api/     Fastify + Prisma — Base Maestra, gobierno del dato (se despliega solo)
packages/
  core/    tipos, reglas de negocio y datos de demostración (se empaqueta dentro de cada app)
```

## Arrancar

```bash
pnpm install
pnpm dev                 # web en :3000 y API en :4000
pnpm dev:web             # sólo la web
pnpm dev:api             # sólo la API
pnpm typecheck && pnpm lint
```

La web usa la API si existe `API_URL` (ver `apps/web/.env.example`); si no, trabaja con los
datos de demostración y sigue navegable. La API usa Postgres si existe `DATABASE_URL`; si no,
responde con esos mismos datos y lo avisa en `GET /salud`. Así se puede mostrar el sistema
completo antes de tener base de datos.

## Documentación de la API

Con la API levantada: **http://localhost:4000/docs** (Scalar). La especificación sale de los
mismos esquemas que validan cada petición, así que no puede quedar desactualizada; se puede
importar en Postman, Insomnia o n8n desde `/openapi.json`.

## Reglas que ya están en código

- **La confiabilidad no se captura, se calcula** (`packages/core/src/confiabilidad.ts`): cada
  campo crítico pesa distinto y caduca a distinto ritmo. De ahí salen el semáforo del
  inventario y el aviso "verifica antes de enviarla".
- **Un dato que no existe no se inventa**: viaja como `null` y la interfaz lo muestra como
  `[CAMPO]` en rojo.
- **Nada cambia sin dejar rastro**: `POST /cambios` decide el estado, no la interfaz. Si el
  campo es sensible (comisión, entrega, esquema, rendimiento) o la fuente no admite evidencia
  documental, el cambio queda pendiente de aprobación (`packages/core/src/reglas.ts`).
- **La propuesta congela el precio** de cada opción al enviarse.

## Rutas de la web

| Ruta | Qué es |
| --- | --- |
| `/login` | Acceso |
| `/inicio` | Tablero del cerrador |
| `/propiedades`, `/propiedades/[id]` | Inventario y ficha interna |
| `/propiedades/[id]/simulador` | Simulador de crédito (cálculo real) |
| `/propiedades/[id]/cambio` | Registrar un cambio con su fuente y evidencia |
| `/comparar` | Comparador de las propiedades seleccionadas |
| `/propuestas`, `/propuestas/nueva` | Propuestas y su generador |
| `/clientes`, `/clientes/[id]` | Clientes, leads y sincronía con Kommo |
| `/capacitacion` | Certificaciones por plaza |
| `/control`, `/control/usuarios` | Gobierno del dato, roles y auditoría |
| `/alta` | Alta de un nuevo desarrollo |
| `/preguntar` | Capa de IA sobre la Base Maestra |
| `/p/[slug]` | **Micrositio público** de la propuesta |
| `/doc/ficha/[id]`, `/doc/pdf/[slug]`, `/doc/presentacion/[slug]` | Documentos imprimibles |

## Desplegar

Son dos despliegues distintos y no dependen uno del otro:

- **API** → cualquier servidor con Node 20. `pnpm --filter @casacruz/api build` deja
  `dist/server.js` con el código compartido ya empaquetado, o se usa `apps/api/Dockerfile`.
  Necesita `DATABASE_URL` y correr `migrate:deploy`.
- **Web** → Vercel o un Node propio. Sólo necesita `API_URL` apuntando al servidor de la API.

## Pendiente

- Conectar Postgres (el esquema y el seed ya están listos en `apps/api/prisma`).
- Autenticación real y permisos por rol aplicados en el servidor.
- Generación de PDF desde el servidor, para adjuntarlos sin pasar por el navegador.
- Integración con Kommo: escribir en el lead al generar una propuesta.
