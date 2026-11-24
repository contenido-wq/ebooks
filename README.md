# Tienda de ebooks

Tienda de ebooks con lector en línea. Primer libro: *Si Dios jugara fútbol*, de Juan Guillermo Ricaurte y Jeins Durán.

- Diseño: `docs/superpowers/specs/2026-09-20-tienda-ebooks-design.md`
- Planes por fase: `docs/superpowers/plans/`

## Desarrollo

    npm install
    cp .env.example .env.local
    npm run dev        # http://localhost:3000
    npm test           # pruebas
    npm run typecheck && npm run lint

## Contenido del libro

Los datos del libro están en `src/content/books.ts`. Los textos salen del propio libro.
Para usar la portada real, guarda la imagen en `public/` y pon su ruta en `portada`
(por ejemplo `"/portada.webp"`).

**Precio:** $50.000 COP (`precioCop`) y US$15,11 (`precioUsd`, la conversión con la TRM de $3.309,55 del 18-nov-2026). La landing solo
muestra el precio; **quien cobra es Wemany**, así que el plan del libro en Wemany debe tener el mismo valor. Si cambias uno, cambia el otro.

## Imágenes de la landing

Las escenas viven en `public/imagenes/` (WebP) y la portada real en `public/portada.webp`. Se generan
a partir de los archivos originales, que no están en el repositorio:

    npm run portada -- "/ruta/Portada.pdf"              # recorta la portada del archivo de imprenta
    python3 scripts/imagenes/componer-tableta.py "<carpeta>/02-tableta.png" public/portada.webp /tmp/tableta-real.png
    npm run imagenes -- "<carpeta de las escenas>" /tmp/tableta-real.png "<Portada.png>"   # la foto de la portada de la página

La tableta lleva la portada real proyectada en su pantalla (la imagen original traía una portada inventada).
El script de la tableta necesita Python con `numpy` y `pillow`.

## Links para la bio y QR

Con la tienda publicada, estos links miden de dónde llega cada visita:

- Instagram: `https://tu-dominio.com/ig`
- TikTok: `https://tu-dominio.com/tiktok`
- WhatsApp: `https://tu-dominio.com/wa`
- QR: `https://tu-dominio.com/qr`

Para generar el QR y la tarjeta 9:16 para historias:

    npm run qr -- https://tu-dominio.com

Los archivos quedan en `out/qr/`. El QR apunta a `/qr`, una redirección que se puede cambiar de destino
sin reimprimir el código.

## Publicar en Cloudflare (sidiosjugarafutbol.com)

La página corre en Cloudflare Workers con vinext. El dominio y el Worker están en la misma cuenta de Cloudflare.

    npx cf auth create ebooks      # solo la primera vez (abre el navegador)
    npx cf auth activate ebooks    # enlaza el perfil con esta carpeta
    NEXT_PUBLIC_SITE_URL=https://sidiosjugarafutbol.com NEXT_PUBLIC_WHATSAPP_NUMBER=57... npm run deploy:vinext

- Hay que pasar `NEXT_PUBLIC_SITE_URL` al desplegar: `.env.local` (para desarrollo) tiene `localhost` y ganaría.
- Hay que pasar también `NEXT_PUBLIC_WHATSAPP_NUMBER` (código de país, solo dígitos): se incrusta al compilar. Sin él, no aparece la ayuda por WhatsApp.
- La imagen para compartir (`src/app/opengraph-image.png`) es un archivo fijo, sin precio. Si cambia la portada, hay que regenerarla.
- Las imágenes se sirven sin optimizador (`images.unoptimized`): Cloudflare Images las recomprimía y se perdía la textura de la piel.
- Dominio y `www` se declaran en `cloudflare.config.ts` (`domains`).

## Página de gracias (`/gracias`)

