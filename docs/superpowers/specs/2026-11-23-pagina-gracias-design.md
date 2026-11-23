# Página de gracias con descarga del libro — Diseño

## Intención
Quien compra en Wemany llega a `/gracias`: confirmación, portada real, botón para descargar el PDF y botón para entrar a su cuenta de Wemany. Así el comprador tiene su libro en el momento, sin esperar un email.

## Metas
- Página `/gracias` con el estilo de la landing (fondo carbón, dorado, Playfair, componentes `Cover` y `ButtonLink`).
- Descarga del PDF desde una ruta propia (`/descarga`), sin exponer el archivo en `public/`.
- Botón a la cuenta de Wemany y ayuda por WhatsApp (solo si `NEXT_PUBLIC_WHATSAPP_NUMBER` existe).

## No metas
- Verificar la compra por email (se puede añadir luego con el webhook + KV).
- PDF marcado con el email de cada comprador.
- Lector en línea (Fase 2 sigue pendiente).

## Antimetas
- Que Google indexe la página o el PDF.
- Que el PDF quede dentro del bundle del Worker o en `public/`.

## Decisiones (del dueño)
- Página de gracias a la que redirige Wemany tras el pago; portada + descarga + acceso a Wemany.
- Protección ligera aceptada: quien comparta el link descarga gratis.

## Decisiones (mías, a revisar)
- El PDF (37 MB, supera el límite de ~25 MB de assets de Workers) vive en R2 con binding `LIBRO_PDF`; `/descarga` lo sirve con `Content-Disposition: attachment`.
- `/gracias` con `noindex, nofollow`; fuera del sitemap. `/descarga` con `Cache-Control: private, no-store`.
- Se actualiza la FAQ "¿Puedo descargar el PDF?" a "Sí".
- Datos nuevos (nombre del archivo, URL de Wemany) en `src/content/books.ts`.

## Enfoques considerados
1. Página abierta + PDF en `public/`: no cabe (37 MB) y es descargable sin pasar por nosotros.
2. **Elegido:** página abierta + PDF en R2 servido por ruta propia. Simple, el PDF se puede cambiar o apagar.
3. Verificación por email con KV + link temporal: más seguro, más trabajo; queda como mejora.

## Pendiente del dueño
- Confirmar el PDF final, subirlo a R2, URL de la cuenta de Wemany, configurar la redirección post-pago en Wemany.
- Foto opcional (Juan Guillermo y Jeins, horizontal ≥1600 px).
