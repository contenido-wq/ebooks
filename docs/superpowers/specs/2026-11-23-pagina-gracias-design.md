# Página de gracias con descarga verificada — Diseño

> **Historia:** primero `/gracias` tenía un botón a un PDF en Drive (cualquiera con el link bajaba el libro). Luego se intentó entregar el libro
> solo dentro de Wemany, pero Wemany no deja subir el PDF. Este diseño es el vigente: **descarga verificada con enlace de un solo uso**.

## Intención
Que solo quien pagó pueda descargar el PDF, y que el enlace de descarga no sirva para compartir: cada vez se crea uno nuevo, vale una sola vez
y caduca en 10 minutos.

## Cómo funciona
1. **Wemany avisa de una compra aprobada** (webhook, ya probado). El Worker guarda en Cloudflare KV la **huella SHA-256 del correo**
   (nunca el correo en claro) en `pagado:<huella>`.
2. **En `/gracias`**, la persona escribe el correo con el que pagó. `POST /api/gracias` revisa el límite de intentos y la huella en KV.
   Si coincide, crea un ticket aleatorio (256 bits) en KV con vida de 10 minutos y responde con `/descarga?t=<ticket>`.
3. **`GET /descarga?t=<ticket>`** canjea el ticket (lo lee y lo borra) y entrega el PDF desde un bucket **privado de R2** como adjunto.
   Un ticket usado, vencido o inventado responde 410 con un mensaje en español.
4. El PDF **no** está en `public/`, ni en Drive, ni en el HTML. La página abierta no contiene ningún enlace al libro.

## Metas
- Quien no pagó no puede descargar; un enlace copiado a otro navegador no sirve (ya se usó o caducó).
- No guardar correos en claro. Límite de intentos por IP y por correo.
- Mismo estilo de la landing. Ayuda por WhatsApp si no encuentra su compra.

## No metas
- Evitar que un comprador pase el archivo ya descargado (solo se evita con PDF marcado por comprador: otro proyecto).
- Enviar el enlace por correo (necesita un servicio de envío y verificar el dominio): mejora posible. Hoy, quien sepa el correo de un comprador
  podría pedir el enlace; el límite de intentos lo reduce, no lo elimina.
- Reembolsos: no se revoca el acceso (no se conoce el nombre del evento de Wemany).

## Antimetas
- Que Google indexe `/gracias` o `/descarga`.
- Que un evento de prueba de Wemany (`"test": true`, correo de muestra) conceda acceso.
- Que un evento que no sea compra aprobada (reembolso, rechazo, carrito) conceda acceso.

## Decisiones (del dueño)
- Wemany no deja subir el PDF → la descarga se verifica en este sitio.
- Aprobó mover el PDF a Cloudflare (R2) y quitarlo de Drive después.
- Aprobó el formulario del correo con enlace de un solo uso y 10 minutos.

## Decisiones (mías, a revisar)
- Uso único "de mejor esfuerzo": KV tarda hasta ~1 minuto en propagarse, así que dos peticiones casi simultáneas podrían canjear el mismo ticket.
- Todas las compras aprobadas de este webhook dan acceso al libro (se asume que la comunidad solo vende este libro).
- Bucket `sidiosjugarafutbol-libro`, clave `si-dios-jugara-futbol.pdf`; KV `COMPRADORES`; binding R2 `LIBRO_PDF`.
- Los tickets y contadores viven en el mismo KV, con vencimiento.

## Pendiente del dueño
- Quitar el PDF de Drive cuando se confirme que la descarga funciona en producción.
- Número definitivo de WhatsApp.
