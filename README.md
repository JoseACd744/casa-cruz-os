# Casa Cruz OS

Sistema central de producto, conocimiento comercial y generación de propuestas de Casa Cruz.
Esta es la **versión navegable con datos mock**: todas las pantallas funcionan, pero la información
vive en memoria (`src/lib/mock/data.ts`), no en una base de datos.

```bash
npm run dev     # http://localhost:3000
npm run build   # build de producción
npx tsc --noEmit && npx eslint src   # tipos y lint
```

## Stack

- **Next.js 16 (App Router) + React 19** — el portal interno es una app con estado; el micrositio
  del cliente necesita renderizarse en servidor para que el enlace que se manda por WhatsApp traiga
  título y descripción.
- **TypeScript** — el modelo de datos de la Base Maestra está tipado en `src/lib/types.ts`.
- **Tailwind 4** — los colores y tipografías de Casa Cruz están en `src/app/globals.css` (`@theme`).

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/login` | Acceso |
| `/inicio` | Tablero del cerrador: pendientes de validación, novedades, propuestas |
| `/propiedades` | Inventario con filtros y selección para propuesta |
| `/propiedades/[id]` | Ficha interna: tipologías, argumentos, información interna, trazabilidad |
| `/propiedades/[id]/simulador` | Simulador de crédito (cálculo real) |
| `/propiedades/[id]/cambio` | Registrar un cambio con su fuente y evidencia |
| `/comparar` | Comparador de las propiedades seleccionadas |
| `/propuestas` | Listado de propuestas con su estado y sus salidas |
| `/propuestas/nueva` | Generador de propuestas |
| `/clientes` | Listado de clientes y leads de Kommo |
| `/clientes/[id]` | Cliente, propuestas enviadas y sincronía con Kommo |
| `/capacitacion` | Certificaciones por plaza y biblioteca comercial |
| `/control` | Pipeline de alta, aprobaciones, permisos y responsabilidad por cerrador |
| `/control/usuarios` | Usuarios, roles y auditoría |
| `/alta` | Alta de un nuevo desarrollo (paso 3 de 6) |
| `/preguntar` | Capa de IA sobre la Base Maestra (etapa 10) |
| `/p/[slug]` | **Micrositio público** de la propuesta (el enlace que recibe el cliente) |
| `/doc/ficha/[id]` | Ficha automática en formato Casa Cruz (imprimible) |
| `/doc/pdf/[slug]` | Propuesta comparativa tamaño carta (imprimible) |
| `/doc/presentacion/[slug]` | Presentación navegable de la propuesta |

Las tres vistas bajo `/doc` son documentos: se ven a tamaño real, se reducen solas en pantallas
chicas y el botón “Descargar PDF” usa la impresión del navegador.

## Reglas de negocio que ya están en código

- `src/lib/confiabilidad.ts` — la **confiabilidad no se captura, se calcula**: cada campo crítico
  pesa distinto y caduca a distinto ritmo (precio y disponibilidad 15 días, promoción y entrega 30,
  comisión 90). De ahí salen el semáforo de las tarjetas y el aviso "verifica antes de enviarla".
- `src/lib/format.ts` — un dato que no existe **nunca se inventa**: se muestra como `[CAMPO]` en
  rojo. En los tipos eso es `null`.
- `src/components/FormCambio.tsx` — un cambio en campo sensible (comisión, entrega) o sin evidencia
  adjunta no se publica: queda pendiente de aprobación.
- La propuesta **congela el precio** de cada opción al enviarse (`precioCongelado`).

## Cómo conectar datos reales

Todas las pantallas hablan únicamente con `src/lib/repo.ts`. Para pasar de mock a Base Maestra real
sólo se reescriben esas funciones (Airtable, Postgres o lo que se decida) manteniendo las firmas;
ninguna pantalla cambia. Lo mismo para Kommo: la escritura en el lead va donde hoy está el
comentario en `ConstructorPropuesta.generar()`.

## Pendiente

- Persistencia real: hoy nada se guarda, cada recarga vuelve al estado inicial.
- Autenticación real y permisos por rol aplicados en servidor.
- Analítica del micrositio (vistas por propiedad) y webhooks de Kommo.
