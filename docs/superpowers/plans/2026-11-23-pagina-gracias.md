# Página de gracias con descarga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que quien compra en Wemany llegue a `/gracias`, vea la portada y pueda descargar el PDF y entrar a su cuenta de Wemany.

**Architecture:** `/gracias` es una página de servidor que reutiliza `Cover`, `ButtonLink` y la paleta de la landing. El botón de descarga enlaza al PDF en Google Drive. Los datos del libro (URL del PDF, URL de Wemany) van en `src/content/books.ts`.

**Tech Stack:** vinext/Next + React, Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-23-pagina-gracias-design.md`

## Global Constraints

- Antes de escribir código de Next, leer la guía pertinente en `node_modules/next/dist/docs/` (AGENTS.md: "This is NOT the Next.js you know").
- Toda la UI en español neutro latinoamericano. Sin hashtags.
- Estilo de la landing: fondo `bg-negro`/`bg-carbon`, borde `border-oro/35`, títulos `font-serif`, `texto-oro`, botones con `ButtonLink` (`primary` y `secondary`).
- `/gracias`: `robots: { index: false, follow: false }`.
- URL del PDF (valor exacto): `https://drive.google.com/file/d/ID_DEL_ARCHIVO/view?usp=sharing`. Enlaces externos con `target="_blank"` y `rel="noopener noreferrer"`.
- El botón de WhatsApp solo aparece si hay `NEXT_PUBLIC_WHATSAPP_NUMBER` (usar `buildWhatsappUrl` de `src/lib/whatsapp.ts`).
- Cada tarea termina con `npm test`, `npm run typecheck` y `npm run lint` en verde.
- Rama: `feat/pagina-gracias`. Commits al final de cada tarea.

## Review Focus

1. `urlCuentaWemany` es `null` (aún sin dato): el botón de Wemany no se muestra (no un enlace roto).
2. Sin número de WhatsApp: no se muestra la ayuda por WhatsApp.
3. El libro no tiene `postCompra`: `/gracias` responde 404, no revienta.
4. `/gracias` no debe indexarse: la metadata lleva `noindex, nofollow`.

---

### Task 1: Datos del libro y FAQ

**Files:**
- Modify: `src/content/types.ts` (tipo `Book`)
- Modify: `src/content/books.ts` (libro destacado: `postCompra` y FAQ)
- Test: `src/content/books.test.ts` (crear si no existe)

**Interfaces:**
- Produces: `type PostCompra = { urlDescarga: string; urlCuentaWemany: string | null }` exportado de `src/content/types.ts`; `Book.postCompra?: PostCompra`.

- [ ] **Step 1: Write the failing test** en `src/content/books.test.ts`: `getFeaturedBook().postCompra?.urlDescarga` es exactamente la URL de Drive de las restricciones; `urlCuentaWemany === null`; y la respuesta de la FAQ "¿Puedo descargar el PDF?" empieza con "Sí" y no contiene "No.".
- [ ] **Step 2: Run** `npx vitest run src/content/books.test.ts` — Expected: FAIL (propiedad indefinida / FAQ dice "No").
- [ ] **Step 3: Implement** el tipo `PostCompra` y el campo opcional en `Book`; en `books.ts` añadir `postCompra` con los valores del test (comentario: `urlCuentaWemany` se completa cuando el dueño dé el enlace) y reescribir la respuesta de la FAQ: sí, tras comprar se descarga el PDF desde la página de gracias; también se puede leer en línea con el enlace de acceso.
- [ ] **Step 4: Run** `npx vitest run src/content/books.test.ts` — Expected: PASS. Luego `npm test` completo (otros tests pueden asertar el texto viejo de la FAQ; actualizarlos).
- [ ] **Step 5: Commit** `feat: datos de post-compra del libro y FAQ de descarga`.

### Task 2: La página de gracias

**Files:**
- Create: `src/components/book/gracias.tsx`
- Create: `src/app/gracias/page.tsx`
- Test: `src/components/book/gracias.test.tsx`

