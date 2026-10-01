# Verificación móvil y PWA

Fecha: 1 de octubre de 2026.

## Cambios

- Corregidos desbordamientos en simulador, trazabilidad, carga de archivos y constructor de propuestas.
- Los botones del simulador crecen con su texto; la selección de propiedades reserva un renglón para sus acciones.
- Campos y tarjetas pueden reducir su ancho, y textos largos pueden partirse sin ampliar la pantalla.
- Galería móvil en una columna; controles de selección, eliminación y cuenta con mayor área táctil.
- Comparativos con columnas alineadas y desplazamiento horizontal dentro de su región.
- Menú «Más» con diálogo nativo, cierre, foco y restauración al botón. Se cierra al pasar al diseño de escritorio para no bloquear la página.
- Instalación desde acceso y menú. La oferta de Chrome se conserva entre navegaciones; Safari tiene instrucciones.
- Manifiesto con identidad estable y orientación libre. El service worker sólo almacena el aviso genérico sin conexión; no almacena API, sesiones ni datos comerciales.
- Fuentes incluidas en el proyecto con sus licencias; la compilación ya no necesita descargar Google Fonts.

## Resultado

La auditoría recorrió **234 vistas y estados**, a **320, 390, 768, 1024, 1280 y 1440 px**, sin incidencias de desbordamiento detectadas ni errores de JavaScript. Se usó Chromium, una compilación de producción y una API local en memoria con el rol corporativo de demostración. No se usaron servicios de producción.

Incluye inicio, inventario, fichas y pestañas, seis pasos del editor, alta, simulador, cambios, comparador, propuestas, clientes, capacitación, evaluación, control, usuarios con formularios desplegados, cambio de clave, asistente, micrositio y documentos. Los comparativos y barras de pestañas permiten desplazamiento horizontal intencional; las láminas conservan su escala de impresión.

También pasaron:

- Compilación de producción, TypeScript y ESLint.
- Comprobación de instalación de Chrome: `Page.getInstallabilityErrors` no devuelve errores.
- Manifiesto, dimensiones reales de los íconos y cabeceras del worker.
- Oferta de instalación simulada: sólo se abre al tocar el botón, se consume una vez y sobrevive a la navegación.
- Instrucciones manuales de instalación.
- Navegación offline, caché exclusiva de `/offline.html`, reintento al recuperar conexión y conservación de errores HTTP.
- Las peticiones POST fallan sin red; no se sustituyen por HTML ni se ponen en cola.
- Teclado en el menú, cierre con Escape y retorno del foco.
- Vista horizontal a 844 × 390 y transición de móvil a escritorio con el menú abierto.

## Repetir

Las instrucciones están en la sección «En el teléfono» del README. Scripts:

- `node apps/web/scripts/mobile-audit.cjs`
- `node apps/web/scripts/pwa-audit.cjs`

Los resultados detallados se guardan en `apps/web/.next/mobile-qa/results.json`. Los scripts aceptan únicamente URLs locales. La auditoría móvil comprueba que la API sea de demostración en memoria.

## Alcance

La instalación final necesita publicar la web con HTTPS. Las pruebas automatizadas y capturas son de Chromium; queda comprobar la instalación real y el teclado del sistema en Safari/iPhone y Chrome/Android físicos. No se desplegó la aplicación.