Wemany lleva a quien acaba de comprar a `https://sidiosjugarafutbol.com/gracias`. La página es abierta y **no contiene ningún enlace al libro**:
la persona escribe el correo con el que pagó y, si hay una compra, recibe un enlace de descarga **de un solo uso que vence en 10 minutos**.

    Wemany --compra aprobada--> webhook --> KV COMPRADORES  pagado:<SHA-256 del correo>
    /gracias (correo) --> POST /api/gracias --> si pagó: ticket aleatorio en KV (10 min) --> /descarga?t=<ticket>
    GET /descarga?t=...  --> canjea el ticket (lo borra) --> entrega el PDF desde KV LIBRO_PDF

- **Dónde vive el PDF:** en el KV privado `LIBRO_PDF` (`sidiosjugarafutbol-libro`), clave `si-dios-jugara-futbol.pdf`. Un valor de KV admite hasta
  25 MB (el libro pesa ~11 MB). Para cambiarlo: `npx cf kv keys put si-dios-jugara-futbol.pdf --namespace-id=<id de LIBRO_PDF> --file=ruta/libro.pdf`
  (la sintaxis lleva `=`). No hace falta publicar de nuevo. R2 sería lo ideal, pero hay que activarlo en el dashboard de Cloudflare.
- **Quién paga:** el webhook anota en `COMPRADORES` solo la **huella SHA-256 del correo** (nunca el correo) cuando llega una compra aprobada real.
  Los eventos de prueba (`"test": true`), reembolsos, rechazos y carritos abandonados no dan acceso.
- **Seguridad:** máximo 5 intentos cada 10 minutos por IP y por correo. Un ticket usado, vencido o inventado responde 410. `/gracias` y `/descarga`
  no se indexan. El uso único es de mejor esfuerzo (KV tarda hasta ~1 minuto en propagarse).
- **Límites conocidos:** quien sepa el correo de un comprador podría pedir el enlace (se podría enviar el enlace por correo con un servicio
  como Resend); quien ya descargó puede pasar el archivo; los reembolsos no revocan el acceso.
- **Dar acceso a mano** (por ejemplo a un comprador anterior al webhook): calcula la huella del correo (SHA-256 de `correo` en minúsculas) y
  `npx cf kv keys put pagado:<huella> --namespace-id=<id de COMPRADORES> --body=1`.
- **Acceso a Wemany:** Wemany se lo manda a cada comprador por correo; este sitio no lo gestiona.

## Webhook de Wemany -> Google Sheets

Wemany avisa a `https://sidiosjugarafutbol.com/api/wemany/<WEBHOOK_TOKEN>` (compra aprobada, carrito abandonado,
pago rechazado, nuevo miembro) y cada evento queda como una fila en la hoja "Webhook Si Dios jugara futbol".

    Wemany --POST--> /api/wemany/<token> (Worker) --POST--> Apps Script (integraciones/google-sheets/Code.gs) --> Hoja

- Wemany no sigue redirecciones y los Apps Script siempre redirigen, por eso el Worker hace de intermediario.
- **Seguridad, dos capas:** el código en la dirección filtra el tráfico, y la firma `X-Wemany-Signature` (`t=<segundos>,v1=<hmac>`,
  HMAC-SHA256 de `t.cuerpoCrudo`, margen de 300 s, igual que Stripe) prueba que el evento es de Wemany. La firma se exige apenas
  `WEBHOOK_SIGNING_SECRET` tenga el secreto real; mientras valga `pendiente`, basta el código de la dirección.
- **Duplicados:** el id sale del encabezado `X-Wemany-Event-Id` (estable entre reintentos). Mismo id + mismo evento no se repite.
  `cart.abandoned` seguido de `purchase.approved` NO es un duplicado: son dos filas (una recuperación). Filtrar por email.
- **Reintentos de Wemany:** 5 (al momento, 1 min, 5 min, 30 min, 2 h), espera máxima 10 s; tras 20 entregas agotadas desactivan el endpoint.
  Por eso la hoja tiene 8 s de espera y, si falla, se responde 502 para que reintenten.
