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
    npm run imagenes -- "<carpeta de las escenas>" /tmp/tableta-real.png

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