**Interfaces:**
- Consumes: `Book`, `PostCompra` (Task 1); `Cover`, `ButtonLink`; `buildWhatsappUrl`.
- Produces: `Gracias({ book, whatsappUrl }: { book: Book; whatsappUrl?: string | null })` y la ruta `/gracias`.

- [ ] **Step 1: Write the failing tests** en `gracias.test.tsx` (libro de prueba con `postCompra`):
  - muestra un `heading` con "Gracias" y la portada (`getByAltText("Portada de …")`).
  - enlace "Descargar mi libro (PDF)" con `href` igual a `urlDescarga`, `target="_blank"` y `rel` que contiene `noopener`.
  - con `urlCuentaWemany` definido: enlace "Entrar a mi cuenta en Wemany" con ese `href`, `target="_blank"` y `rel` con `noopener`.
  - con `urlCuentaWemany: null`: NO existe el enlace de Wemany.
  - con `whatsappUrl`: enlace de ayuda por WhatsApp; sin `whatsappUrl`: no existe.
  - un libro sin `postCompra` hace que `Gracias` no pinte el botón de descarga (la página lo trata con 404).
- [ ] **Step 2: Run** `npx vitest run src/components/book/gracias.test.tsx` — Expected: FAIL (módulo no existe).
- [ ] **Step 3: Implement** `Gracias` como sección oscura con la misma tarjeta de `PurchasePanel` (`bg-negro` exterior, `rounded-3xl border border-oro/35 bg-carbon`): nombre del libro arriba, `h1` "¡Gracias, ya eres parte!" con `texto-oro`, portada con `cover-tilt` a la izquierda (escritorio) o arriba (móvil), botón `primary` de descarga y botón `secondary` de Wemany, texto de ayuda y botón de WhatsApp.
- [ ] **Step 4: Implement** `src/app/gracias/page.tsx`: `metadata` con título "¡Gracias por tu compra!" y `robots: { index: false, follow: false }`; la página arma `whatsappUrl` con `buildWhatsappUrl(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "", "Hola, compré el libro … y necesito ayuda con mi descarga.")` (mismo patrón que `book-landing.tsx`) y llama `notFound()` si el libro no tiene `postCompra`.
- [ ] **Step 5: Run** `npx vitest run src/components/book/gracias.test.tsx` — Expected: PASS. Luego `npm test`, `npm run typecheck`, `npm run lint`.
- [ ] **Step 6: Verificar a ojo** con `npm run dev`: abrir `http://localhost:3000/gracias` en ancho móvil (390 px) y escritorio; comparar con la landing (mismos dorados y tipografías). Si hay foto de Juan Guillermo y Jeins en `public/imagenes/`, usarla de fondo con degradado oscuro como hace `cierre.tsx`.
- [ ] **Step 7: Commit** `feat: página /gracias con portada, descarga y acceso a Wemany`.

### Task 3: Documentar y dejar listo para publicar

**Files:**
- Modify: `README.md` (sección "Página de gracias")

- [ ] **Step 1: Documentar** en el README: (a) configurar en Wemany la redirección post-pago a `https://sidiosjugarafutbol.com/gracias`; (b) el PDF se entrega desde Drive (el archivo debe estar con acceso "Cualquier persona con el enlace"); para cambiarlo, editar `postCompra.urlDescarga` en `books.ts`; (c) completar `urlCuentaWemany`; (d) la protección es ligera: quien comparta el enlace descarga gratis, y la mejora es verificar el email contra el webhook.
- [ ] **Step 2: Run** `npm test && npm run typecheck && npm run lint && npm run build` — Expected: todo verde.
- [ ] **Step 3: Commit** `docs: cómo publicar la página de gracias`.

---

## Self-review

- **Cobertura del diseño:** `/gracias` y botones (Task 2), URL de Drive y FAQ (Task 1), noindex (Task 2), pendientes del dueño (Task 3). Foto opcional en Task 2 paso 6.
- **Consistencia de tipos:** `PostCompra` (`urlDescarga`, `urlCuentaWemany`) se define en Task 1 y se usa con esos mismos nombres en Task 2.
- **Fuera del plan, a propósito:** R2, ruta `/descarga`, verificación por email, PDF marcado y lector.