- **Vacío no es cero:** monto y valor_neto quedan vacíos cuando no hubo cobro (carrito abandonado, pago rechazado, alta gratis sin importe).
  No se usa el precio del plan como monto.
- **Monto de respaldo:** `monto` sale de lo cobrado (`amountPaid`, etc.). Solo si el evento no lo trae, se usa `grossValue` (así llena el
  evento de prueba de Wemany, que lo trae suelto), y solo si es mayor que 0. Un `amountPaid` más profundo nunca pierde contra un `grossValue`.
- **UTM y origen los escribe el comprador** (`attributionOrigin: buyer_supplied`): se guardan como texto recortado, nunca se interpretan
  como fórmulas ni disparan nada. No usarlos como dato de contacto.
- Los datos se buscan por nombre en cualquier parte del JSON (`src/lib/wemany/normalizar.ts`) y siempre se guarda el JSON completo
  en la columna `payload`. Las columnas las define la página: si se agregan campos, aparecen solos en la hoja.

Secretos del Worker (nunca en git). Se fijan una vez y se conservan entre despliegues:

    npx cf workers secrets update WEBHOOK_TOKEN --worker sidiosjugarafutbol --type secret_text --text "<código largo y aleatorio>"
    npx cf workers secrets update WEBHOOK_SIGNING_SECRET --worker sidiosjugarafutbol --type secret_text --text "<secreto que muestra Wemany>"
    npx cf workers secrets update SHEETS_SCRIPT_TOKEN --worker sidiosjugarafutbol --type secret_text --text "<el mismo TOKEN de Code.gs>"
    npx cf workers secrets update SHEETS_SCRIPT_URL --worker sidiosjugarafutbol --type secret_text --text "https://script.google.com/macros/s/.../exec"

Apps Script: en la hoja, Extensiones > Apps Script, pegar `Code.gs` con `__TOKEN__` reemplazado, y publicar como
aplicación web (ejecutar como: yo, acceso: cualquier persona). Si se edita el script hay que crear una nueva versión de la
implementación (Implementar > Administrar implementaciones > editar > Nueva versión); la URL no cambia.

## Seguridad (pentest del 17-nov-2026)

Se probó el sitio publicado y el webhook (acceso sin credenciales, firma, replay, JSON hostil, inyección en la hoja, fuga de secretos,
cabeceras, dependencias). Correcciones aplicadas: cabeceras de seguridad (`next.config.ts`), tope de profundidad al copiar el JSON
(`limitar` en `normalizar.ts`), **neutralización de fórmulas** (`neutralizarFormula`: Google Sheets evalúa `=...` aunque la celda sea de
texto, y el comprador escribe su propio nombre/correo/UTM), y el id de evento se toma del cuerpo firmado (no del encabezado).

Ajustes de Cloudflare (zona `sidiosjugarafutbol.com`), aplicados con `npx cf zones settings edit <ajuste> -z sidiosjugarafutbol.com --body '{"value":"..."}'`:
`always_use_https` = `on` (http redirige a https) y `min_tls_version` = `1.2` (antes 1.0). Para revertir: mismo comando con el valor anterior.

Riesgos conocidos y aceptados:
- `npm audit` marca avisos en herramientas de construcción (`vite`, `vinext`, `picomatch`, `satori`...). Se comprobó que no están en el
  código ejecutable del Worker (solo en mapas de código fuente que no se publican). `npm audit fix --force` bajaría `vinext`: no hacerlo.
- La CSP usa `'unsafe-inline'` en scripts y estilos porque el arranque de vinext/React lo necesita.
- Las URL con barra final (`/api/wemany/<token>/`) redirigen (308) y Wemany cuenta las redirecciones como fallo: usar la URL sin barra final.
- Sin límite de peticiones propio: las no autorizadas se descartan antes de leer el cuerpo; Cloudflare absorbe el tráfico.
