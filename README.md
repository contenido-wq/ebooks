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
(por ejemplo `"/portada.webp"`). Antes de lanzar, fija el precio real en pesos (`precioCop`).

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
    NEXT_PUBLIC_SITE_URL=https://sidiosjugarafutbol.com npm run deploy:vinext

- Hay que pasar `NEXT_PUBLIC_SITE_URL` al desplegar: `.env.local` (para desarrollo) tiene `localhost` y ganaría.
- Cuando se defina el WhatsApp, agregar también `NEXT_PUBLIC_WHATSAPP_NUMBER=57...` en el mismo comando.
- La imagen para compartir (`src/app/opengraph-image.png`) es un archivo fijo, sin precio. Si cambia la portada, hay que regenerarla.
- Las imágenes se sirven sin optimizador (`images.unoptimized`): Cloudflare Images las recomprimía y se perdía la textura de la piel.
- Dominio y `www` se declaran en `cloudflare.config.ts` (`domains`).

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
