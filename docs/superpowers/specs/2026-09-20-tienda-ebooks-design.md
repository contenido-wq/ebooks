# Tienda de ebooks — Diseño

Fecha: 2026-09-20
Editor y distribuidor: Jhei Trujillo (@elsolucionador). La tienda lleva su marca ("Ebooks de Jhei Trujillo").
Primer libro: *Si Dios jugara fútbol*, de Juan Guillermo Ricaurte y Jeins Durán (primera edición, Medellín, junio de 2026).
Derechos: el dueño confirmó que cuenta con autorización por escrito de los titulares del copyright para la venta digital.

## 1. Objetivo

Una tienda propia, sencilla y muy bonita, donde se venden ebooks digitales a público hispano. El resultado final es un **link para la bio** de Instagram y TikTok y un **QR** para compartir. Se construye para un libro, pero el modelo de datos permite sumar más.

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Compradores | Latam, España y USA hispano. Precio base en USD, con COP para Colombia |
| Formato del libro | PDF ya maquetado |
| Acceso | Solo lectura online. Sin descarga. Marca de agua con el email del comprador |
| Identidad del lector | Sin contraseña: enlace mágico por email |
| Look | Editorial cálido y elegante, con la portada como protagonista |
| Pagos | **Stripe** (USD, tarjetas, Apple Pay, Google Pay y otros métodos) + **Wompi** (COP: PSE, Nequi, tarjetas locales) |
| Cuenta de Stripe | Aún no existe. Se abre una LLC en EE.UU. (Stripe Atlas). Mientras tanto se desarrolla con Stripe en modo test |
| Precio de lanzamiento | US$19.99, configurable. El precio en COP se fija aparte, no por conversión automática |

## 3. Fuera de alcance (por ahora)

Descargas de PDF o EPUB, cupones, afiliados, suscripciones, varios idiomas, lector con texto adaptable. El diseño deja espacio para sumarlos, pero no se construyen.

## 4. Stack

Next.js (App Router) + TypeScript, Tailwind, Supabase (Postgres, Auth, Storage privado), Stripe, Wompi, Resend para email, `sharp` para procesar imágenes. Despliegue en Vercel con dominio propio.

## 5. Páginas

**Públicas**
- `/`: la tienda del libro principal. Portada, sinopsis, capítulo gratis, testimonios, garantía de 7 días, preguntas frecuentes, botón de compra. Botón de compra fijo en celular.
- `/libro/[slug]`: la página de un ebook. Permite sumar libros sin rehacer nada.
- `/ig`, `/tiktok`, `/wa`: redirigen a la tienda con UTM de cada canal.
- `/qr`: redirige a la tienda con UTM `qr`. El QR impreso apunta aquí y nunca cambia.
- `/terminos`, `/privacidad`, `/reembolsos`.

**Del lector**
- `/biblioteca`: pide el email, envía un enlace mágico y lista los libros comprados.
- `/leer/[slug]`: el lector online.

**Administración**
- `/admin`: ventas, compradores, leads, reenviar acceso, revocar acceso y reconciliar pagos. Solo para el dueño.

## 6. Flujo de compra

1. El comprador elige método: Stripe (USD) o Wompi (COP).
2. Paga indicando su email, sin crear cuenta.
3. El webhook del proveedor llega al servidor. Se verifica la firma y se aplica idempotencia por `order_id`.
4. Con el pago confirmado se marca la orden como `paid`, se crea el acceso (`entitlement`), se envía el evento `Purchase` a Meta y se manda el email con el enlace mágico.
5. Mientras el webhook llega, el comprador ve "Estamos confirmando tu pago" que se actualiza solo.

### Adaptador de pagos

Ambos proveedores implementan la misma interfaz:

- `crearCheckout(orden) → { url }`
- `verificarWebhook(request) → EventoPago` (normalizado: `pagado`, `fallido`, `reembolsado`)

El resto de la tienda solo conoce `EventoPago`. Cambiar o sumar un proveedor no toca la lógica de accesos.

Un reembolso o contracargo dispara `reembolsado`, que revoca el acceso automáticamente.

## 7. Modelo de datos (Supabase)

- `books`: id, slug, título, subtítulo, autor, portada, precio_usd, precio_cop, activo.
- `book_pages`: book_id, número, ruta_imagen, es_vista_previa.
- `orders`: id, book_id, email, proveedor (`stripe` | `wompi`), moneda, monto, estado (`pending` | `paid` | `failed` | `refunded`), id_externo, utm_source, creado_en.
- `entitlements`: id, email, book_id, order_id, activo. Es la fuente de verdad de quién puede leer.
- `reading_progress`: email, book_id, última_página, actualizado_en.
- `leads`: email, book_id, origen, creado_en. Se llena con el capítulo gratis.
- `webhook_events`: id_externo, proveedor, procesado_en. Garantiza la idempotencia.

RLS activo en todas las tablas. Las escrituras de pagos y accesos las hace solo el servidor con la clave de servicio. El correo se guarda en minúsculas y el acceso se enlaza al usuario de Auth por ese correo verificado.

## 8. Lector y protección

**Preparación (una vez):** un script convierte cada página del PDF en una imagen WebP y las sube a un bucket **privado** de Supabase (`book-pages/{book_id}/{n}.webp`). El PDF original nunca se sirve.

**Servir páginas:** la ruta `/api/leer/[slug]/[n]` comprueba sesión y `entitlement` activo. Luego lee la imagen del bucket, le **estampa el email del comprador** con `sharp` de forma sutil y la devuelve directamente con `Cache-Control: private, max-age=300`. Las URLs del bucket nunca salen del servidor, porque la imagen final es distinta para cada comprador.

