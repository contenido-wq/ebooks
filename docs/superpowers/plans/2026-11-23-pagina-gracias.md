# Página de gracias con descarga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que quien compra en Wemany llegue a `/gracias`, vea la portada y pueda descargar el PDF y entrar a su cuenta de Wemany.

**Architecture:** `/gracias` es una página de servidor que reutiliza `Cover`, `ButtonLink` y la paleta de la landing. El PDF vive en un bucket R2 (binding `LIBRO_PDF`) y se sirve por la ruta `/descarga`, que lo transmite como adjunto sin exponer el archivo. Los datos del libro (clave del PDF, nombre de descarga, URL de Wemany) van en `src/content/books.ts`.

**Tech Stack:** Next 16-like (vinext) + React, Tailwind v4, Vitest + Testing Library, Cloudflare Workers + R2.

**Spec:** `docs/superpowers/specs/2026-11-23-pagina-gracias-design.md`

## Global Constraints

- Antes de escribir código de Next, leer la guía pertinente en `node_modules/next/dist/docs/` (AGENTS.md: "This is NOT the Next.js you know").
- Toda la UI en español neutro latinoamericano. Sin hashtags.
- Estilo de la landing: fondo `bg-negro`/`bg-carbon`, borde `border-oro/35`, títulos `font-serif`, `texto-oro`, botones con `ButtonLink` (`primary` y `secondary`).
- `/gracias`: `robots: { index: false, follow: false }`. `/descarga`: `Cache-Control: private, no-store`.
- El PDF nunca va en `public/` ni en el bundle (pesa 37 MB; el límite de assets de Workers es ~25 MB).
- El botón de WhatsApp solo aparece si hay `NEXT_PUBLIC_WHATSAPP_NUMBER` (usar `buildWhatsappUrl` de `src/lib/whatsapp.ts`).
- Cada tarea termina con `npm test`, `npm run typecheck` y `npm run lint` en verde.
- Rama: `feat/pagina-gracias`. Commits al final de cada tarea.

## Review Focus

1. El objeto del PDF no existe en R2 (aún no subido): `/descarga` responde 404 con mensaje en español, no 500.
2. El binding `LIBRO_PDF` no está disponible (desarrollo local): `/descarga` responde 404, no revienta.
3. Nombre de archivo con espacios o tildes: `Content-Disposition` usa `filename*=UTF-8''…` además de `filename`.
4. `urlCuentaWemany` es `null` (aún sin dato): el botón de Wemany no se muestra (no un enlace roto).
5. Sin número de WhatsApp: no se muestra la ayuda por WhatsApp.

---

### Task 1: Datos del libro y FAQ

**Files:**
- Modify: `src/content/types.ts` (tipo `Book`)
- Modify: `src/content/books.ts` (libro destacado: `postCompra` y FAQ)
- Test: `src/content/books.test.ts` (crear si no existe)

**Interfaces:**
- Produces: `type PostCompra = { pdfClave: string; pdfNombre: string; urlCuentaWemany: string | null }` exportado de `src/content/types.ts`; `Book.postCompra?: PostCompra`.

- [ ] **Step 1: Write the failing test** en `src/content/books.test.ts`: `getFeaturedBook().postCompra` tiene `pdfClave === "si-dios-jugara-futbol.pdf"`, `pdfNombre === "Si Dios jugara futbol.pdf"` y `urlCuentaWemany === null`; y la respuesta de la FAQ "¿Puedo descargar el PDF?" empieza con "Sí" y no contiene "No.".
- [ ] **Step 2: Run** `npx vitest run src/content/books.test.ts` — Expected: FAIL (propiedad indefinida / FAQ dice "No").
- [ ] **Step 3: Implement** el tipo `PostCompra` y el campo opcional en `Book`; en `books.ts` añadir `postCompra` con los valores del test (comentario: `urlCuentaWemany` se completa cuando el dueño dé el enlace) y reescribir la respuesta de la FAQ: sí se puede descargar en la página de gracias tras comprar, y también se puede leer desde el enlace de acceso.
- [ ] **Step 4: Run** `npx vitest run src/content/books.test.ts` — Expected: PASS. Luego `npm test` completo (otros tests pueden asertar el texto viejo de la FAQ; actualizarlos).
- [ ] **Step 5: Commit** `feat: datos de post-compra del libro y FAQ de descarga`.

### Task 2: Servir el PDF desde R2

**Files:**
- Create: `src/lib/libro-pdf.ts`
- Create: `src/app/descarga/route.ts`
- Modify: `cloudflare.config.ts` (binding `LIBRO_PDF`)
- Test: `src/lib/libro-pdf.test.ts`

**Interfaces:**
- Produces:
  - `type BucketLectura = { get(clave: string): Promise<{ body: ReadableStream; size: number } | null> }`
  - `servirPdf(bucket: BucketLectura | undefined, clave: string, nombre: string): Promise<Response>`
  - `GET` de `/descarga` (usa `getFeaturedBook().postCompra`).

