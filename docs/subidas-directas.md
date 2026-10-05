# Subidas directas al bucket

Con S3 configurado, multimedia, documentos y evidencias se envían desde el navegador al bucket mediante PUT firmado. Next y la API reciben únicamente metadatos y una autorización de confirmación; no reciben el binario. Sin bucket, el desarrollo local conserva su carga multipart al disco. En producción, la ausencia de bucket sigue bloqueando las cargas.

## Flujo y límites

1. La web solicita `POST /archivos/preparar` con sesión, propósito, desarrollo, nombre, MIME y bytes.
2. La API valida el destino, los tipos admitidos y el máximo de 15 MB por archivo. Genera una clave UUID y una URL que vence en 300 segundos; firma `content-type` y `content-length`.
3. El navegador realiza PUT con el File y Content-Type. El navegador calcula Content-Length; JavaScript no debe establecer ese encabezado.
4. La web envía un ticket firmado a `POST /archivos/confirmar`. La API verifica usuario, propósito, desarrollo, vencimiento (15 minutos) y los metadatos reales con HEAD antes de registrar la URL. No descarga el contenido.

La firma del ticket usa un dominio distinto al de la sesión y no permite utilizarlo como token de acceso. Los reintentos de confirmación no duplican multimedia ni documentos; Postgres serializa la comprobación por desarrollo con un bloqueo de fila, sin migraciones nuevas. Los endpoints multipart previos se mantienen para compatibilidad y desarrollo local.

La URL firmada es una credencial temporal: no guardarla en logs ni compartirla. Durante sus cinco minutos puede repetirse el PUT sobre la misma clave con el mismo tamaño y tipo; no es una URL de un solo uso. La verificación valida metadatos, no el contenido semántico del archivo. Si una carga se interrumpe después del PUT y antes de la confirmación, puede quedar un objeto sin registro: su limpieza debe comparar claves con los registros, sin eliminar indiscriminadamente archivos válidos.

## Configuración del bucket

Se utilizan las variables S3 existentes de `apps/api/.env.example`; no se exponen las credenciales al navegador. S3_ENDPOINT debe ser accesible desde el celular y usar HTTPS cuando la web use HTTPS. S3_URL_PUBLICA sigue siendo la URL de lectura de los archivos.

Configurar CORS en el bucket (no basta con CORS_ORIGIN de la API), reemplazando el origen por el dominio real de la web:

```json
[
  {
    "AllowedOrigins": ["https://propuestas.casacruz.mx"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Conservar las reglas GET/HEAD que ya se usen para lectura. Para QA local añadir explícitamente el origen local de la web. El proveedor debe aceptar preflight OPTIONS para estas reglas, PUT firmado y HEAD desde la API. Las credenciales deben tener acceso PutObject, GetObject (para HEAD) y DeleteObject en el bucket. No hacer público el permiso de escritura.

No hay fallback automático a multipart cuando el bucket falla: la interfaz muestra el error y permite volver a intentar. En modo local, el límite agregado de la server action se mantiene en 16 MB.

## Verificación

```powershell
pnpm --filter @casacruz/api test
pnpm --filter @casacruz/web build
$env:SUBIDAS_QA_WEB='1'
node --import tsx --test apps/api/src/subidas-directas.test.ts
Remove-Item Env:SUBIDAS_QA_WEB
```

La prueba adicional arranca y detiene Next y la API con datos en memoria y un bucket HTTP simulado. Usa el puerto local 3117 para Next. Comprueba los tres formularios reales a 390 px, una selección de dos archivos de 9 MB (18 MB en total), PUT al bucket y peticiones de menos de 50 KB a Next. Las pruebas también cubren archivos ausentes, MIME/tamaño discordantes, firma alterada, falta de sesión, otro usuario/destino y confirmación repetida. No utiliza credenciales ni datos de producción. La firma real la genera el SDK; el bucket simulado no reproduce todas las políticas de un proveedor S3.

Las dependencias Smithy Core/Types se fijan en las overrides del monorepo para evitar clases y tipos incompatibles entre el SDK S3 existente y el nuevo firmador.

Falta validar CORS y la carga desde un celular contra el bucket real del despliegue. La configuración del bucket no se modifica desde el código.