**Límite de ritmo:** más de 30 páginas por minuto por comprador devuelven 429. El precargado de páginas vecinas (±2) entra dentro de ese margen. Frena la descarga masiva con scripts.

**Otras medidas:** se bloquean el clic derecho y el arrastrar imágenes.

**Limitación conocida:** esto disuade y permite rastrear filtraciones, pero no es DRM. Una captura de pantalla siempre es posible.

**Interfaz:** pensada para celular. Deslizar para cambiar de página, pinch para hacer zoom, barra de progreso, índice por capítulos y última página recordada. Como el libro es un PDF maquetado, en pantallas chicas hace falta zoom.

**Vista previa gratuita:** las páginas con `es_vista_previa` se leen sin comprar, pero piden el email (se guarda en `leads`). Se sirven sin marca de agua.

## 9. Conexiones y medición

- **Links de bio y QR:** ver sección 5. El QR se genera en PNG y SVG de alta resolución, más una tarjeta 9:16 con la portada para historias.
- **Vista previa al compartir:** metadatos Open Graph con portada, título y descripción.
- **WhatsApp:** botón con `wa.me` y un mensaje prellenado.
- **Meta:** Pixel en el navegador (`ViewContent`, `InitiateCheckout`) y Conversions API en el servidor para `Purchase`, con el mismo `event_id` para deduplicar.
- **GA4:** `view_item`, `begin_checkout`, `purchase`.
- **ManyChat:** lo configura el dueño fuera del código, apuntando a los links con UTM.

## 10. Emails (Resend)

1. Confirmación de compra con el enlace mágico de acceso.
2. Día 3: invitación a dejar reseña.
3. Día 7: puente hacia otra lectura o comunidad del editor. El destino exacto se define en la Fase 3 con el dueño.
4. Al pedir la vista previa: bienvenida con el enlace al capítulo gratis.

## 11. Diseño visual

- **Colores:** fondo crema de papel, texto en tinta oscura, acento verde cancha profundo y detalles dorados. La paleta final se afina con la portada real.
- **Tipografía:** serif elegante en títulos (tipo Fraunces) y sans limpia para el texto, cargadas con `next/font`.
- **Portada:** protagonista, con sombra suave y ligero efecto 3D al pasar el cursor.
- **Idioma y voz:** español neutro latinoamericano, con la voz de Jhei y storytelling.
- Animaciones suaves. Diseño primero para celular, porque el tráfico viene de redes.

## 12. Manejo de errores

| Situación | Respuesta |
|---|---|
| Pago hecho, webhook tarda | Pantalla "confirmando" con actualización automática. Reintentos del proveedor. Reconciliación manual en `/admin` |
| No llega el email | `/biblioteca` reenvía el enlace. El admin también puede reenviarlo |
| Enlace mágico vencido | Mensaje claro y botón para pedir uno nuevo |
| Reembolso o contracargo | El webhook revoca el acceso |
| Una pasarela cae | La otra sigue funcionando, por el aislamiento del adaptador |
| Límite de ritmo excedido | Respuesta 429 con mensaje amable en el lector |

## 13. Pruebas

- **Unitarias:** verificación de firma de webhooks, idempotencia, permisos de acceso, límite de ritmo, normalización de `EventoPago`.
- **Integración:** compra completa con Stripe en modo test y Wompi en sandbox. Comprobar que sin compra ninguna página del libro se pueda abrir, ni por la API ni directo al bucket.
- **Punta a punta (Playwright):** compra de prueba, email y lectura, con vista de celular (390 px).
- **Con el PDF real:** fidelidad de las páginas y legibilidad de la marca de agua.
- **Meta:** verificar `Purchase` y la deduplicación en Test Events.

## 14. Fases de construcción

1. **Base y tienda:** proyecto, landing con el look editorial, contenido de prueba, links por canal y QR.
2. **Lector y protección:** conversión del PDF, enlace mágico, biblioteca y capítulo gratis. *Aquí se necesita el PDF del libro.*
3. **Pagos:** Wompi, Stripe, webhooks, emails, Pixel y CAPI.
4. **Admin y lanzamiento:** `/admin`, páginas legales, dominio y claves reales.

## 15. Tareas del dueño (fuera del código)

- Abrir la LLC y la cuenta de Stripe.
- Crear la cuenta de Wompi (requiere datos legales para la verificación).
- Elegir y comprar el dominio.
- Confirmar con un contador el tratamiento del IVA en Colombia. Según un concepto de la DIAN citado en la investigación, los libros digitales culturales estarían exentos, pero no se verificó de forma independiente.
- Tener a mano el ID de su Pixel de Meta.
- Fijar el precio en COP.

## 16. Riesgos y puntos abiertos

- **Stripe depende de la LLC:** Atlas puede tardar. Se desarrolla en modo test y se conectan las claves al final.
- **Stripe no es *merchant of record*:** con una LLC, el IVA o VAT de compradores internacionales queda a cargo del dueño. Stripe Tax puede ayudar, pero se debe validar con un contador.
- **Wompi cobra solo en COP:** el precio en COP es independiente del precio en USD.
- **Precio de US$19.99:** es más alto que el rango de entrada que sugirió la investigación (US$9–15, sin datos verificados). Depende más de la prueba social: testimonios, capítulo gratis y garantía de 7 días. Como el precio es configurable, se puede ajustar sin tocar código.
- **Protección de contenido:** disuade y rastrea, pero no evita capturas de pantalla.
- **PDF maquetado en celular:** las páginas se ven pequeñas y exigen zoom.