- [ ] **Step 1: Write the failing tests** en `libro-pdf.test.ts` con un bucket falso:
  - objeto presente → status 200, `Content-Type: application/pdf`, `Content-Length` igual al tamaño, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`, y `Content-Disposition` que contiene `attachment` y `filename*=UTF-8''Si%20Dios%20jugara%20futbol.pdf`.
  - objeto ausente (`get` devuelve `null`) → 404 y cuerpo en español ("El libro todavía no está disponible…").
  - `bucket` `undefined` → 404 igual que el anterior.
  - nombre con tilde (`"Fútbol.pdf"`) → `filename*` queda codificado (`F%C3%BAtbol.pdf`) y `filename=` lleva solo ASCII (`Futbol.pdf`).
- [ ] **Step 2: Run** `npx vitest run src/lib/libro-pdf.test.ts` — Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `servirPdf` como función pura (sin importar `cloudflare:workers`); codificar con `encodeURIComponent` para `filename*` y quitar diacríticos/no-ASCII para `filename`.
- [ ] **Step 4: Implement** `src/app/descarga/route.ts`: `export const dynamic = "force-dynamic"`; `GET` obtiene el bucket con el mismo patrón de `src/app/api/wemany/[token]/route.ts` (import dinámico de `cloudflare:workers`, `catch` → `undefined`), lee `getFeaturedBook().postCompra` (si no existe, 404) y llama `servirPdf(bucket, pdfClave, pdfNombre)`.
- [ ] **Step 5: Implement** en `cloudflare.config.ts` el binding `LIBRO_PDF: bindings.r2(...)` dentro de `env`; confirmar la firma exacta con `npm run typecheck` (si pide el nombre del bucket, usar `sidiosjugarafutbol-libro`).
- [ ] **Step 6: Run** `npx vitest run src/lib/libro-pdf.test.ts` y `npm run typecheck` — Expected: PASS.
- [ ] **Step 7: Commit** `feat: ruta /descarga que sirve el PDF desde R2`.

### Task 3: La página de gracias

**Files:**
- Create: `src/components/book/gracias.tsx`
- Create: `src/app/gracias/page.tsx`
- Test: `src/components/book/gracias.test.tsx`

**Interfaces:**
- Consumes: `Book`, `PostCompra` (Task 1); `Cover`, `ButtonLink`; `buildWhatsappUrl`.
- Produces: `Gracias({ book, whatsappUrl }: { book: Book; whatsappUrl?: string | null })` y la ruta `/gracias`.

- [ ] **Step 1: Write the failing tests** en `gracias.test.tsx` (libro de prueba con `postCompra`):
  - muestra el encabezado `heading` con "Gracias" y el título del libro, y la portada (`getByAltText("Portada de …")`).
  - hay un enlace "Descargar mi libro (PDF)" con `href="/descarga"`.
  - con `urlCuentaWemany` definido: enlace "Entrar a mi cuenta en Wemany" con ese `href`, `rel` que contiene `noopener`, `target="_blank"`.
  - con `urlCuentaWemany: null`: NO existe el enlace de Wemany.
  - con `whatsappUrl`: enlace de ayuda por WhatsApp; sin `whatsappUrl`: no existe.
- [ ] **Step 2: Run** `npx vitest run src/components/book/gracias.test.tsx` — Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `Gracias` como sección oscura con la misma tarjeta de `PurchasePanel` (`bg-negro` exterior, `rounded-3xl border border-oro/35 bg-carbon`): marca del libro arriba, `h1` "¡Gracias, ya eres parte!" con `texto-oro`, portada con `cover-tilt` a la izquierda (escritorio) o arriba (móvil), botón `primary` de descarga y botón `secondary` de Wemany, texto de ayuda y botón de WhatsApp. Solo texto estático y los datos del libro.
- [ ] **Step 4: Implement** `src/app/gracias/page.tsx`: `metadata` con título "¡Gracias por tu compra!" y `robots: { index: false, follow: false }`; el componente de página arma `whatsappUrl` con `buildWhatsappUrl(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "", "Hola, compré el libro … y necesito ayuda con mi descarga.")` (mismo patrón que `book-landing.tsx`) y llama `notFound()` si el libro no tiene `postCompra`.
- [ ] **Step 5: Run** `npx vitest run src/components/book/gracias.test.tsx` — Expected: PASS. Luego `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] **Step 6: Verificar a ojo** con `npm run dev`: abrir `http://localhost:3000/gracias` en ancho móvil (390 px) y escritorio; comparar con la landing (mismos dorados y tipografías). Si hay foto de Juan Guillermo y Jeins en `public/imagenes/`, usarla como fondo con degradado oscuro como hace `cierre.tsx`.
- [ ] **Step 7: Commit** `feat: página /gracias con portada, descarga y acceso a Wemany`.

### Task 4: Documentar y dejar listo para publicar

**Files:**
- Modify: `README.md` (sección "Página de gracias y descarga")

- [ ] **Step 1: Documentar** en el README: (a) cómo subir el PDF al bucket (`npx cf r2 …` según la CLI; confirmar el comando con `npx cf --help`), con la clave exacta `si-dios-jugara-futbol.pdf`; (b) configurar en Wemany la redirección post-pago a `https://sidiosjugarafutbol.com/gracias`; (c) completar `urlCuentaWemany` en `books.ts`; (d) la protección es ligera: quien comparta el enlace descarga gratis, y la mejora es verificar el email contra el webhook.
- [ ] **Step 2: Run** `npm test && npm run typecheck && npm run lint && npm run build` — Expected: todo verde.
- [ ] **Step 3: Commit** `docs: cómo publicar la página de gracias`.

---

## Self-review

- **Cobertura del diseño:** `/gracias` (Task 3), `/descarga` + R2 (Task 2), botón Wemany y WhatsApp (Task 3), FAQ (Task 1), noindex/no-store (Tasks 2 y 3), pendientes del dueño (Task 4). La foto opcional se cubre en Task 3 paso 6.
- **Consistencia de tipos:** `PostCompra` (Task 1) se consume con los mismos nombres (`pdfClave`, `pdfNombre`, `urlCuentaWemany`) en Tasks 2 y 3; `servirPdf` y `BucketLectura` solo viven en Task 2.
- **Fuera del plan, a propósito:** verificación por email, PDF marcado y lector (no metas del diseño). `HEAD` y `Range` no se implementan; si descargas de 37 MB en celulares se cortan, se añade soporte de `Range`.
