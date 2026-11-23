# Página de gracias con descarga del libro — Diseño

## Intención
Quien compra en Wemany llega a `/gracias`: confirmación, portada real, botón para descargar el PDF y botón para entrar a su cuenta de Wemany. Así el comprador tiene su libro en el momento, sin esperar un email.

## Metas
- Página `/gracias` con el estilo de la landing (fondo carbón, dorado, Playfair, componentes `Cover` y `ButtonLink`).
- Botón de descarga que abre el PDF del libro en Google Drive (el mismo archivo que ya se entrega tras la compra).
- Botón a la cuenta de Wemany y ayuda por WhatsApp (solo si `NEXT_PUBLIC_WHATSAPP_NUMBER` existe).

## No metas
- Verificar la compra por email (se puede añadir luego con el webhook + KV).
- PDF marcado con el email de cada comprador.
- Lector en línea (Fase 2 sigue pendiente).
- Alojar el PDF en el sitio (R2, `/descarga`): descartado, el PDF ya está en Drive.

## Antimetas
- Que Google indexe la página `/gracias`.

## Decisiones (del dueño)
- Página de gracias a la que redirige Wemany tras el pago; portada + descarga + acceso a Wemany.
- El PDF se entrega desde Google Drive: `https://drive.google.com/file/d/ID_DEL_ARCHIVO/view?usp=sharing`.
- Protección ligera aceptada: quien comparta el link descarga gratis.

## Decisiones (mías, a revisar)
- Se usa el link `/view` tal cual (abre el visor de Drive con botón de descargar). El link de descarga directa (`uc?export=download`) en un archivo de 37 MB muestra una pantalla de "no se puede analizar en busca de virus", así que no se usa.
- El link abre en pestaña nueva (`target="_blank" rel="noopener noreferrer"`).
- `/gracias` con `noindex, nofollow`; no hay sitemap en el proyecto.
- Se actualiza la FAQ "¿Puedo descargar el PDF?" a "Sí".
- Datos nuevos (URL del PDF, URL de Wemany) en `src/content/books.ts`.

## Enfoques considerados
1. PDF en `public/`: no cabe (37 MB, límite ~25 MB de assets de Workers) y se descarga sin pasar por nosotros.
2. PDF en R2 servido por ruta propia: descartado al aparecer el link de Drive; más piezas para el mismo resultado.
3. **Elegido:** botón que enlaza al PDF en Drive. Cero infraestructura nueva.
4. Verificación por email con KV + link temporal: más seguro, más trabajo; queda como mejora.

## Pendiente del dueño
- URL de la cuenta de Wemany.
- Configurar en Wemany la redirección post-pago a `https://sidiosjugarafutbol.com/gracias`.
- Confirmar que el archivo de Drive tenga acceso "Cualquier persona con el enlace".
- Foto opcional (Juan Guillermo y Jeins, horizontal ≥1600 px).
