# Descarga verificada Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Solo quien pagó descarga el PDF, con un enlace de un solo uso que caduca en 10 minutos.

**Architecture:** El webhook de Wemany guarda la huella SHA-256 del correo en KV. `/gracias` pide el correo, `POST /api/gracias` crea un ticket aleatorio en KV y `GET /descarga` lo canjea y transmite el PDF desde R2.

**Tech Stack:** vinext/Next, Cloudflare Workers + KV + R2, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-23-pagina-gracias-design.md`

## Global Constraints
- Leer la guía de Next en `node_modules/next/dist/docs/` antes de usar una API de Next (AGENTS.md).
- UI en español neutro latinoamericano. Nunca guardar ni registrar correos en claro; solo huellas.
- El PDF y su URL no van en el repo ni en el HTML. Repositorio público.
- Bindings: `COMPRADORES` (KV), `LIBRO_PDF` (R2). Sin secretos nuevos.
- Cada tarea termina con `npm test`, `npm run typecheck` (solo `src/`) y `npx eslint src`.

## Review Focus
1. Correo con mayúsculas o espacios: coincide con el de la compra.
2. Ticket usado dos veces, vencido o inventado: 410, sin PDF.
3. Evento de prueba (`test: true`) o que no sea compra aprobada: no concede acceso.
4. Más de 5 intentos por IP en 10 minutos: 429.
5. KV o R2 no disponibles: respuesta 503 en español, nunca un 500 con detalles.

---

### Task 1: Núcleo de acceso (`src/lib/acceso/`)
**Files:** Create `huella.ts`, `compradores.ts`, `tickets.ts` + `*.test.ts`.
**Interfaces (Produces):**
- `type Almacen = { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>; delete(k: string): Promise<void> }`
- `normalizarCorreo(c: string): string | null` (recorta, minúsculas, valida forma básica)
- `huellaCorreo(c: string): Promise<string>` (SHA-256 hex del correo normalizado)
- `registrarCompra(a: Almacen, correo: string): Promise<boolean>`; `esComprador(a: Almacen, correo: string): Promise<boolean>`
- `crearTicket(a: Almacen): Promise<string>` (32 bytes aleatorios, vida 600 s); `canjearTicket(a: Almacen, t: string): Promise<boolean>` (lee y borra)
- `permitirIntento(a: Almacen, clave: string): Promise<boolean>` (máx. 5 por 10 min)
- [ ] Tests primero (RED), luego código (GREEN), commit.

### Task 2: El webhook concede el acceso
**Files:** Modify `src/lib/wemany/recibir.ts` (+ `recibir.test.ts`), `src/app/api/wemany/[token]/route.ts`.
**Interfaces:** `EntornoWebhook.COMPRADORES?: Almacen`; `esCompraAprobada(evento: string): boolean` (acepta `approved|aprobad`, rechaza `refund|reembols|chargeback|declin|rechaz|cancel|abandon`).
- [ ] Tests: aprobada guarda huella; prueba (`test: true`), reembolso y carrito no; sin KV sigue escribiendo la hoja; falla de KV → 502.
- [ ] Implementar y commit.

### Task 3: Rutas `POST /api/gracias` y `GET /descarga`
**Files:** Create `src/lib/cloudflare-env.ts`, `src/lib/acceso/descarga.ts` (+ test), `src/app/api/gracias/route.ts`, `src/app/descarga/route.ts`.
**Interfaces:** `verificarCorreo(env, correo, ip): Promise<{estado:number; cuerpo:object}>`; `entregarPdf(env, ticket): Promise<Response>` (R2 `LIBRO_PDF`, clave `si-dios-jugara-futbol.pdf`, `Content-Disposition: attachment`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`).
- [ ] Tests con KV y R2 falsos: coincide → 200 con `/descarga?t=…`; no coincide → 404; intentos → 429; JSON inválido → 400; ticket → 200 PDF y segundo canje → 410; sin bindings → 503.

### Task 4: Página `/gracias`
**Files:** Create `src/components/book/formulario-descarga.tsx` (cliente) + test; Modify `gracias.tsx`, `gracias.test.tsx`, `books.ts` (FAQ) y sus tests.
- [ ] Tests: campo de correo + botón; éxito muestra el botón "Descargar mi libro (PDF)" y el aviso "una sola vez, 10 minutos"; error muestra mensaje y WhatsApp; la página no contiene ningún enlace al PDF ni a Drive.

### Task 5: Infraestructura, publicación y prueba real
- [ ] Crear KV y bucket R2; declarar bindings en `cloudflare.config.ts`; descargar el PDF y subirlo a R2.
- [ ] Publicar. Probar en producción con un correo de prueba sembrado a mano en KV: ticket → descarga → segundo canje 410 → borrar la semilla.
- [ ] README, mezclar en `main`, subir.
