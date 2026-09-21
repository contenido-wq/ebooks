# Fase 2 — Lector y protección: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que quien compra (o recibe un acceso de cortesía) entre con un enlace mágico a su biblioteca y lea *Si Dios jugara fútbol* en línea, página por página, con su email estampado en cada página, y que cualquiera pueda leer un capítulo gratis dejando su email.

**Architecture:** Supabase (Postgres, Auth, Storage privado) guarda catálogo, accesos, progreso y leads. Un script convierte las 240 páginas del PDF a imágenes WebP recortadas a la caja de corte y las sube a un bucket privado. Las páginas nunca se sirven directo: una ruta del servidor verifica la sesión y el acceso, aplica un límite de ritmo, estampa el email con `sharp` y devuelve la imagen. El enlace mágico lo genera el servidor con la API de administración y lo envía por Resend, sin depender del correo de Supabase. Toda la lógica de negocio recibe sus dependencias como parámetros ("puertos"), así se prueba sin base de datos, y las pruebas de integración contra el Supabase local validan los adaptadores reales.

**Tech Stack:** Next.js 16 (`proxy.ts`), React 19, TypeScript, Tailwind v4, Supabase local (Docker) con `@supabase/supabase-js` y `@supabase/ssr`, `sharp`, `next/og`, Resend (API HTTP), poppler (`pdftoppm`, `pdfinfo`), Vitest, pgTAP (`supabase test db`).

**Spec:** `docs/superpowers/specs/2026-09-20-tienda-ebooks-design.md` (secciones 7, 8 y 10; fase 2 de la sección 14)

## Global Constraints

- Idioma de toda la interfaz y el copy: español neutro latinoamericano.
- Look editorial cálido de la Fase 1: fondo crema `#f6f0e4`, tinta `#1d1a16`, acento verde cancha `#1f5a3d`, dorado `#8a6420`; Fraunces (títulos) e Inter (texto). No aplica el dark mode de AIVI.
- Diseño primero para celular: todo debe verse bien a 390 px de ancho, sin scroll horizontal, con 16 px de márgenes.
- **Solo lectura online, sin descarga.** Las páginas se sirven únicamente por rutas del servidor. El PDF original nunca se sube ni se sirve.
- **Marca de agua con el email del comprador** en cada página del libro completo (opacidad de la marca: 0.13). La vista previa se sirve sin marca de agua.
- **Límite de ritmo:** más de 30 páginas por minuto por comprador devuelven 429.
- **Enlace mágico, sin contraseñas.** El enlace es de un solo uso y se abre en una pantalla de confirmación con un botón (los escáneres de correo hacen GET automático y gastarían el enlace).
- **RLS activo en todas las tablas** del esquema `public`. Solo se otorga lo mínimo a `authenticated`; `anon` no recibe nada.
- La clave secreta de Supabase (`SUPABASE_SECRET_KEY`) solo se usa en el servidor. Nunca lleva prefijo `NEXT_PUBLIC_`. Los módulos que la usan importan `server-only`, salvo el archivo puro `admin-cliente.ts` que también usan los scripts.
- Nunca escribir tokens, claves ni enlaces de acceso en logs de consola. El enlace de desarrollo se guarda en `out/correo-dev/` con permisos 600 y solo se imprime la ruta del archivo.
- Nunca inventar afirmaciones sobre el libro: todo texto sobre el libro y sus autores sale del propio PDF.
- Autoría: los autores son Juan Guillermo Ricaurte y Jeins Durán. Jhei Trujillo es el editor y distribuidor, no el autor.
- Next.js 16 no es el que conoces: antes de escribir código de rutas, `proxy`, cookies o metadatos, lee la guía correspondiente en `node_modules/next/dist/docs/` (`params` y `cookies()` son asíncronos; `middleware` se llama `proxy`).
- Supabase cambia seguido: las tablas nuevas **no** se exponen solas a la API de datos, cada permiso se otorga con `GRANT` explícito; las claves ahora son `sb_publishable_…` y `sb_secret_…`.
- Todos los commits terminan con `-m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"` como segundo mensaje.
- Gestor de paquetes: npm.

## Decisiones tomadas al escribir este plan (y por qué)

| Decisión | Motivo |
|---|---|
| El enlace mágico lo genera el servidor (`auth.admin.generateLink`) y lo envía Resend | Desde el 3 de junio de 2026 los proyectos gratis con el correo por defecto de Supabase no pueden personalizar plantillas, y ese correo tiene límites muy bajos. Así el flujo es idéntico para la Fase 3 (correo tras la compra) |
| Solo se envía enlace si el email tiene un acceso; la respuesta es siempre la misma | Evita crear usuarios basura y no revela qué emails son compradores |
| Pantalla intermedia con botón antes de gastar el enlace | Outlook, Gmail y antivirus abren los enlaces del correo y lo gastarían |
| La marca de agua se dibuja con `next/og` (fuente incluida) y se repite con `sharp` (`tile: true`) | `sharp` dibuja el texto con las fuentes del sistema, y un servidor Linux sin fuentes mostraría cuadritos. Se verificó con la página 17 real |
| Las páginas se recortan a la **TrimBox** (425,2 × 680,32 pt = 150 × 240 mm) | El PDF trae marcas de imprenta y sangrado. Se verificó: las 240 páginas comparten las mismas cajas y el recorte sale con bordes blancos |
| Límite de ritmo en Postgres (`consumir_cupo`) y no en memoria | En un servidor sin estado (Vercel) cada instancia tendría su propio contador |
| `books` solo guarda lo que el lector necesita (slug, título, total de páginas); el copy de venta sigue en `src/content/books.ts` | Evita duplicar la fuente de verdad hasta que exista un admin (Fase 4). Diferencia con el diseño: allí `books` llevaba también subtítulo, portada y precios |
| Tablas `orders` y `webhook_events` **no** se crean aquí | Son de la Fase 3. `entitlements.order_id` queda como `uuid` sin llave foránea todavía |
| La vista previa exige el email con una cookie `vp_<slug>` (compuerta blanda) | Son páginas gratuitas: el email es captación de leads, no seguridad |
| El correo de bienvenida al pedir la vista previa (diseño, sección 10) va en la Fase 3 | Esa fase construye todos los correos con la misma plantilla. En esta solo se guarda el lead y solo se envía el correo del enlace de acceso |
| La vista previa son las 22 primeras páginas (portadilla, créditos, dedicatoria, prólogo, prefacio, camerino y el Minuto 1), cerca del 9% del libro | Es un valor por defecto que se cambia en `scripts/libros/si-dios-jugara-futbol.json` y se aplica volviendo a correr el procesamiento |
| El lector no usa ninguna librería de zoom: el pellizco es el nativo del navegador y el deslizamiento se ignora cuando la página está ampliada | Menos dependencias y sin conflicto entre gestos |
| El desarrollo usa Supabase local con Docker | No requiere cuenta ni claves hasta lanzar. La guía para producción queda en `docs/supabase-produccion.md` |

## Archivos de origen del libro (rutas locales, confirmar con el dueño)

- Libro: `/Users/jheitrujillo/Desktop/Pastor Juangui/Si Dios jugara futbol.pdf` (240 páginas, 38.849.840 bytes)
- Portada: `/Users/jheitrujillo/Desktop/Pastor Juangui/Portada si Dios jugara curvas.pdf` (pliego de imprenta de 51,2 × 24 cm con solapas, contraportada, lomo y portada)

Ambos se pasan a los scripts como argumento. Ninguno se copia al repositorio.

## Estructura de archivos

```
supabase/
  config.toml
  migrations/<fecha>_lector.sql
  tests/database/acceso.test.sql
scripts/
  env-local.ts                  arma .env.local desde `supabase status`
  extraer-portada.ts            recorta la portada del pliego de imprenta
  procesar-libro.ts             PDF → WebP → Storage + filas en la base
  dar-acceso.ts                 acceso de cortesía por email
  libros/si-dios-jugara-futbol.json   capítulos y rango de vista previa
src/
  proxy.ts                      refresca la sesión en las páginas del lector
  app/
    auth/confirm/page.tsx       pantalla "Entrar a mi biblioteca"
    auth/entrar/route.ts        POST que gasta el enlace y abre la sesión
    biblioteca/page.tsx  actions.ts  tipos.ts  formulario-acceso.tsx
    leer/[slug]/page.tsx
    leer/[slug]/vista-previa/page.tsx  actions.ts  formulario-vista-previa.tsx
    api/paginas/[slug]/[n]/route.ts
    api/vista-previa/[slug]/[n]/route.ts
    api/progreso/route.ts
  components/lector/
    lector.tsx  indice-capitulos.tsx  gestos.ts  use-imagen-pagina.ts
  lib/
    env.ts  env-archivo.ts  ruta-segura.ts  concurrencia.ts  limites.ts  biblioteca.ts
    correo/normalizar.ts  enviar-acceso.ts
    acceso/otorgar.ts  solicitar-enlace.ts  confirmar-enlace.ts  adaptadores.ts
    supabase/server.ts  admin.ts  admin-cliente.ts  sesion.ts  usuario.ts
    lectura/marca-de-agua.tsx  servir-pagina.ts  progreso.ts  capturar-lead.ts
            datos.ts  adaptadores.ts  responder.ts  vista-previa.ts
    libro/recorte.ts  config.ts  render.ts  subir.ts
  test/server-only-stub.ts  integracion.ts
vitest.config.mts  vitest.integration.config.mts  vitest.integration.setup.ts
docs/supabase-produccion.md
```

---

### Task 0: Documentos y rama de trabajo

**Files:**
- Create: (ya existen sin commit) `docs/superpowers/plans/2026-09-20-fase-2-lector-y-proteccion.md`
- Modify: `docs/superpowers/specs/2026-09-20-tienda-ebooks-design.md` (ajustes de la Fase 2)

**Interfaces:**
- Produces: rama `feat/lector` desde la que trabajan todas las tareas siguientes.

- [ ] **Step 1: Confirmar el estado del repo**

Run: `cd /Users/jheitrujillo/Proyectos/ebooks/ebooks && git status --short && git branch --show-current`
Expected: solo aparecen los documentos nuevos o modificados y la rama es `main`.

- [ ] **Step 2: Crear la rama y guardar los documentos**

```bash
git switch -c feat/lector
git add docs
git commit -m "docs: plan de la fase 2 (lector y protección) y ajustes al diseño" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 1: Portada real

Adelanto de la Fase 4 que ya se puede hacer: el dueño entregó el archivo de imprenta de la cubierta.

**Files:**
- Create: `src/lib/libro/recorte.ts`, `scripts/extraer-portada.ts`, `public/portada.webp` (generado)
- Modify: `src/content/types.ts`, `src/content/books.ts`, `src/components/book/cover.tsx`, `src/components/book/hero.tsx`, `src/app/opengraph-image.tsx`, `package.json`
- Test: `src/lib/libro/recorte.test.ts`, `src/components/book/cover.test.tsx`

**Interfaces:**
- Produces:
  - `type CajaPt = { x: number; y: number; ancho: number; alto: number }` (puntos, origen arriba a la izquierda)
  - `cajaAPixeles(caja: CajaPt, dpi: number): { x: number; y: number; ancho: number; alto: number }`
  - `type Portada = { src: string; ancho: number; alto: number }` y `Book.portada: Portada | null`
  - `Cover({ titulo, autor, portada }: { titulo: string; autor: string; portada: Portada | null })`

- [ ] **Step 1: Escribir el test que falla de `cajaAPixeles`**

`src/lib/libro/recorte.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { cajaAPixeles } from "./recorte"

describe("cajaAPixeles", () => {
  it("convierte puntos a píxeles según los dpi y redondea", () => {
    expect(cajaAPixeles({ x: 21, y: 21, ancho: 425.2, alto: 680.32 }, 200)).toEqual({
      x: 58,
      y: 58,
      ancho: 1181,
      alto: 1890,
    })
  })

  it("con 72 dpi los puntos son píxeles", () => {
    expect(cajaAPixeles({ x: 10, y: 20, ancho: 100, alto: 200 }, 72)).toEqual({
      x: 10,
      y: 20,
      ancho: 100,
      alto: 200,
    })
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./recorte"`.

- [ ] **Step 3: Implementar**

`src/lib/libro/recorte.ts`:

```ts
/** Caja en puntos PDF (1 pt = 1/72 in), con el origen arriba a la izquierda de la página. */
export type CajaPt = { x: number; y: number; ancho: number; alto: number }

export type CajaPx = { x: number; y: number; ancho: number; alto: number }

export function cajaAPixeles(caja: CajaPt, dpi: number): CajaPx {
  const k = dpi / 72
  return {
    x: Math.round(caja.x * k),
    y: Math.round(caja.y * k),
    ancho: Math.round(caja.ancho * k),
    alto: Math.round(caja.alto * k),
  }
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Crear el script que recorta la portada del pliego**

`scripts/extraer-portada.ts`:

```ts
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import sharp from "sharp"
import { cajaAPixeles } from "../src/lib/libro/recorte"

// El archivo de imprenta es un pliego de 51,2 × 24 cm: solapa, contraportada, lomo, portada y solapa.
// El panel frontal (150 × 240 mm) se midió sobre "Portada si Dios jugara curvas.pdf" y se comprobó que sus
// bordes izquierdo, derecho y superior quedan en blanco puro (sin lomo ni solapa). Puntos, origen arriba a la izquierda.
const FRENTE = { x: 864.0, y: 178.6, ancho: 422.0, alto: 680.3 }
const DPI = 150

async function main() {
  const [entrada, salida = "public/portada.webp"] = process.argv.slice(2)
  if (!entrada) {
    console.error('Uso: npm run portada -- "/ruta/Portada.pdf" [public/portada.webp]')
    process.exit(1)
  }

  const caja = cajaAPixeles(FRENTE, DPI)
  const carpeta = mkdtempSync(path.join(tmpdir(), "portada-"))
  try {
    execFileSync("pdftoppm", [
      "-r", String(DPI),
      "-x", String(caja.x),
      "-y", String(caja.y),
      "-W", String(caja.ancho),
      "-H", String(caja.alto),
      "-png",
      "-singlefile",
      entrada,
      path.join(carpeta, "frente"),
    ])
    const info = await sharp(path.join(carpeta, "frente.png")).webp({ quality: 88 }).toFile(salida)
    console.log(`Portada guardada en ${salida}: ${info.width} × ${info.height} px, ${Math.round(info.size / 1024)} KB`)
  } finally {
    rmSync(carpeta, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Agregar el script:

```bash
npm pkg set scripts.portada="tsx scripts/extraer-portada.ts"
```

- [ ] **Step 6: Generar la portada y revisarla**

Run: `npm run portada -- "/Users/jheitrujillo/Desktop/Pastor Juangui/Portada si Dios jugara curvas.pdf"`
Expected: `Portada guardada en public/portada.webp: 879 × 1417 px, ` y un tamaño en KB (unos cientos de KB o menos).

Revisa a ojo `public/portada.webp` (ábrela con la herramienta de lectura de imágenes): debe verse solo la portada frontal, con el título verde, la foto y el logo "Vuelo azul", sin franja verde del lomo ni gris de la solapa. Luego comprueba los bordes:

```bash
node -e "const s=require('sharp');(async()=>{const {data,info}=await s('public/portada.webp').raw().toBuffer({resolveWithObject:true});const col=(x)=>{let m=255;for(let y=0;y<info.height;y++)for(let c=0;c<3;c++)m=Math.min(m,data[(y*info.width+x)*info.channels+c]);return m};console.log('mínimo borde izquierdo:',col(0),'| derecho:',col(info.width-1))})()"
```

Expected: `mínimo borde izquierdo: 255 | derecho: 255`. Si alguno es menor, mueve `FRENTE.x` o reduce `FRENTE.ancho` en 1 pt y repite. Si las dimensiones impresas no son 879 × 1417, usa las que imprimió el script en el paso 8.

- [ ] **Step 7: Escribir los tests que fallan del componente `Cover`**

Reemplaza el contenido de `src/components/book/cover.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Cover } from "./cover"

describe("Cover", () => {
  it("genera una portada de texto cuando no hay imagen", () => {
    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" portada={null} />)
    const portada = screen.getByRole("img", { name: "Portada de Libro de Prueba" })
    expect(portada).toHaveTextContent("Libro de Prueba")
    expect(portada).toHaveTextContent("Autora Prueba")
  })

  it("muestra la imagen con sus dimensiones reales cuando hay portada", () => {
    render(
      <Cover
        titulo="Libro de Prueba"
        autor="Autora Prueba"
        portada={{ src: "/portada.webp", ancho: 879, alto: 1417 }}
      />,
    )
    const imagen = screen.getByAltText("Portada de Libro de Prueba")
    expect(imagen).toHaveAttribute("width", "879")
    expect(imagen).toHaveAttribute("height", "1417")
  })
})
```

- [ ] **Step 8: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL en `cover.test.tsx` (la propiedad `portada` no existe y las dimensiones son 800 × 1200).

- [ ] **Step 9: Cambiar el tipo, el componente, el héroe y el catálogo**

En `src/content/types.ts` reemplaza la propiedad `portada` y agrega el tipo:

```ts
export type Portada = { src: string; ancho: number; alto: number }
```

```ts
  /** Imagen de la portada dentro de /public, con sus dimensiones reales. Con null se genera una portada de texto. */
  portada: Portada | null
```

`src/components/book/cover.tsx` (reemplaza todo):

```tsx
import Image from "next/image"
import type { Portada } from "@/content/types"

type CoverProps = { titulo: string; autor: string; portada: Portada | null }

export function Cover({ titulo, autor, portada }: CoverProps) {
  if (portada) {
    return (
      <Image
        src={portada.src}
        alt={`Portada de ${titulo}`}
        width={portada.ancho}
        height={portada.alto}
        priority
        className="h-auto w-full rounded-md shadow-portada"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`Portada de ${titulo}`}
      className="flex aspect-[5/8] w-full flex-col justify-between rounded-md bg-cancha-oscuro p-6 text-papel shadow-portada"
    >
      <span className="text-balance text-xs font-semibold uppercase tracking-[0.25em] text-dorado-claro">
        {autor}
      </span>
      <span className="font-serif text-3xl leading-tight text-balance">{titulo}</span>
      <span aria-hidden className="h-px w-12 bg-dorado-claro" />
    </div>
  )
}
```

En `src/components/book/hero.tsx` cambia la línea de la portada:

```tsx
          <Cover titulo={book.titulo} autor={book.autor} portada={book.portada} />
```

En `src/content/books.ts` cambia `portada: null,` por (y actualiza el comentario de arriba: la portada ya no es null):

```ts
  portada: { src: "/portada.webp", ancho: 879, alto: 1417 },
```

Borra del comentario de la cabecera de `books.ts` la línea que dice "portada es null hasta que el dueño entregue…".

- [ ] **Step 10: La imagen al compartir usa la portada real**

`src/app/opengraph-image.tsx` (reemplaza todo). `next/og` no lee WebP con seguridad, así que se convierte a PNG con `sharp`:

```tsx
import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import sharp from "sharp"
import { getFeaturedBook } from "@/content/books"
import { formatPrice } from "@/lib/format-price"

export const alt = "Portada y datos del libro"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const ALTO_PORTADA = 450

async function portadaComoDataUrl(src: string): Promise<{ url: string; ancho: number } | null> {
  try {
    const archivo = await readFile(path.join(process.cwd(), "public", src))
    const png = await sharp(archivo).resize({ height: ALTO_PORTADA }).png().toBuffer({ resolveWithObject: true })
    return { url: `data:image/png;base64,${png.data.toString("base64")}`, ancho: png.info.width }
  } catch {
    return null
  }
}

export default async function OpengraphImage() {
  const book = getFeaturedBook()
  const portada = book.portada ? await portadaComoDataUrl(book.portada.src) : null

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#f6f0e4",
          color: "#1d1a16",
          padding: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#8a6420" }}>
            {book.autor}
          </div>
          <div style={{ fontSize: 84, lineHeight: 1.05, marginTop: 24 }}>{book.titulo}</div>
          <div style={{ fontSize: 34, marginTop: 32, color: "#5b5347" }}>
            {`Ebook · ${formatPrice(book.precioUsd, "USD")}`}
          </div>
        </div>
        {portada ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={portada.url}
            alt=""
            width={portada.ancho}
            height={ALTO_PORTADA}
            style={{ borderRadius: 8, boxShadow: "0 30px 60px -20px rgba(29,26,22,0.45)" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 280,
              height: ALTO_PORTADA,
              padding: 28,
              borderRadius: 8,
              background: "#163f2b",
              color: "#f6f0e4",
            }}
          >
            <div style={{ fontSize: 16, letterSpacing: 4, textTransform: "uppercase", color: "#b8893a" }}>
              {book.autor}
            </div>
            <div style={{ fontSize: 40, lineHeight: 1.1 }}>{book.titulo}</div>
          </div>
        )}
      </div>
    ),
    size,
  )
}
```

- [ ] **Step 11: Ejecutar pruebas, tipos, lint y build**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa. Si `next/image` se queja de la portada WebP, confirma que `public/portada.webp` existe.

- [ ] **Step 12: Ver la imagen al compartir y la landing**

```bash
(npx next start -p 3100 >/dev/null 2>&1 &) ; sleep 4
curl -s -o /private/tmp/og-fase2.png http://localhost:3100/opengraph-image
kill $(lsof -ti tcp:3100) 2>/dev/null; file /private/tmp/og-fase2.png
```

Expected: `PNG image data, 1200 x 630`. Ábrela con la herramienta de imágenes: a la derecha debe verse la portada real. La revisión visual de la landing con la portada real se hace en la Tarea 11.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: portada real recortada del archivo de imprenta" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Supabase local

**Files:**
- Create: `supabase/config.toml` (generado por la CLI), `scripts/env-local.ts`, `src/lib/env-archivo.ts`
- Modify: `.env.example`, `package.json`, `.gitignore`
- Test: `src/lib/env-archivo.test.ts`

**Interfaces:**
- Produces: `mezclarEnv(existente: string, nuevos: Record<string, string>): string`; un Supabase local en `http://127.0.0.1:54321`; el archivo `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` y `NEXT_PUBLIC_SITE_URL`; scripts `db:start`, `db:stop`, `db:reset`, `db:test`, `env:local`.

- [ ] **Step 1: Escribir el test que falla de `mezclarEnv`**

`src/lib/env-archivo.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { mezclarEnv } from "./env-archivo"

describe("mezclarEnv", () => {
  it("agrega las claves nuevas a un archivo vacío", () => {
    expect(mezclarEnv("", { A: "1", B: "2" })).toBe("A=1\nB=2\n")
  })

  it("reemplaza las claves existentes y conserva las demás líneas", () => {
    const existente = "# comentario\nA=viejo\nRESEND_API_KEY=abc\n"
    expect(mezclarEnv(existente, { A: "nuevo", B: "2" })).toBe(
      "# comentario\nA=nuevo\nRESEND_API_KEY=abc\nB=2\n",
    )
  })

  it("no duplica una clave que ya está", () => {
    const resultado = mezclarEnv("A=1\n", { A: "2" })
    expect(resultado.match(/^A=/gm)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./env-archivo"`.

- [ ] **Step 3: Implementar**

`src/lib/env-archivo.ts`:

```ts
/** Actualiza (o agrega) claves en el texto de un archivo .env sin tocar el resto de las líneas. */
export function mezclarEnv(existente: string, nuevos: Record<string, string>): string {
  const pendientes = new Map(Object.entries(nuevos))
  const lineas = existente === "" ? [] : existente.replace(/\n$/, "").split("\n")

  const actualizadas = lineas.map((linea) => {
    const clave = linea.split("=")[0]
    if (pendientes.has(clave)) {
      const valor = pendientes.get(clave) as string
      pendientes.delete(clave)
      return `${clave}=${valor}`
    }
    return linea
  })

  for (const [clave, valor] of pendientes) actualizadas.push(`${clave}=${valor}`)
  return `${actualizadas.join("\n")}\n`
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Script que arma `.env.local` desde el Supabase local**

`scripts/env-local.ts`:

```ts
import { execFileSync } from "node:child_process"
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { mezclarEnv } from "../src/lib/env-archivo"

const ARCHIVO = ".env.local"

const estado = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" }),
) as Record<string, string>

const url = estado.API_URL
const clavePublica = estado.PUBLISHABLE_KEY ?? estado.ANON_KEY
const claveSecreta = estado.SECRET_KEY ?? estado.SERVICE_ROLE_KEY

if (!url || !clavePublica || !claveSecreta) {
  console.error("No encontré la URL o las claves en `supabase status -o json`.")
  console.error("Claves disponibles:", Object.keys(estado).join(", "))
  process.exit(1)
}

const existente = existsSync(ARCHIVO) ? readFileSync(ARCHIVO, "utf8") : ""
const texto = mezclarEnv(existente, {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: clavePublica,
  SUPABASE_SECRET_KEY: claveSecreta,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
})
writeFileSync(ARCHIVO, texto, { mode: 0o600 })
chmodSync(ARCHIVO, 0o600)
console.log(`${ARCHIVO} actualizado (permisos 600) con la URL y las claves del Supabase local.`)
```

Scripts de `package.json`:

```bash
npm pkg set scripts.db:start="supabase start" scripts.db:stop="supabase stop" scripts.db:reset="supabase db reset" scripts.db:test="supabase test db" scripts.env:local="tsx scripts/env-local.ts"
```

- [ ] **Step 6: Encender Docker Desktop**

Docker está instalado pero su servicio suele estar apagado.

```bash
docker info >/dev/null 2>&1 && echo "Docker ya está encendido" || (open -a Docker && for i in $(seq 1 60); do docker info >/dev/null 2>&1 && echo "Docker listo" && break; sleep 3; done)
```

Expected: `Docker ya está encendido` o `Docker listo`. Si después de 3 minutos no responde, **detente y pídele al dueño** que abra Docker Desktop y acepte lo que le pida.

- [ ] **Step 7: Inicializar Supabase y ajustar la configuración**

```bash
supabase init
```

Expected: crea `supabase/config.toml` y `supabase/.gitignore`. Abre `supabase/config.toml`, busca cada clave y déjala así (si no existe, agrégala en su sección):

- `project_id = "ebooks"`
- En `[auth]`: `site_url = "http://localhost:3000"` y `additional_redirect_urls = ["http://localhost:3000"]`
- En `[auth]`: `enable_signup = false` con el comentario `# Los usuarios se crean solo desde el servidor (auth.admin.generateLink). Si la Tarea 5 falla por esto, ponlo en true.`

No cambies puertos ni servicios.

- [ ] **Step 8: Levantar Supabase local**

Run (en segundo plano, la primera vez descarga varias imágenes y puede tardar varios minutos): `supabase start`
Expected: al terminar imprime la URL de la API (`http://127.0.0.1:54321`), Studio y las claves. Si falla por un puerto ocupado, revisa qué lo usa (`lsof -i :54321`) antes de cambiar puertos.

- [ ] **Step 9: Generar `.env.local`**

Run: `npm run env:local`
Expected: `.env.local actualizado (permisos 600)…`. Si imprime "No encontré la URL o las claves", mira la lista de claves que muestra y ajusta los nombres en `scripts/env-local.ts` (es la única línea que depende del nombre que use la CLI).

Comprueba sin imprimir secretos:

```bash
grep -c "" .env.local && grep -E "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SITE_URL)=" .env.local && ls -l .env.local | awk '{print $1}'
```

Expected: 4 líneas, la URL local y `-rw-------`.

- [ ] **Step 10: Documentar las variables**

Reemplaza `.env.example` (mantén el bloque de `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_WHATSAPP_NUMBER` que ya existe y agrega):

```
# URL pública de la tienda, sin barra final. Se usa para la vista previa al compartir y en los enlaces de acceso.
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Número de WhatsApp con código de país, solo dígitos (ejemplo: 573001234567). Si se deja vacío, no aparece el botón.
NEXT_PUBLIC_WHATSAPP_NUMBER=

# Supabase. En local salen de `npm run env:local`. En producción, del panel del proyecto.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Solo servidor. NUNCA con prefijo NEXT_PUBLIC_.
SUPABASE_SECRET_KEY=

# Correo (Resend). Sin RESEND_API_KEY, en desarrollo el enlace de acceso se guarda en out/correo-dev/.
RESEND_API_KEY=
EMAIL_FROM=Ebooks de Jhei Trujillo <acceso@tu-dominio.com>
```

- [ ] **Step 11: Verificar y hacer commit**

Run: `supabase status | head -12 && npm test && npm run typecheck && npm run lint`
Expected: los servicios aparecen como corriendo y las pruebas pasan.

```bash
git add -A
git commit -m "feat: Supabase local con Docker y script para generar .env.local" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Base de datos (esquema, permisos y pruebas de RLS)

**Files:**
- Create: `supabase/migrations/<fecha>_lector.sql` (con `supabase migration new`), `supabase/tests/database/acceso.test.sql`

**Interfaces:**
- Produces (en `public`): tablas `books`, `book_pages`, `book_chapters`, `entitlements`, `reading_progress`, `leads`, `limites_uso`; función `consumir_cupo(p_clave text, p_ventana_seg integer, p_maximo integer) returns boolean` (solo `service_role`); bucket privado `book-pages`. Permisos: `authenticated` lee `books` y `entitlements` (solo los suyos) y lee/escribe su `reading_progress`; `anon` no recibe nada; el resto es solo de `service_role`.

- [ ] **Step 1: Crear la migración vacía**

Run: `supabase migration new lector`
Expected: crea `supabase/migrations/<fecha>_lector.sql`. Anota el nombre exacto que imprime.

- [ ] **Step 2: Escribir la prueba de pgTAP que falla**

`supabase/tests/database/acceso.test.sql`:

```sql
begin;
select plan(15);

-- Datos de prueba (se deshacen con el rollback final)
insert into public.books (id, slug, titulo, total_paginas) values
  ('00000000-0000-0000-0000-0000000000a1', 'libro-a', 'Libro A', 10),
  ('00000000-0000-0000-0000-0000000000b2', 'libro-b', 'Libro B', 10);

insert into public.entitlements (email, book_id) values
  ('ana@ejemplo.com',  '00000000-0000-0000-0000-0000000000a1'),
  ('beto@ejemplo.com', '00000000-0000-0000-0000-0000000000a1');

-- ---------- Ana (autenticada) ----------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","email":"ana@ejemplo.com"}', true);

select results_eq(
  $$ select email from public.entitlements $$,
  $$ values ('ana@ejemplo.com'::text) $$,
  'Ana solo ve su propio acceso');

select is(
  (select count(*)::int from public.books), 2,
  'un usuario autenticado puede leer el catálogo de libros');

select throws_ok($$ select * from public.book_pages $$, '42501', null,
  'un usuario autenticado no puede leer book_pages');
select throws_ok($$ select * from public.book_chapters $$, '42501', null,
  'un usuario autenticado no puede leer book_chapters');
select throws_ok($$ select * from public.leads $$, '42501', null,
  'un usuario autenticado no puede leer leads');
select throws_ok($$ select * from public.limites_uso $$, '42501', null,
  'un usuario autenticado no puede leer limites_uso');
select throws_ok($$ select public.consumir_cupo('x', 60, 1) $$, '42501', null,
  'un usuario autenticado no puede llamar a consumir_cupo');

select lives_ok(
  $$ insert into public.reading_progress (email, book_id, ultima_pagina)
     values ('ana@ejemplo.com', '00000000-0000-0000-0000-0000000000a1', 4) $$,
  'Ana puede guardar su progreso en un libro al que tiene acceso');

select throws_ok(
  $$ insert into public.reading_progress (email, book_id, ultima_pagina)
     values ('beto@ejemplo.com', '00000000-0000-0000-0000-0000000000a1', 4) $$,
  '42501', null, 'Ana no puede guardar progreso a nombre de Beto');

select throws_ok(
  $$ insert into public.reading_progress (email, book_id, ultima_pagina)
     values ('ana@ejemplo.com', '00000000-0000-0000-0000-0000000000b2', 4) $$,
  '42501', null, 'Ana no puede guardar progreso en un libro sin acceso');

-- ---------- Beto (autenticado) ----------
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","email":"beto@ejemplo.com"}', true);

select is_empty(
  $$ select * from public.reading_progress $$,
  'Beto no ve el progreso de Ana');

-- ---------- Anónimo ----------
set local role anon;
select throws_ok($$ select * from public.entitlements $$, '42501', null,
  'un anónimo no puede leer entitlements');
select throws_ok($$ select * from public.books $$, '42501', null,
  'un anónimo no puede leer books');

-- ---------- Límite de uso (como superusuario) ----------
reset role;
select is(
  array[
    public.consumir_cupo('prueba', 60, 2),
    public.consumir_cupo('prueba', 60, 2),
    public.consumir_cupo('prueba', 60, 2)
  ],
  array[true, true, false],
  'consumir_cupo permite hasta el máximo y luego bloquea');

select * from finish();
rollback;
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `supabase test db`
Expected: FAIL — `relation "public.books" does not exist`.

- [ ] **Step 4: Escribir la migración**

Reemplaza el contenido de `supabase/migrations/<fecha>_lector.sql`:

```sql
-- Lector: catálogo mínimo, capítulos, accesos, progreso, leads y límite de uso.

create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  total_paginas integer not null check (total_paginas > 0),
  creado_en timestamptz not null default now()
);

create table public.book_pages (
  book_id uuid not null references public.books (id) on delete cascade,
  numero integer not null check (numero >= 1),
  es_vista_previa boolean not null default false,
  primary key (book_id, numero)
);

create table public.book_chapters (
  book_id uuid not null references public.books (id) on delete cascade,
  orden integer not null check (orden >= 1),
  numero_pagina integer not null check (numero_pagina >= 1),
  titulo text not null,
  primary key (book_id, orden)
);

-- Fuente de verdad de quién puede leer qué. order_id se conectará a orders en la fase de pagos.
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  book_id uuid not null references public.books (id) on delete cascade,
  order_id uuid,
  origen text not null default 'cortesia' check (origen in ('pago', 'cortesia')),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (email, book_id)
);
create index entitlements_email_idx on public.entitlements (email);

create table public.reading_progress (
  email text not null check (email = lower(email)),
  book_id uuid not null references public.books (id) on delete cascade,
  ultima_pagina integer not null check (ultima_pagina >= 1),
  actualizado_en timestamptz not null default now(),
  primary key (email, book_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  book_id uuid not null references public.books (id) on delete cascade,
  origen text not null default 'vista-previa',
  creado_en timestamptz not null default now(),
  unique (email, book_id)
);

create table public.limites_uso (
  id bigint generated always as identity primary key,
  clave text not null,
  creado_en timestamptz not null default now()
);
create index limites_uso_clave_idx on public.limites_uso (clave, creado_en);

-- RLS en todas las tablas
alter table public.books enable row level security;
alter table public.book_pages enable row level security;
alter table public.book_chapters enable row level security;
alter table public.entitlements enable row level security;
alter table public.reading_progress enable row level security;
alter table public.leads enable row level security;
alter table public.limites_uso enable row level security;

-- Permisos: nada por defecto y solo lo mínimo para usuarios autenticados.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.books to authenticated;
grant select on public.entitlements to authenticated;
grant select, insert, update on public.reading_progress to authenticated;
grant all on all tables in schema public to service_role;

create policy "los usuarios ven el catálogo" on public.books
  for select to authenticated using (true);

create policy "cada lector ve sus accesos" on public.entitlements
  for select to authenticated
  using (email = lower((select auth.jwt() ->> 'email')));

create policy "cada lector ve su progreso" on public.reading_progress
  for select to authenticated
  using (email = lower((select auth.jwt() ->> 'email')));

create policy "cada lector guarda su progreso" on public.reading_progress
  for insert to authenticated
  with check (
    email = lower((select auth.jwt() ->> 'email'))
    and exists (
      select 1 from public.entitlements e
      where e.email = reading_progress.email
        and e.book_id = reading_progress.book_id
        and e.activo
    )
  );

create policy "cada lector actualiza su progreso" on public.reading_progress
  for update to authenticated
  using (email = lower((select auth.jwt() ->> 'email')))
  with check (email = lower((select auth.jwt() ->> 'email')));

-- Límite de uso: cuenta los usos recientes de una clave y registra uno nuevo si hay cupo.
create function public.consumir_cupo(p_clave text, p_ventana_seg integer, p_maximo integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  usados integer;
begin
  delete from public.limites_uso
  where clave = p_clave and creado_en < now() - interval '1 hour';

  select count(*) into usados
  from public.limites_uso
  where clave = p_clave and creado_en > now() - make_interval(secs => p_ventana_seg);

  if usados >= p_maximo then
    return false;
  end if;

  insert into public.limites_uso (clave) values (p_clave);
  return true;
end;
$$;

revoke execute on function public.consumir_cupo(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consumir_cupo(text, integer, integer) to service_role;

-- Bucket privado con las páginas del libro. Sin políticas: solo el servidor (clave secreta) puede leerlo.
insert into storage.buckets (id, name, public)
values ('book-pages', 'book-pages', false)
on conflict (id) do nothing;
```

- [ ] **Step 5: Aplicar la migración y correr las pruebas**

Run: `supabase db reset && supabase test db`
Expected: `db reset` termina sin errores y las pruebas imprimen `Result: PASS` con 15 pruebas. Si `set local role authenticated` falla por permisos, ejecuta las pruebas como el rol `postgres` (es el que usa `supabase test db`).

- [ ] **Step 6: Revisar las advertencias de seguridad**

Run: `supabase db advisors --local`
Expected: sin advertencias de nivel ERROR sobre las tablas nuevas. Si aparecen avisos de "RLS sin políticas" en `book_pages`, `book_chapters`, `leads` o `limites_uso`, son intencionales (solo el servidor accede): no las cambies. Corrige cualquier otro aviso antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: esquema del lector con RLS, permisos mínimos y pruebas pgTAP" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 4: Utilidades, clientes de Supabase y proxy

**Files:**
- Create: `src/lib/env.ts`, `src/lib/cargar-env.ts`, `src/lib/correo/normalizar.ts`, `src/lib/ruta-segura.ts`, `src/lib/supabase/admin-cliente.ts`, `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/sesion.ts`, `src/lib/supabase/usuario.ts`, `src/proxy.ts`, `src/test/server-only-stub.ts`, `src/test/integracion.ts`, `vitest.integration.config.mts`, `vitest.integration.setup.ts`
- Modify: `vitest.config.mts`, `package.json`
- Test: `src/lib/env.test.ts`, `src/lib/correo/normalizar.test.ts`, `src/lib/ruta-segura.test.ts`

**Interfaces:**
- Produces:
  - `leerEnvSupabase(env?): { url: string; publishableKey: string }`, `leerSecretKey(env?): string`
  - `cargarEnvLocal(archivo?: string): void`
  - `normalizarEmail(entrada: unknown): string | null`
  - `rutaSegura(destino: string | null | undefined, porDefecto?: string): string`
  - `crearClienteAdmin(): SupabaseClient` (en `admin-cliente.ts`, sin `server-only`, para scripts y pruebas; `admin.ts` lo reexporta con la protección `server-only`)
  - `crearClienteServidor(): Promise<SupabaseClient>` (cliente con cookies de sesión)
  - `refrescarSesion(request: NextRequest): Promise<NextResponse>`
  - `emailActual(cliente: SupabaseClient): Promise<string | null>` (email verificado de la sesión, en minúsculas)
  - Ayudantes de integración: `hayEntorno`, `clienteAdminPrueba()`, `clienteAnonimoPrueba()`, `clienteConToken(accessToken)`, `clienteConSesion(accessToken, refreshToken)`, `emailUnico(prefijo?)`, `crearLibroPrueba(admin, total?)`, `sesionPara(admin, email): Promise<{ cliente, accessToken, refreshToken, usuarioId, email }>`, `limpiarPrueba(admin, { bookIds?, usuarioIds?, archivos? })`
  - Script `npm run test:integracion` (necesita `supabase start`)

- [ ] **Step 1: Instalar dependencias**

```bash
npm install @supabase/supabase-js @supabase/ssr server-only
```

- [ ] **Step 2: Escribir los tests que fallan**

`src/lib/env.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { leerEnvSupabase, leerSecretKey } from "./env"

describe("leerEnvSupabase", () => {
  it("devuelve la URL y la clave pública", () => {
    const env = { NEXT_PUBLIC_SUPABASE_URL: "http://x", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk" }
    expect(leerEnvSupabase(env)).toEqual({ url: "http://x", publishableKey: "pk" })
  })

  it("explica qué variable falta", () => {
    expect(() => leerEnvSupabase({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(() => leerEnvSupabase({ NEXT_PUBLIC_SUPABASE_URL: "http://x" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    )
  })
})

describe("leerSecretKey", () => {
  it("devuelve la clave secreta", () => {
    expect(leerSecretKey({ SUPABASE_SECRET_KEY: "sk" })).toBe("sk")
  })

  it("explica que falta", () => {
    expect(() => leerSecretKey({})).toThrow(/SUPABASE_SECRET_KEY/)
  })
})
```

`src/lib/correo/normalizar.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { normalizarEmail } from "./normalizar"

describe("normalizarEmail", () => {
  it("pasa a minúsculas y quita espacios", () => {
    expect(normalizarEmail("  Ana@Ejemplo.COM ")).toBe("ana@ejemplo.com")
  })

  it.each(["", "sin-arroba", "a@b", "a b@c.com", "@x.com", "x@.com"])("rechaza %j", (entrada) => {
    expect(normalizarEmail(entrada)).toBeNull()
  })

  it("rechaza lo que no es texto y lo demasiado largo", () => {
    expect(normalizarEmail(null)).toBeNull()
    expect(normalizarEmail(42)).toBeNull()
    expect(normalizarEmail(`${"a".repeat(250)}@x.com`)).toBeNull()
  })
})
```

`src/lib/ruta-segura.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { rutaSegura } from "./ruta-segura"

describe("rutaSegura", () => {
  it("acepta rutas internas con su query", () => {
    expect(rutaSegura("/leer/libro")).toBe("/leer/libro")
    expect(rutaSegura("/leer/libro?p=3")).toBe("/leer/libro?p=3")
  })

  it.each([null, undefined, "", "leer/libro", "//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "usa la ruta por defecto con %j",
    (entrada) => {
      expect(rutaSegura(entrada)).toBe("/biblioteca")
    },
  )

  it("permite cambiar la ruta por defecto", () => {
    expect(rutaSegura("https://evil.com", "/")).toBe("/")
  })
})
```

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven `./env`, `./normalizar` ni `./ruta-segura`.

- [ ] **Step 4: Implementar las utilidades**

`src/lib/env.ts`:

```ts
type Entorno = Record<string, string | undefined>

export function leerEnvSupabase(env: Entorno = process.env): { url: string; publishableKey: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url) throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL. Copia .env.example a .env.local (en local: npm run env:local).")
  if (!publishableKey) throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local (en local: npm run env:local).")
  return { url, publishableKey }
}

export function leerSecretKey(env: Entorno = process.env): string {
  const clave = env.SUPABASE_SECRET_KEY
  if (!clave) throw new Error("Falta SUPABASE_SECRET_KEY (solo servidor). Copia .env.example a .env.local (en local: npm run env:local).")
  return clave
}
```

`src/lib/cargar-env.ts`:

```ts
/** Carga .env.local en process.env para los scripts de línea de comandos (Next.js ya lo hace para la app). */
export function cargarEnvLocal(archivo = ".env.local"): void {
  try {
    process.loadEnvFile(archivo)
  } catch {
    // Sin archivo: se usan las variables que ya estén en el entorno.
  }
}
```

`src/lib/correo/normalizar.ts`:

```ts
const PATRON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizarEmail(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null
  const email = entrada.trim().toLowerCase()
  if (email.length === 0 || email.length > 254 || !PATRON.test(email)) return null
  return email
}
```

`src/lib/ruta-segura.ts`:

```ts
/** Solo permite volver a rutas internas del sitio (evita redirecciones abiertas). */
export function rutaSegura(destino: string | null | undefined, porDefecto = "/biblioteca"): string {
  if (!destino) return porDefecto
  if (!destino.startsWith("/") || destino.startsWith("//") || destino.startsWith("/\\")) return porDefecto
  try {
    const url = new URL(destino, "http://localhost")
    if (url.origin !== "http://localhost") return porDefecto
    return url.pathname + url.search
  } catch {
    return porDefecto
  }
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Configurar Vitest para `server-only` y para las pruebas de integración**

`src/test/server-only-stub.ts`:

```ts
// En las pruebas, "server-only" no debe lanzar error: aquí se reemplaza por un módulo vacío.
export {}
```

`vitest.config.mts` (reemplaza todo):

```ts
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src/**/*.integration.test.ts", "node_modules/**"],
  },
})
```

`vitest.integration.config.mts`:

```ts
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.integration.setup.ts"],
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
```

`vitest.integration.setup.ts`:

```ts
// Las pruebas de integración usan el Supabase local (.env.local). Sin ese archivo se omiten.
try {
  process.loadEnvFile(".env.local")
} catch {
  // sin .env.local
}
```

```bash
npm pkg set scripts.test:integracion="vitest run --config vitest.integration.config.mts"
```

- [ ] **Step 7: Clientes de Supabase, sesión y proxy**

Antes de escribir `src/proxy.ts`, lee `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (el archivo se llama `proxy`, se exporta `proxy`, corre en Node y el `matcher` debe ser una constante).

`src/lib/supabase/admin-cliente.ts`:

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { leerEnvSupabase, leerSecretKey } from "@/lib/env"

/** Cliente con la clave secreta: se salta RLS. Solo para el servidor, scripts y pruebas. */
export function crearClienteAdmin(): SupabaseClient {
  const { url } = leerEnvSupabase()
  return createClient(url, leerSecretKey(), { auth: { autoRefreshToken: false, persistSession: false } })
}
```

`src/lib/supabase/admin.ts`:

```ts
import "server-only"

export { crearClienteAdmin } from "./admin-cliente"
```

`src/lib/supabase/server.ts`:

```ts
import "server-only"

import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { leerEnvSupabase } from "@/lib/env"

/** Cliente con la sesión del lector (cookies). Respeta RLS. */
export async function crearClienteServidor(): Promise<SupabaseClient> {
  const { url, publishableKey } = leerEnvSupabase()
  const almacen = await cookies()
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (cookiesAEscribir) => {
        try {
          for (const { name, value, options } of cookiesAEscribir) almacen.set(name, value, options)
        } catch {
          // Un Server Component no puede escribir cookies: el proxy se encarga de refrescar la sesión.
        }
      },
    },
  })
}
```

`src/lib/supabase/sesion.ts`:

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { leerEnvSupabase } from "@/lib/env"

/** Refresca el token de sesión en cada petición de página y pasa las cookies nuevas a la respuesta. */
export async function refrescarSesion(request: NextRequest): Promise<NextResponse> {
  const { url, publishableKey } = leerEnvSupabase()
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesAEscribir, cabeceras?: Record<string, string>) => {
        for (const { name, value } of cookiesAEscribir) request.cookies.set(name, value)
        respuesta = NextResponse.next({ request })
        for (const { name, value, options } of cookiesAEscribir) respuesta.cookies.set(name, value, options)
        for (const [clave, valor] of Object.entries(cabeceras ?? {})) respuesta.headers.set(clave, valor)
      },
    },
  })

  // getClaims valida el token y lo refresca si venció. No uses getSession() en el servidor.
  await supabase.auth.getClaims()
  return respuesta
}
```

`src/lib/supabase/usuario.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"

/** Email verificado de la sesión actual (en minúsculas) o null si no hay sesión. */
export async function emailActual(cliente: SupabaseClient): Promise<string | null> {
  const { data, error } = await cliente.auth.getClaims()
  if (error || !data) return null
  const email = data.claims.email
  return typeof email === "string" ? email.toLowerCase() : null
}
```

`src/proxy.ts` (solo las páginas que usan sesión; las rutas `/api` verifican la sesión por su cuenta):

```ts
import type { NextRequest } from "next/server"
import { refrescarSesion } from "@/lib/supabase/sesion"

export async function proxy(request: NextRequest) {
  return refrescarSesion(request)
}

export const config = {
  matcher: ["/biblioteca/:path*", "/leer/:path*", "/auth/:path*"],
}
```

- [ ] **Step 8: Ayudantes para las pruebas de integración**

`src/test/integracion.ts`:

```ts
import { randomUUID } from "node:crypto"
import { createClient, type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
const claveSecreta = process.env.SUPABASE_SECRET_KEY ?? ""

/** Las pruebas de integración se omiten si no hay Supabase local configurado. */
export const hayEntorno = Boolean(url && clavePublica && claveSecreta)

const sinSesion = { auth: { autoRefreshToken: false, persistSession: false } }

export function clienteAdminPrueba(): SupabaseClient {
  return createClient(url, claveSecreta, sinSesion)
}

export function clienteAnonimoPrueba(): SupabaseClient {
  return createClient(url, clavePublica, sinSesion)
}

/** Cliente que actúa como el usuario dueño del token (respeta RLS). */
export function clienteConToken(accessToken: string): SupabaseClient {
  return createClient(url, clavePublica, {
    ...sinSesion,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

export function emailUnico(prefijo = "lector"): string {
  return `${prefijo}-${randomUUID().slice(0, 8)}@ejemplo.com`
}

export async function crearLibroPrueba(admin: SupabaseClient, total = 3): Promise<{ id: string; slug: string }> {
  const slug = `prueba-${randomUUID().slice(0, 8)}`
  const { data, error } = await admin
    .from("books")
    .insert({ slug, titulo: "Libro de prueba", total_paginas: total })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id as string, slug }
}

/** Cliente con una sesión real en memoria: sirve para `auth.getClaims()` y para consultas con RLS. */
export async function clienteConSesion(accessToken: string, refreshToken: string): Promise<SupabaseClient> {
  const cliente = createClient(url, clavePublica, sinSesion)
  const { error } = await cliente.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  if (error) throw new Error(error.message)
  return cliente
}

export type SesionPrueba = {
  cliente: SupabaseClient
  accessToken: string
  refreshToken: string
  usuarioId: string
  email: string
}

/** Abre una sesión real (enlace mágico + verifyOtp) y devuelve un cliente que actúa como ese usuario. */
export async function sesionPara(admin: SupabaseClient, email: string): Promise<SesionPrueba> {
  const { data: enlace, error } = await admin.auth.admin.generateLink({ type: "magiclink", email })
  if (error || !enlace?.properties) throw new Error(error?.message ?? "generateLink no devolvió propiedades")

  const { data, error: errorOtp } = await clienteAnonimoPrueba().auth.verifyOtp({
    type: enlace.properties.verification_type as EmailOtpType,
    token_hash: enlace.properties.hashed_token,
  })
  if (errorOtp || !data.session || !data.user) throw new Error(errorOtp?.message ?? "verifyOtp no devolvió sesión")

  const cliente = await clienteConSesion(data.session.access_token, data.session.refresh_token)
  return {
    cliente,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    usuarioId: data.user.id,
    email,
  }
}

export async function limpiarPrueba(
  admin: SupabaseClient,
  { bookIds = [], usuarioIds = [], archivos = [] }: { bookIds?: string[]; usuarioIds?: string[]; archivos?: string[] },
): Promise<void> {
  for (const id of usuarioIds) await admin.auth.admin.deleteUser(id)
  if (archivos.length > 0) await admin.storage.from("book-pages").remove(archivos)
  // Borrar el libro elimina en cascada sus accesos, progreso, leads, páginas y capítulos.
  for (const id of bookIds) await admin.from("books").delete().eq("id", id)
}
```

- [ ] **Step 9: Verificar**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa. En la salida del build aparece una línea `ƒ Proxy (Middleware)` y `/` sigue siendo estática (`○`). Si TypeScript se queja de la firma de `setAll` en `sesion.ts` o `server.ts`, ajústala al tipo que exija la versión instalada de `@supabase/ssr` (mira el error), sin cambiar la lógica.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: utilidades de acceso, clientes de Supabase, sesión y proxy" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Enlace mágico

**Files:**
- Create: `src/lib/limites.ts`, `src/lib/acceso/otorgar.ts`, `src/lib/acceso/solicitar-enlace.ts`, `src/lib/acceso/confirmar-enlace.ts`, `src/lib/acceso/adaptadores.ts`, `src/lib/correo/enviar-acceso.ts`, `src/app/auth/confirm/page.tsx`, `src/app/auth/entrar/route.ts`
- Test: `src/lib/acceso/otorgar.test.ts`, `src/lib/acceso/solicitar-enlace.test.ts`, `src/lib/acceso/confirmar-enlace.test.ts`, `src/lib/correo/enviar-acceso.test.ts`, `src/lib/acceso/acceso.integration.test.ts`

**Interfaces:**
- Consumes: `normalizarEmail`, `rutaSegura`, `crearClienteAdmin`, `crearClienteServidor`, `getSiteUrl` (Fase 1), ayudantes de integración (Tarea 4).
- Produces:
  - `consumirCupo(admin, clave, ventanaSeg, maximo): Promise<boolean>`
  - `otorgarAcceso(admin, { email, slug, origen: "pago" | "cortesia", orderId? }): Promise<void>`
  - `type PuertosEnlace = { urlBase: string; tieneAcceso(email): Promise<boolean>; consumirCupo(clave, ventanaSeg, maximo): Promise<boolean>; generarEnlace(email): Promise<{ tokenHash: string; tipo: string }>; enviar(para, url): Promise<void> }`
  - `solicitarEnlace(entrada: unknown, siguiente: string, puertos: PuertosEnlace): Promise<"invalido" | "aceptado">`
  - `TIPOS_ENLACE`, `esTipoEnlace(t)`, `confirmarEnlace({ tokenHash, tipo, siguiente }, verificar): Promise<string>` (devuelve la ruta a la que redirigir)
  - `enviarCorreoAcceso(para, enlace, opciones?): Promise<void>`
  - `puertosEnlaceReales({ admin?, enviar?, urlBase? }?): PuertosEnlace`

- [ ] **Step 1: Escribir los tests unitarios que fallan**

`src/lib/acceso/otorgar.test.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import { otorgarAcceso } from "./otorgar"

describe("otorgarAcceso", () => {
  it("rechaza un email inválido antes de tocar la base de datos", async () => {
    await expect(
      otorgarAcceso({} as SupabaseClient, { email: "no-es-email", slug: "libro", origen: "cortesia" }),
    ).rejects.toThrow("Email inválido")
  })
})
```

`src/lib/acceso/solicitar-enlace.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { solicitarEnlace, type PuertosEnlace } from "./solicitar-enlace"

function armarPuertos(cambios: Partial<PuertosEnlace> = {}) {
  const enviados: { para: string; url: string }[] = []
  const puertos: PuertosEnlace = {
    urlBase: "https://tienda.ejemplo.com",
    tieneAcceso: vi.fn(async () => true),
    consumirCupo: vi.fn(async () => true),
    generarEnlace: vi.fn(async () => ({ tokenHash: "hash123", tipo: "magiclink" })),
    enviar: vi.fn(async (para: string, url: string) => {
      enviados.push({ para, url })
    }),
    ...cambios,
  }
  return { puertos, enviados }
}

describe("solicitarEnlace", () => {
  it("devuelve 'invalido' con un email mal escrito y no consulta nada", async () => {
    const { puertos } = armarPuertos()
    expect(await solicitarEnlace("nada", "/biblioteca", puertos)).toBe("invalido")
    expect(puertos.consumirCupo).not.toHaveBeenCalled()
  })

  it("envía el enlace a quien tiene acceso", async () => {
    const { puertos, enviados } = armarPuertos()
    expect(await solicitarEnlace("  Ana@Ejemplo.com ", "/biblioteca", puertos)).toBe("aceptado")
    expect(puertos.tieneAcceso).toHaveBeenCalledWith("ana@ejemplo.com")
    expect(enviados).toEqual([
      {
        para: "ana@ejemplo.com",
        url: "https://tienda.ejemplo.com/auth/confirm?token_hash=hash123&type=magiclink&next=%2Fbiblioteca",
      },
    ])
  })

  it("responde igual pero no envía nada si el email no tiene acceso", async () => {
    const { puertos, enviados } = armarPuertos({ tieneAcceso: vi.fn(async () => false) })
    expect(await solicitarEnlace("ana@ejemplo.com", "/biblioteca", puertos)).toBe("aceptado")
    expect(puertos.generarEnlace).not.toHaveBeenCalled()
    expect(enviados).toHaveLength(0)
  })

  it("limita a 3 solicitudes cada 10 minutos por email", async () => {
    const { puertos, enviados } = armarPuertos({ consumirCupo: vi.fn(async () => false) })
    expect(await solicitarEnlace("ana@ejemplo.com", "/biblioteca", puertos)).toBe("aceptado")
    expect(puertos.consumirCupo).toHaveBeenCalledWith("enlace:ana@ejemplo.com", 600, 3)
    expect(puertos.generarEnlace).not.toHaveBeenCalled()
    expect(enviados).toHaveLength(0)
  })

  it("solo permite volver a rutas internas", async () => {
    const { puertos, enviados } = armarPuertos()
    await solicitarEnlace("ana@ejemplo.com", "https://evil.com", puertos)
    await solicitarEnlace("ana@ejemplo.com", "/leer/mi-libro", puertos)
    expect(enviados[0].url).toContain("next=%2Fbiblioteca")
    expect(enviados[1].url).toContain("next=%2Fleer%2Fmi-libro")
  })

  it("no revela fallos internos: responde 'aceptado' aunque falle el envío", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const { puertos } = armarPuertos({
      enviar: vi.fn(async () => {
        throw new Error("Resend caído")
      }),
    })
    expect(await solicitarEnlace("ana@ejemplo.com", "/biblioteca", puertos)).toBe("aceptado")
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
```

`src/lib/acceso/confirmar-enlace.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { confirmarEnlace, esTipoEnlace } from "./confirmar-enlace"

describe("esTipoEnlace", () => {
  it("acepta solo los tipos de enlace de acceso", () => {
    expect(esTipoEnlace("magiclink")).toBe(true)
    expect(esTipoEnlace("email")).toBe(true)
    expect(esTipoEnlace("signup")).toBe(true)
    expect(esTipoEnlace("recovery")).toBe(false)
    expect(esTipoEnlace(null)).toBe(false)
  })
})

describe("confirmarEnlace", () => {
  it("verifica el token y devuelve la ruta de destino", async () => {
    const verificar = vi.fn(async () => ({ error: null }))
    const destino = await confirmarEnlace({ tokenHash: "h", tipo: "magiclink", siguiente: "/leer/libro" }, verificar)
    expect(destino).toBe("/leer/libro")
    expect(verificar).toHaveBeenCalledWith({ type: "magiclink", token_hash: "h" })
  })

  it("manda a la biblioteca con error si faltan datos o el tipo no es válido", async () => {
    const verificar = vi.fn(async () => ({ error: null }))
    expect(await confirmarEnlace({ tokenHash: null, tipo: "magiclink", siguiente: null }, verificar)).toBe(
      "/biblioteca?error=enlace",
    )
    expect(await confirmarEnlace({ tokenHash: "h", tipo: "recovery", siguiente: null }, verificar)).toBe(
      "/biblioteca?error=enlace",
    )
    expect(verificar).not.toHaveBeenCalled()
  })

  it("manda a la biblioteca con error si el token no sirve", async () => {
    const verificar = vi.fn(async () => ({ error: new Error("vencido") }))
    expect(await confirmarEnlace({ tokenHash: "h", tipo: "magiclink", siguiente: "/leer/libro" }, verificar)).toBe(
      "/biblioteca?error=enlace",
    )
  })

  it("no acepta destinos externos", async () => {
    const verificar = vi.fn(async () => ({ error: null }))
    expect(await confirmarEnlace({ tokenHash: "h", tipo: "email", siguiente: "//evil.com" }, verificar)).toBe(
      "/biblioteca",
    )
  })
})
```

`src/lib/correo/enviar-acceso.test.ts`:

```ts
// @vitest-environment node
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, it, vi } from "vitest"
import { enviarCorreoAcceso } from "./enviar-acceso"

const ENLACE = "https://tienda.ejemplo.com/auth/confirm?token_hash=abc&type=magiclink&next=%2Fbiblioteca"

describe("enviarCorreoAcceso", () => {
  it("con RESEND_API_KEY llama a Resend con el destinatario y el enlace", async () => {
    const fetchFn = vi.fn(async () => new Response("{}", { status: 200 }))
    await enviarCorreoAcceso("ana@ejemplo.com", ENLACE, {
      env: { RESEND_API_KEY: "re_123", EMAIL_FROM: "Tienda <acceso@ejemplo.com>" },
      fetchFn,
    })

    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.resend.com/emails")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_123")
    const cuerpo = JSON.parse(init.body as string)
    expect(cuerpo.to).toEqual(["ana@ejemplo.com"])
    expect(cuerpo.from).toBe("Tienda <acceso@ejemplo.com>")
    expect(cuerpo.html).toContain("token_hash=abc&amp;type=magiclink")
    expect(cuerpo.text).toContain(ENLACE)
  })

  it("falla si Resend responde con error", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 422 }))
    await expect(
      enviarCorreoAcceso("ana@ejemplo.com", ENLACE, { env: { RESEND_API_KEY: "k", EMAIL_FROM: "a@b.com" }, fetchFn }),
    ).rejects.toThrow("Resend respondió 422")
  })

  it("falla si hay clave pero falta EMAIL_FROM", async () => {
    await expect(
      enviarCorreoAcceso("ana@ejemplo.com", ENLACE, { env: { RESEND_API_KEY: "k" }, fetchFn: vi.fn() }),
    ).rejects.toThrow("EMAIL_FROM")
  })

  it("en producción sin clave falla en vez de escribir el enlace a un archivo", async () => {
    await expect(
      enviarCorreoAcceso("ana@ejemplo.com", ENLACE, { env: { NODE_ENV: "production" }, fetchFn: vi.fn() }),
    ).rejects.toThrow("RESEND_API_KEY")
  })

  it("con CORREO_DEV=1 guarda el enlace en un archivo aunque NODE_ENV sea production", async () => {
    const directorioDev = mkdtempSync(path.join(tmpdir(), "correo-dev-"))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await enviarCorreoAcceso("ana@ejemplo.com", ENLACE, {
      env: { NODE_ENV: "production", CORREO_DEV: "1" },
      fetchFn: vi.fn(),
      directorioDev,
    })
    expect(readdirSync(directorioDev)).toHaveLength(1)
    log.mockRestore()
  })

  it("en desarrollo sin clave guarda el enlace en un archivo con permisos 600", async () => {
    const directorioDev = mkdtempSync(path.join(tmpdir(), "correo-dev-"))
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await enviarCorreoAcceso("ana@ejemplo.com", ENLACE, { env: {}, fetchFn: vi.fn(), directorioDev })

    const [archivo] = readdirSync(directorioDev)
    const ruta = path.join(directorioDev, archivo)
    expect(readFileSync(ruta, "utf8")).toContain(ENLACE)
    expect(statSync(ruta).mode & 0o777).toBe(0o600)
    // Solo se imprime la ruta del archivo, nunca el enlace.
    const impreso = log.mock.calls.flat().join(" ")
    expect(impreso).toContain(directorioDev)
    expect(impreso).not.toContain("token_hash")
    log.mockRestore()
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven los módulos de `acceso` ni `enviar-acceso`.

- [ ] **Step 3: Implementar límites, accesos y solicitud de enlace**

`src/lib/limites.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"

/** Registra un uso de `clave` si hay cupo en la ventana. Devuelve false si ya se alcanzó el máximo. */
export async function consumirCupo(
  admin: SupabaseClient,
  clave: string,
  ventanaSeg: number,
  maximo: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("consumir_cupo", {
    p_clave: clave,
    p_ventana_seg: ventanaSeg,
    p_maximo: maximo,
  })
  if (error) throw new Error(`No se pudo consultar el límite de uso: ${error.message}`)
  return data === true
}
```

`src/lib/acceso/otorgar.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import { normalizarEmail } from "@/lib/correo/normalizar"

export type OrigenAcceso = "pago" | "cortesia"

/** Da (o reactiva) el acceso de un email a un libro. La fase de pagos usa esta misma función. */
export async function otorgarAcceso(
  admin: SupabaseClient,
  params: { email: string; slug: string; origen: OrigenAcceso; orderId?: string | null },
): Promise<void> {
  const email = normalizarEmail(params.email)
  if (!email) throw new Error("Email inválido")

  const { data: libro, error: errorLibro } = await admin.from("books").select("id").eq("slug", params.slug).maybeSingle()
  if (errorLibro) throw new Error(errorLibro.message)
  if (!libro) throw new Error(`No existe el libro "${params.slug}". Procésalo primero con npm run libro:procesar.`)

  const { error } = await admin
    .from("entitlements")
    .upsert(
      { email, book_id: libro.id, origen: params.origen, order_id: params.orderId ?? null, activo: true },
      { onConflict: "email,book_id" },
    )
  if (error) throw new Error(error.message)
}
```

`src/lib/acceso/solicitar-enlace.ts`:

```ts
import { normalizarEmail } from "@/lib/correo/normalizar"
import { rutaSegura } from "@/lib/ruta-segura"

export type PuertosEnlace = {
  urlBase: string
  tieneAcceso: (email: string) => Promise<boolean>
  consumirCupo: (clave: string, ventanaSeg: number, maximo: number) => Promise<boolean>
  generarEnlace: (email: string) => Promise<{ tokenHash: string; tipo: string }>
  enviar: (para: string, url: string) => Promise<void>
}

const VENTANA_SEG = 600
const MAXIMO_SOLICITUDES = 3

/**
 * Envía un enlace de acceso solo si el email tiene libros. Para no revelar quién es comprador,
 * responde "aceptado" tanto si envió el correo como si no había acceso o se alcanzó el límite.
 */
export async function solicitarEnlace(
  entrada: unknown,
  siguiente: string,
  puertos: PuertosEnlace,
): Promise<"invalido" | "aceptado"> {
  const email = normalizarEmail(entrada)
  if (!email) return "invalido"

  try {
    if (!(await puertos.consumirCupo(`enlace:${email}`, VENTANA_SEG, MAXIMO_SOLICITUDES))) return "aceptado"
    if (!(await puertos.tieneAcceso(email))) return "aceptado"

    const { tokenHash, tipo } = await puertos.generarEnlace(email)
    const url = new URL("/auth/confirm", puertos.urlBase)
    url.searchParams.set("token_hash", tokenHash)
    url.searchParams.set("type", tipo)
    url.searchParams.set("next", rutaSegura(siguiente))
    await puertos.enviar(email, url.toString())
  } catch (error) {
    // Se registra el motivo (sin email ni enlace) y el lector ve la misma respuesta de siempre.
    console.error("No se pudo enviar el enlace de acceso:", error instanceof Error ? error.message : "error desconocido")
  }
  return "aceptado"
}
```

`src/lib/acceso/confirmar-enlace.ts`:

```ts
import { rutaSegura } from "@/lib/ruta-segura"

export const TIPOS_ENLACE = ["magiclink", "email", "signup"] as const
export type TipoEnlace = (typeof TIPOS_ENLACE)[number]

const RUTA_ERROR = "/biblioteca?error=enlace"

export function esTipoEnlace(tipo: string | null | undefined): tipo is TipoEnlace {
  return TIPOS_ENLACE.includes(tipo as TipoEnlace)
}

/** Gasta el enlace de un solo uso y devuelve la ruta a la que hay que redirigir. */
export async function confirmarEnlace(
  params: { tokenHash: string | null; tipo: string | null; siguiente: string | null },
  verificar: (args: { type: string; token_hash: string }) => Promise<{ error: unknown }>,
): Promise<string> {
  if (!params.tokenHash || !esTipoEnlace(params.tipo)) return RUTA_ERROR
  const { error } = await verificar({ type: params.tipo, token_hash: params.tokenHash })
  return error ? RUTA_ERROR : rutaSegura(params.siguiente)
}
```

- [ ] **Step 4: Implementar el envío del correo**

`src/lib/correo/enviar-acceso.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

export type OpcionesCorreo = {
  env?: Record<string, string | undefined>
  fetchFn?: typeof fetch
  directorioDev?: string
}

const ASUNTO = "Tu enlace para entrar a tu biblioteca"

function escaparAtributo(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}

function cuerpoHtml(enlace: string): string {
  return `<div style="font-family:Georgia,serif;background:#f6f0e4;padding:32px;color:#1d1a16">
  <h1 style="font-size:24px;margin:0 0 16px">Tu biblioteca te espera</h1>
  <p style="font-size:16px;line-height:1.5;margin:0 0 24px">Toca el botón para entrar. El enlace es personal y funciona una sola vez.</p>
  <p style="margin:0 0 24px"><a href="${escaparAtributo(enlace)}" style="background:#1f5a3d;color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:bold">Entrar a mi biblioteca</a></p>
  <p style="font-size:13px;color:#5b5347;margin:0">Si no lo pediste, puedes ignorar este correo.</p>
</div>`
}

function cuerpoTexto(enlace: string): string {
  return `Tu biblioteca te espera.\n\nEntra con este enlace personal (funciona una sola vez):\n${enlace}\n\nSi no lo pediste, puedes ignorar este correo.`
}

/** En desarrollo (sin RESEND_API_KEY) el enlace se guarda en un archivo privado en vez de imprimirse. */
async function guardarEnlaceDev(para: string, enlace: string, directorio: string): Promise<string> {
  await mkdir(directorio, { recursive: true })
  const ruta = path.join(directorio, `${Date.now()}-${para.replace(/[^a-z0-9]/gi, "_")}.txt`)
  await writeFile(ruta, `${para}\n${enlace}\n`, { mode: 0o600 })
  return ruta
}

export async function enviarCorreoAcceso(para: string, enlace: string, opciones: OpcionesCorreo = {}): Promise<void> {
  const env = opciones.env ?? process.env
  const apiKey = env.RESEND_API_KEY

  if (!apiKey) {
    // CORREO_DEV=1 permite probar el flujo completo con un build local sin enviar correos reales.
    if (env.NODE_ENV === "production" && env.CORREO_DEV !== "1") {
      throw new Error("Falta RESEND_API_KEY para enviar correos en producción")
    }
    const ruta = await guardarEnlaceDev(para, enlace, opciones.directorioDev ?? path.join("out", "correo-dev"))
    console.log(`Enlace de acceso de desarrollo guardado en ${ruta}`)
    return
  }

  const from = env.EMAIL_FROM
  if (!from) throw new Error("Falta EMAIL_FROM (por ejemplo: Ebooks de Jhei Trujillo <acceso@tu-dominio.com>)")

  const fetchFn = opciones.fetchFn ?? fetch
  const respuesta = await fetchFn("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [para], subject: ASUNTO, html: cuerpoHtml(enlace), text: cuerpoTexto(enlace) }),
  })
  if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}`)
}
```

Agrega esta línea al final de `.env.example`:

```
# Solo para pruebas locales con un build: guarda los enlaces en out/correo-dev/ aunque NODE_ENV sea production. No lo uses en producción.
# CORREO_DEV=1
```

- [ ] **Step 5: Ejecutar los tests unitarios**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Adaptadores reales, pantalla de confirmación y ruta que abre la sesión**

`src/lib/acceso/adaptadores.ts`:

```ts
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { enviarCorreoAcceso } from "@/lib/correo/enviar-acceso"
import { consumirCupo } from "@/lib/limites"
import { getSiteUrl } from "@/lib/site"
import { crearClienteAdmin } from "@/lib/supabase/admin"
import type { PuertosEnlace } from "./solicitar-enlace"

export function puertosEnlaceReales(
  opciones: { admin?: SupabaseClient; enviar?: PuertosEnlace["enviar"]; urlBase?: string } = {},
): PuertosEnlace {
  const admin = opciones.admin ?? crearClienteAdmin()
  return {
    urlBase: opciones.urlBase ?? getSiteUrl(),
    tieneAcceso: async (email) => {
      const { count, error } = await admin
        .from("entitlements")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .eq("activo", true)
      if (error) throw new Error(error.message)
      return (count ?? 0) > 0
    },
    consumirCupo: (clave, ventanaSeg, maximo) => consumirCupo(admin, clave, ventanaSeg, maximo),
    generarEnlace: async (email) => {
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email })
      if (error || !data?.properties) throw new Error(error?.message ?? "generateLink no devolvió propiedades")
      return { tokenHash: data.properties.hashed_token, tipo: data.properties.verification_type }
    },
    enviar: opciones.enviar ?? ((para, url) => enviarCorreoAcceso(para, url)),
  }
}
```

`src/app/auth/confirm/page.tsx` (lee `searchParams` como promesa; el botón evita que un escáner de correo gaste el enlace):

```tsx
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { esTipoEnlace } from "@/lib/acceso/confirmar-enlace"
import { rutaSegura } from "@/lib/ruta-segura"

export const metadata = { title: "Entrar a mi biblioteca", robots: { index: false } }

type Props = { searchParams: Promise<{ token_hash?: string; type?: string; next?: string }> }

export default async function ConfirmarPage({ searchParams }: Props) {
  const { token_hash: tokenHash, type, next } = await searchParams
  if (!tokenHash || !esTipoEnlace(type)) redirect("/biblioteca?error=enlace")

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-16 text-center sm:px-6">
      <h1 className="font-serif text-3xl">Un paso más</h1>
      <p className="mt-3 text-tinta-suave">
        Confirma que eres tú para entrar a tu biblioteca. Este enlace es personal y funciona una sola vez.
      </p>
      <form method="post" action="/auth/entrar" className="mt-8">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={rutaSegura(next)} />
        <Button type="submit" className="w-full">
          Entrar a mi biblioteca
        </Button>
      </form>
    </main>
  )
}
```

`src/app/auth/entrar/route.ts`:

```ts
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { confirmarEnlace } from "@/lib/acceso/confirmar-enlace"
import { crearClienteServidor } from "@/lib/supabase/server"

function texto(formulario: FormData, nombre: string): string | null {
  const valor = formulario.get(nombre)
  return typeof valor === "string" ? valor : null
}

export async function POST(request: NextRequest) {
  const formulario = await request.formData()
  const supabase = await crearClienteServidor()

  const destino = await confirmarEnlace(
    { tokenHash: texto(formulario, "token_hash"), tipo: texto(formulario, "type"), siguiente: texto(formulario, "next") },
    (args) => supabase.auth.verifyOtp({ type: args.type as EmailOtpType, token_hash: args.token_hash }),
  )
  return NextResponse.redirect(new URL(destino, request.nextUrl.origin), 303)
}
```

- [ ] **Step 7: Escribir la prueba de integración contra el Supabase local**

Esta prueba resuelve dos dudas que la documentación no aclara: si `generateLink` crea al usuario cuando no existe y con qué `type` hay que llamar a `verifyOtp`.

`src/lib/acceso/acceso.integration.test.ts`:

```ts
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  clienteAdminPrueba,
  clienteAnonimoPrueba,
  clienteConToken,
  crearLibroPrueba,
  emailUnico,
  hayEntorno,
  limpiarPrueba,
} from "@/test/integracion"
import { puertosEnlaceReales } from "./adaptadores"
import { otorgarAcceso } from "./otorgar"
import { solicitarEnlace } from "./solicitar-enlace"

describe.skipIf(!hayEntorno)("enlace mágico (Supabase local)", () => {
  const admin: SupabaseClient = clienteAdminPrueba()
  let libro: { id: string; slug: string }
  const usuarioIds: string[] = []

  beforeAll(async () => {
    libro = await crearLibroPrueba(admin)
  })

  afterAll(async () => {
    await limpiarPrueba(admin, { bookIds: [libro.id], usuarioIds })
  })

  it("un email con acceso recibe un enlace de un solo uso que abre una sesión que solo ve lo suyo", async () => {
    const email = emailUnico("ana")
    const otro = emailUnico("beto")
    await otorgarAcceso(admin, { email: email.toUpperCase(), slug: libro.slug, origen: "cortesia" })
    await otorgarAcceso(admin, { email: otro, slug: libro.slug, origen: "cortesia" })

    let enlace = ""
    const puertos = puertosEnlaceReales({
      admin,
      urlBase: "http://localhost:3000",
      enviar: async (_para, url) => {
        enlace = url
      },
    })
    expect(await solicitarEnlace(email, "/leer/libro", puertos)).toBe("aceptado")
    expect(enlace).toContain("/auth/confirm?token_hash=")

    const url = new URL(enlace)
    const tokenHash = url.searchParams.get("token_hash") as string
    const tipo = url.searchParams.get("type") as EmailOtpType
    expect(url.searchParams.get("next")).toBe("/leer/libro")

    const anonimo = clienteAnonimoPrueba()
    const { data, error } = await anonimo.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    expect(error).toBeNull()
    expect(data.user?.email).toBe(email)
    if (data.user) usuarioIds.push(data.user.id)
    expect(data.session?.access_token).toBeTruthy()

    // Con la sesión de Ana: solo ve su propio acceso (RLS) y no puede leer tablas del servidor.
    const sesion = clienteConToken(data.session?.access_token as string)
    const { data: accesos } = await sesion.from("entitlements").select("email")
    expect(accesos).toEqual([{ email }])
    const { error: errorPaginas } = await sesion.from("book_pages").select("numero")
    expect(errorPaginas?.code).toBe("42501")

    // El enlace es de un solo uso.
    const { error: segundoUso } = await clienteAnonimoPrueba().auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    expect(segundoUso).not.toBeNull()
  })

  it("un email sin acceso recibe la misma respuesta pero no se envía nada", async () => {
    let enviados = 0
    const puertos = puertosEnlaceReales({
      admin,
      enviar: async () => {
        enviados++
      },
    })
    expect(await solicitarEnlace(emailUnico("sin-acceso"), "/biblioteca", puertos)).toBe("aceptado")
    expect(enviados).toBe(0)
  })

  it("bloquea la cuarta solicitud en 10 minutos", async () => {
    const email = emailUnico("insistente")
    await otorgarAcceso(admin, { email, slug: libro.slug, origen: "cortesia" })
    let enviados = 0
    const puertos = puertosEnlaceReales({
      admin,
      enviar: async () => {
        enviados++
      },
    })
    for (let i = 0; i < 4; i++) await solicitarEnlace(email, "/biblioteca", puertos)
    expect(enviados).toBe(3)
  })
})
```

- [ ] **Step 8: Correr la prueba de integración**

Con `supabase start` corriendo:

Run: `npm run test:integracion`
Expected: PASS en las 3 pruebas.

Si la primera falla, lee el mensaje y aplica **solo** la causa que corresponda:
- `Signups not allowed` al generar el enlace: pon `enable_signup = true` en `supabase/config.toml`, ejecuta `supabase stop && supabase start`, vuelve a correr `npm run env:local` y repite. Deja el comentario en el `config.toml` explicando que los usuarios los crea solo el servidor y que las llaves públicas no salen al navegador.
- `verifyOtp` rechaza el `type` recibido: cambia `TIPOS_ENLACE` y la prueba para usar el `verification_type` que devuelva `generateLink` en tu versión (imprímelo una vez) y anota el hallazgo en un comentario.
- `data.properties` viene con otra forma: ajusta `generarEnlace` en `adaptadores.ts` y `sesionPara` en `src/test/integracion.ts` a la forma real.

- [ ] **Step 9: Verificar todo y hacer commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa; el build lista `/auth/confirm` (dinámica) y `/auth/entrar`.

```bash
git add -A
git commit -m "feat: enlace mágico propio con Resend, confirmación en dos pasos y pruebas de integración" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Biblioteca

**Files:**
- Create: `src/lib/biblioteca.ts`, `src/app/biblioteca/tipos.ts`, `src/app/biblioteca/actions.ts`, `src/app/biblioteca/formulario-acceso.tsx`, `src/app/biblioteca/page.tsx`, `scripts/dar-acceso.ts`
- Modify: `package.json`
- Test: `src/app/biblioteca/formulario-acceso.test.tsx`, `src/lib/biblioteca.integration.test.ts`

**Interfaces:**
- Consumes: `solicitarEnlace`, `puertosEnlaceReales`, `crearClienteServidor`, `emailActual`, `rutaSegura`, `otorgarAcceso`, `getBook` (Fase 1).
- Produces:
  - `type LibroBiblioteca = { slug: string; titulo: string; total: number; ultimaPagina: number | null }`
  - `obtenerBiblioteca(usuario: SupabaseClient): Promise<LibroBiblioteca[]>`
  - `type EstadoAcceso = { estado: "inicial" | "invalido" | "aceptado" }`, `ESTADO_INICIAL`
  - `FormularioAcceso({ accion, siguiente, errorEnlace? })`
  - Server actions `solicitarAcceso(anterior, formData)` y `cerrarSesion()`
  - Script `npm run acceso -- <email> <slug>` (acceso de cortesía)

- [ ] **Step 1: Escribir el test que falla del formulario**

`src/app/biblioteca/formulario-acceso.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FormularioAcceso } from "./formulario-acceso"
import type { EstadoAcceso } from "./tipos"

function enviar(email: string) {
  fireEvent.change(screen.getByLabelText("Tu email"), { target: { value: email } })
  fireEvent.submit(screen.getByRole("button", { name: /enviarme el enlace/i }).closest("form") as HTMLFormElement)
}

describe("FormularioAcceso", () => {
  it("muestra el campo de email y el botón", () => {
    render(<FormularioAcceso accion={vi.fn()} siguiente="/biblioteca" />)
    expect(screen.getByLabelText("Tu email")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /enviarme el enlace/i })).toBeInTheDocument()
  })

  it("avisa cuando el enlace anterior ya no sirve", () => {
    render(<FormularioAcceso accion={vi.fn()} siguiente="/biblioteca" errorEnlace />)
    expect(screen.getByRole("alert")).toHaveTextContent(/ya no es válido/i)
  })

  it("pide revisar el email si la acción lo marca como inválido", async () => {
    const accion = vi.fn(async (): Promise<EstadoAcceso> => ({ estado: "invalido" }))
    render(<FormularioAcceso accion={accion} siguiente="/biblioteca" />)
    enviar("mal")
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/revisa tu email/i))
  })

  it("muestra el mensaje neutro cuando el enlace fue aceptado", async () => {
    const accion = vi.fn(async (): Promise<EstadoAcceso> => ({ estado: "aceptado" }))
    render(<FormularioAcceso accion={accion} siguiente="/biblioteca" />)
    enviar("ana@ejemplo.com")
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/si ese email tiene libros/i))
    expect(screen.queryByLabelText("Tu email")).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — no se resuelve `./formulario-acceso`.

- [ ] **Step 3: Implementar el formulario y las acciones**

`src/app/biblioteca/tipos.ts`:

```ts
export type EstadoAcceso = { estado: "inicial" | "invalido" | "aceptado" }

export const ESTADO_INICIAL: EstadoAcceso = { estado: "inicial" }
```

`src/app/biblioteca/formulario-acceso.tsx`:

```tsx
"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { ESTADO_INICIAL, type EstadoAcceso } from "./tipos"

type Props = {
  accion: (anterior: EstadoAcceso, datos: FormData) => Promise<EstadoAcceso>
  siguiente: string
  errorEnlace?: boolean
}

export function FormularioAcceso({ accion, siguiente, errorEnlace = false }: Props) {
  const [estado, formAction, pendiente] = useActionState(accion, ESTADO_INICIAL)

  if (estado.estado === "aceptado") {
    return (
      <div role="status" className="rounded-2xl border border-linea bg-white/60 p-6 text-left">
        <p className="font-serif text-xl">Revisa tu correo</p>
        <p className="mt-2 text-tinta-suave">
          Si ese email tiene libros con nosotros, te enviamos un enlace para entrar. Puede tardar un minuto y a veces
          llega a correo no deseado. El enlace funciona una sola vez.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4 text-left">
      {errorEnlace ? (
        <p role="alert" className="rounded-xl border border-dorado-claro bg-papel-oscuro p-4 text-sm">
          Ese enlace ya no es válido. Pide uno nuevo aquí abajo.
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Tu email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="el email con el que compraste"
          className="mt-2 w-full rounded-xl border border-linea bg-white px-4 py-3 text-base outline-none focus:border-cancha focus:ring-2 focus:ring-cancha/30"
        />
      </div>
      <input type="hidden" name="next" value={siguiente} />
      {estado.estado === "invalido" ? (
        <p role="alert" className="text-sm text-tinta">
          Revisa tu email: parece que no está bien escrito.
        </p>
      ) : null}
      <Button type="submit" disabled={pendiente} className="w-full">
        {pendiente ? "Enviando…" : "Enviarme el enlace"}
      </Button>
    </form>
  )
}
```

`src/app/biblioteca/actions.ts`:

```ts
"use server"

import { redirect } from "next/navigation"
import { puertosEnlaceReales } from "@/lib/acceso/adaptadores"
import { solicitarEnlace } from "@/lib/acceso/solicitar-enlace"
import { crearClienteServidor } from "@/lib/supabase/server"
import type { EstadoAcceso } from "./tipos"

export async function solicitarAcceso(_anterior: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const resultado = await solicitarEnlace(datos.get("email"), String(datos.get("next") ?? ""), puertosEnlaceReales())
  return { estado: resultado === "invalido" ? "invalido" : "aceptado" }
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  redirect("/biblioteca")
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS. Si `fireEvent.submit` no dispara la acción del formulario en jsdom, envuelve el `submit` en `act` y espera con `waitFor` (React 19 procesa las acciones de forma asíncrona).

- [ ] **Step 5: Consulta de la biblioteca y prueba de integración**

`src/lib/biblioteca.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import { getBook } from "@/content/books"

export type LibroBiblioteca = { slug: string; titulo: string; total: number; ultimaPagina: number | null }

type FilaAcceso = {
  book_id: string
  books: { slug: string; titulo: string; total_paginas: number } | { slug: string; titulo: string; total_paginas: number }[] | null
}

/** Libros a los que el usuario tiene acceso, con su última página leída. Respeta RLS. */
export async function obtenerBiblioteca(usuario: SupabaseClient): Promise<LibroBiblioteca[]> {
  const { data: accesos, error } = await usuario
    .from("entitlements")
    .select("book_id, books(slug, titulo, total_paginas)")
    .eq("activo", true)
  if (error) throw new Error(error.message)

  const { data: progreso, error: errorProgreso } = await usuario.from("reading_progress").select("book_id, ultima_pagina")
  if (errorProgreso) throw new Error(errorProgreso.message)
  const ultimaPorLibro = new Map((progreso ?? []).map((fila) => [fila.book_id as string, fila.ultima_pagina as number]))

  const libros: LibroBiblioteca[] = []
  for (const fila of (accesos ?? []) as unknown as FilaAcceso[]) {
    const libro = Array.isArray(fila.books) ? fila.books[0] : fila.books
    if (!libro) continue
    libros.push({
      slug: libro.slug,
      titulo: getBook(libro.slug)?.titulo ?? libro.titulo,
      total: libro.total_paginas,
      ultimaPagina: ultimaPorLibro.get(fila.book_id) ?? null,
    })
  }
  return libros
}
```

`src/lib/biblioteca.integration.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { otorgarAcceso } from "@/lib/acceso/otorgar"
import { clienteAdminPrueba, crearLibroPrueba, emailUnico, hayEntorno, limpiarPrueba, sesionPara } from "@/test/integracion"
import { obtenerBiblioteca } from "./biblioteca"

describe.skipIf(!hayEntorno)("biblioteca (Supabase local)", () => {
  const admin = clienteAdminPrueba()
  let libro: { id: string; slug: string }
  const usuarioIds: string[] = []

  beforeAll(async () => {
    libro = await crearLibroPrueba(admin, 10)
  })

  afterAll(async () => {
    await limpiarPrueba(admin, { bookIds: [libro.id], usuarioIds })
  })

  it("lista solo los libros del usuario con su última página", async () => {
    const email = emailUnico("ana")
    await otorgarAcceso(admin, { email, slug: libro.slug, origen: "cortesia" })
    const sesion = await sesionPara(admin, email)
    usuarioIds.push(sesion.usuarioId)

    expect(await obtenerBiblioteca(sesion.cliente)).toEqual([
      { slug: libro.slug, titulo: "Libro de prueba", total: 10, ultimaPagina: null },
    ])

    const { error } = await sesion.cliente
      .from("reading_progress")
      .upsert({ email, book_id: libro.id, ultima_pagina: 4 }, { onConflict: "email,book_id" })
    expect(error).toBeNull()
    expect((await obtenerBiblioteca(sesion.cliente))[0].ultimaPagina).toBe(4)
  })

  it("un usuario sin acceso ve una biblioteca vacía", async () => {
    const sesion = await sesionPara(admin, emailUnico("sin-libros"))
    usuarioIds.push(sesion.usuarioId)
    expect(await obtenerBiblioteca(sesion.cliente)).toEqual([])
  })
})
```

Run: `npm run test:integracion`
Expected: PASS (incluye las pruebas de la Tarea 5). Si el embebido `books(...)` devuelve error de relación, confirma en la migración que `entitlements.book_id` referencia `books(id)` y que `authenticated` tiene `select` sobre `books`.

- [ ] **Step 6: Página de la biblioteca y script de acceso de cortesía**

`src/app/biblioteca/page.tsx`:

```tsx
import Link from "next/link"
import { ButtonLink } from "@/components/ui/button"
import { obtenerBiblioteca } from "@/lib/biblioteca"
import { rutaSegura } from "@/lib/ruta-segura"
import { crearClienteServidor } from "@/lib/supabase/server"
import { emailActual } from "@/lib/supabase/usuario"
import { cerrarSesion, solicitarAcceso } from "./actions"
import { FormularioAcceso } from "./formulario-acceso"

export const metadata = { title: "Mi biblioteca", robots: { index: false } }

type Props = { searchParams: Promise<{ error?: string; next?: string }> }

export default async function BibliotecaPage({ searchParams }: Props) {
  const { error, next } = await searchParams
  const usuario = await crearClienteServidor()
  const email = await emailActual(usuario)
  const libros = email ? await obtenerBiblioteca(usuario) : []

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-16 sm:px-6">
      <h1 className="font-serif text-4xl">Mi biblioteca</h1>

      {email ? (
        <>
          <p className="mt-2 text-tinta-suave">Entraste como {email}.</p>
          {libros.length > 0 ? (
            <ul className="mt-8 space-y-4">
              {libros.map((libro) => (
                <li key={libro.slug} className="rounded-2xl border border-linea bg-white/60 p-6">
                  <h2 className="font-serif text-2xl">{libro.titulo}</h2>
                  <p className="mt-1 text-sm text-tinta-suave">
                    {libro.ultimaPagina ? `Vas en la página ${libro.ultimaPagina} de ${libro.total}` : "Aún no lo empiezas"}
                  </p>
                  <ButtonLink href={`/leer/${libro.slug}`} className="mt-4">
                    {libro.ultimaPagina ? "Seguir leyendo" : "Empezar a leer"}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-8 rounded-2xl border border-linea bg-white/60 p-6 text-tinta-suave">
              Todavía no tienes libros con este email. Si compraste con otro, cierra sesión y entra con ese.
            </p>
          )}
          <form action={cerrarSesion} className="mt-8">
            <button type="submit" className="text-sm underline underline-offset-4">
              Cerrar sesión
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-tinta-suave">
            Escribe el email con el que compraste y te enviamos un enlace para entrar. Sin contraseñas.
          </p>
          <div className="mt-8">
            <FormularioAcceso accion={solicitarAcceso} siguiente={rutaSegura(next)} errorEnlace={error === "enlace"} />
          </div>
        </>
      )}

      <p className="mt-12 text-sm">
        <Link href="/" className="underline underline-offset-4">
          Volver a la tienda
        </Link>
      </p>
    </main>
  )
}
```

`scripts/dar-acceso.ts`:

```ts
import { otorgarAcceso } from "../src/lib/acceso/otorgar"
import { cargarEnvLocal } from "../src/lib/cargar-env"
import { crearClienteAdmin } from "../src/lib/supabase/admin-cliente"

async function main() {
  cargarEnvLocal()
  const [email, slug] = process.argv.slice(2)
  if (!email || !slug) {
    console.error("Uso: npm run acceso -- ana@ejemplo.com si-dios-jugara-futbol")
    process.exit(1)
  }
  await otorgarAcceso(crearClienteAdmin(), { email, slug, origen: "cortesia" })
  console.log(`Acceso de cortesía otorgado a ${email.trim().toLowerCase()} para "${slug}".`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

```bash
npm pkg set scripts.acceso="tsx scripts/dar-acceso.ts"
```

- [ ] **Step 7: Verificar y hacer commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa; el build lista `/biblioteca` como dinámica.

```bash
git add -A
git commit -m "feat: biblioteca con acceso por enlace, acciones y script de acceso de cortesía" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 7: Procesar el libro (PDF → páginas WebP → Supabase)

**Files:**
- Create: `scripts/libros/si-dios-jugara-futbol.json`, `src/lib/libro/config.ts`, `src/lib/libro/render.ts`, `src/lib/libro/subir.ts`, `src/lib/concurrencia.ts`, `scripts/procesar-libro.ts`
- Modify: `src/lib/libro/recorte.ts`, `package.json`
- Test: `src/lib/libro/recorte.test.ts` (ampliar), `src/lib/libro/config.test.ts`, `src/lib/concurrencia.test.ts`, `src/lib/libro/subir.integration.test.ts`

**Interfaces:**
- Consumes: `cajaAPixeles`, `CajaPx` (Tarea 1); `crearClienteAdmin` de `admin-cliente.ts`; `cargarEnvLocal`.
- Produces:
  - `type CajaPdf = { x0: number; y0: number; x1: number; y1: number }`, `type CajasPdf = { media: CajaPdf; trim: CajaPdf }`
  - `leerCajasPdfinfo(salida: string): CajasPdf`, `leerTotalPaginas(salida: string): number`, `recortePagina(cajas: CajasPdf, dpi: number, insetPx?: number): CajaPx`
  - `type ConfigLibro = { slug: string; titulo: string; vistaPrevia: { desde: number; hasta: number }; capitulos: { pagina: number; titulo: string }[] }`, `validarConfigLibro(config: unknown, totalPaginas: number): ConfigLibro`
  - `ejecutarConConcurrencia<T>(items: T[], limite: number, tarea: (item: T, indice: number) => Promise<void>): Promise<void>`
  - `leerInfoPdf(pdf: string): Promise<{ total: number; cajas: CajasPdf }>`, `renderizarPagina(pdf, numero, recorte, dpi, calidad?): Promise<Buffer>`
  - `rutaPagina(slug, numero): string` (`"<slug>/<numero>.webp"`), `subirPagina(admin, slug, numero, webp): Promise<void>`, `guardarLibro(admin, config, total): Promise<string>` (devuelve el `book_id`)
  - Script `npm run libro:procesar -- "<pdf>" <config.json> [--solo=17,18] [--guardar-local]`

- [ ] **Step 1: Ampliar los tests de recorte**

Reemplaza `src/lib/libro/recorte.test.ts` completo:

```ts
import { describe, expect, it } from "vitest"
import { cajaAPixeles, leerCajasPdfinfo, leerTotalPaginas, recortePagina } from "./recorte"

// Salida real de `pdfinfo -box -f 1 -l 2` sobre el interior de "Si Dios jugara fútbol".
const SALIDA_PDFINFO = `Page    1 MediaBox:      0.00     0.00   467.20   722.31
Page    1 CropBox:       0.00     0.00   467.20   722.31
Page    1 BleedBox:      6.83     6.83   460.37   715.49
Page    1 TrimBox:      21.00    21.00   446.20   701.31
Page    1 ArtBox:       21.00    21.00   446.20   701.31
Page    2 MediaBox:      0.00     0.00   467.20   722.31
Page    2 CropBox:       0.00     0.00   467.20   722.31
Page    2 BleedBox:      6.83     6.83   460.37   715.49
Page    2 TrimBox:      21.00    21.00   446.20   701.31
Page    2 ArtBox:       21.00    21.00   446.20   701.31
`

describe("cajaAPixeles", () => {
  it("convierte puntos a píxeles según los dpi y redondea", () => {
    expect(cajaAPixeles({ x: 21, y: 21, ancho: 425.2, alto: 680.32 }, 200)).toEqual({
      x: 58,
      y: 58,
      ancho: 1181,
      alto: 1890,
    })
  })

  it("con 72 dpi los puntos son píxeles", () => {
    expect(cajaAPixeles({ x: 10, y: 20, ancho: 100, alto: 200 }, 72)).toEqual({
      x: 10,
      y: 20,
      ancho: 100,
      alto: 200,
    })
  })
})

describe("leerCajasPdfinfo", () => {
  it("lee la caja de medios y la de corte", () => {
    expect(leerCajasPdfinfo(SALIDA_PDFINFO)).toEqual({
      media: { x0: 0, y0: 0, x1: 467.2, y1: 722.31 },
      trim: { x0: 21, y0: 21, x1: 446.2, y1: 701.31 },
    })
  })

  it("usa la caja de medios si el PDF no trae TrimBox", () => {
    const cajas = leerCajasPdfinfo("Page    1 MediaBox:      0.00     0.00   400.00   600.00\n")
    expect(cajas.trim).toEqual(cajas.media)
  })

  it("falla si las páginas no comparten las mismas cajas", () => {
    const distinta = `${SALIDA_PDFINFO}Page    3 TrimBox:      10.00    10.00   400.00   600.00\n`
    expect(() => leerCajasPdfinfo(distinta)).toThrow(/mismas cajas/)
  })

  it("falla si pdfinfo no devolvió cajas", () => {
    expect(() => leerCajasPdfinfo("nada útil")).toThrow(/MediaBox/)
  })
})

describe("recortePagina", () => {
  it("recorta a la caja de corte con 1 px de margen hacia adentro", () => {
    expect(recortePagina(leerCajasPdfinfo(SALIDA_PDFINFO), 200)).toEqual({ x: 59, y: 59, ancho: 1179, alto: 1888 })
  })

  it("permite quitar el margen", () => {
    expect(recortePagina(leerCajasPdfinfo(SALIDA_PDFINFO), 200, 0)).toEqual({ x: 58, y: 58, ancho: 1181, alto: 1890 })
  })
})

describe("leerTotalPaginas", () => {
  it("lee el número de páginas", () => {
    expect(leerTotalPaginas("Title:  x\nPages:          240\nEncrypted:      no\n")).toBe(240)
  })

  it("falla si no aparece", () => {
    expect(() => leerTotalPaginas("Title: x")).toThrow(/páginas/)
  })
})
```

- [ ] **Step 2: Escribir los tests de configuración y de concurrencia**

`src/lib/libro/config.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { validarConfigLibro } from "./config"

const valida = {
  slug: "mi-libro",
  titulo: "Mi libro",
  vistaPrevia: { desde: 1, hasta: 5 },
  capitulos: [
    { pagina: 3, titulo: "Uno" },
    { pagina: 8, titulo: "Dos" },
  ],
}

describe("validarConfigLibro", () => {
  it("acepta una configuración válida", () => {
    expect(validarConfigLibro(valida, 20)).toEqual(valida)
  })

  it.each([
    ["slug con mayúsculas", { ...valida, slug: "Mi Libro" }, /slug/],
    ["sin título", { ...valida, titulo: " " }, /título/],
    ["vista previa que no empieza en 1", { ...valida, vistaPrevia: { desde: 2, hasta: 5 } }, /vistaPrevia/],
    ["vista previa más larga que el libro", { ...valida, vistaPrevia: { desde: 1, hasta: 21 } }, /vistaPrevia/],
    ["capítulos vacíos", { ...valida, capitulos: [] }, /capítulos/],
    ["capítulo fuera del libro", { ...valida, capitulos: [{ pagina: 25, titulo: "X" }] }, /fuera de 1\.\.20/],
    [
      "capítulos desordenados",
      { ...valida, capitulos: [{ pagina: 8, titulo: "A" }, { pagina: 3, titulo: "B" }] },
      /orden creciente/,
    ],
    ["capítulo sin título", { ...valida, capitulos: [{ pagina: 3, titulo: "" }] }, /falta el título/],
  ])("rechaza %s", (_nombre, config, mensaje) => {
    expect(() => validarConfigLibro(config, 20)).toThrow(mensaje)
  })

  it("rechaza algo que no es un objeto", () => {
    expect(() => validarConfigLibro(null, 20)).toThrow(/inválida/)
  })
})

describe("configuración de Si Dios jugara fútbol", () => {
  const config = JSON.parse(
    readFileSync(new URL("../../../scripts/libros/si-dios-jugara-futbol.json", import.meta.url), "utf8"),
  )

  it("es válida para las 240 páginas del libro", () => {
    expect(() => validarConfigLibro(config, 240)).not.toThrow()
  })

  it("trae el prólogo, el prefacio, el camerino, los 45 minutos y el cierre", () => {
    const titulos: string[] = config.capitulos.map((c: { titulo: string }) => c.titulo)
    expect(titulos).toHaveLength(49)
    expect(titulos.slice(0, 3)).toEqual(["Prólogo", "Prefacio", "Camerino"])
    expect(titulos.at(-1)).toBe("¡Ponte los guayos!")

    const minutos = titulos.filter((t) => t.startsWith("Minuto "))
    expect(minutos).toHaveLength(45)
    minutos.forEach((titulo, i) => expect(titulo.startsWith(`Minuto ${String(i + 1).padStart(2, "0")} · `)).toBe(true))
  })

  it("ubica los minutos 1, 18, 19 y 45 en sus páginas", () => {
    const pagina = (inicio: string) =>
      config.capitulos.find((c: { titulo: string }) => c.titulo.startsWith(inicio))?.pagina
    expect(pagina("Minuto 01")).toBe(17)
    expect(pagina("Minuto 18")).toBe(99)
    expect(pagina("Minuto 19")).toBe(127)
    expect(pagina("Minuto 45")).toBe(233)
  })

  it("la vista previa cubre las 22 primeras páginas (portadilla, prólogo, camerino y el minuto 1)", () => {
    expect(config.vistaPrevia).toEqual({ desde: 1, hasta: 22 })
  })
})
```

`src/lib/concurrencia.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { ejecutarConConcurrencia } from "./concurrencia"

const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms))

describe("ejecutarConConcurrencia", () => {
  it("procesa todos los elementos", async () => {
    const vistos: number[] = []
    await ejecutarConConcurrencia([1, 2, 3, 4, 5], 2, async (n) => {
      vistos.push(n)
    })
    expect(vistos.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it("nunca corre más tareas a la vez que el límite", async () => {
    let activas = 0
    let maximo = 0
    await ejecutarConConcurrencia(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      activas++
      maximo = Math.max(maximo, activas)
      await pausa(5)
      activas--
    })
    expect(maximo).toBe(3)
  })

  it("propaga el error de una tarea", async () => {
    await expect(
      ejecutarConConcurrencia([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("falló el 2")
      }),
    ).rejects.toThrow("falló el 2")
  })

  it("no hace nada con una lista vacía", async () => {
    await expect(ejecutarConConcurrencia([], 4, async () => {})).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — faltan `leerCajasPdfinfo`, `./config`, `./concurrencia` y el JSON.

- [ ] **Step 4: Implementar recorte, configuración y concurrencia**

Reemplaza `src/lib/libro/recorte.ts` completo:

```ts
/** Caja en puntos PDF (1 pt = 1/72 in), con el origen arriba a la izquierda de la página. */
export type CajaPt = { x: number; y: number; ancho: number; alto: number }

export type CajaPx = { x: number; y: number; ancho: number; alto: number }

export function cajaAPixeles(caja: CajaPt, dpi: number): CajaPx {
  const k = dpi / 72
  return {
    x: Math.round(caja.x * k),
    y: Math.round(caja.y * k),
    ancho: Math.round(caja.ancho * k),
    alto: Math.round(caja.alto * k),
  }
}

/** Caja tal como la informa el PDF: origen abajo a la izquierda. */
export type CajaPdf = { x0: number; y0: number; x1: number; y1: number }
export type CajasPdf = { media: CajaPdf; trim: CajaPdf }

const LINEA_CAJA = /^Page\s+\d+\s+(MediaBox|TrimBox):\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*$/gm

/** Lee las cajas de `pdfinfo -box`. Exige que todas las páginas compartan las mismas cajas. */
export function leerCajasPdfinfo(salida: string): CajasPdf {
  const distintas = { MediaBox: new Set<string>(), TrimBox: new Set<string>() }
  for (const coincidencia of salida.matchAll(LINEA_CAJA)) {
    const numeros = [coincidencia[2], coincidencia[3], coincidencia[4], coincidencia[5]].map(Number)
    distintas[coincidencia[1] as "MediaBox" | "TrimBox"].add(numeros.join(" "))
  }

  if (distintas.MediaBox.size === 0) throw new Error("pdfinfo no devolvió la caja de medios (MediaBox)")
  if (distintas.MediaBox.size > 1 || distintas.TrimBox.size > 1) {
    throw new Error("Las páginas del PDF no comparten las mismas cajas: el recorte automático no es seguro")
  }

  const aCaja = (texto: string): CajaPdf => {
    const [x0, y0, x1, y1] = texto.split(" ").map(Number)
    return { x0, y0, x1, y1 }
  }
  const media = aCaja([...distintas.MediaBox][0])
  const trim = distintas.TrimBox.size === 1 ? aCaja([...distintas.TrimBox][0]) : media
  return { media, trim }
}

export function leerTotalPaginas(salida: string): number {
  const coincidencia = salida.match(/^Pages:\s+(\d+)/m)
  if (!coincidencia) throw new Error("pdfinfo no informó el número de páginas")
  return Number(coincidencia[1])
}

/** Recorte en píxeles a la caja de corte, con `insetPx` de margen hacia adentro para no arrastrar sangrado. */
export function recortePagina(cajas: CajasPdf, dpi: number, insetPx = 1): CajaPx {
  const { media, trim } = cajas
  const px = cajaAPixeles(
    { x: trim.x0, y: media.y1 - trim.y1, ancho: trim.x1 - trim.x0, alto: trim.y1 - trim.y0 },
    dpi,
  )
  return {
    x: px.x + insetPx,
    y: px.y + insetPx,
    ancho: px.ancho - 2 * insetPx,
    alto: px.alto - 2 * insetPx,
  }
}
```

`src/lib/libro/config.ts`:

```ts
export type ConfigLibro = {
  slug: string
  titulo: string
  vistaPrevia: { desde: number; hasta: number }
  capitulos: { pagina: number; titulo: string }[]
}

export function validarConfigLibro(config: unknown, totalPaginas: number): ConfigLibro {
  const errores: string[] = []
  const c = (config && typeof config === "object" ? config : {}) as Record<string, unknown>

  if (typeof c.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug)) {
    errores.push("slug inválido (solo minúsculas, números y guiones)")
  }
  if (typeof c.titulo !== "string" || c.titulo.trim() === "") errores.push("falta el título")

  const vista = c.vistaPrevia as { desde?: unknown; hasta?: unknown } | undefined
  const hasta = vista?.hasta
  if (!vista || vista.desde !== 1 || !Number.isInteger(hasta) || (hasta as number) < 1 || (hasta as number) > totalPaginas) {
    errores.push(`vistaPrevia debe empezar en 1 y terminar entre 1 y ${totalPaginas}`)
  }

  const capitulos = Array.isArray(c.capitulos) ? c.capitulos : []
  if (capitulos.length === 0) errores.push("faltan los capítulos")
  let anterior = 0
  capitulos.forEach((capitulo, indice) => {
    const { pagina, titulo } = (capitulo ?? {}) as Record<string, unknown>
    const n = indice + 1
    if (!Number.isInteger(pagina) || (pagina as number) < 1 || (pagina as number) > totalPaginas) {
      errores.push(`capítulo ${n}: página fuera de 1..${totalPaginas}`)
    } else if ((pagina as number) <= anterior) {
      errores.push(`capítulo ${n}: las páginas deben ir en orden creciente`)
    } else {
      anterior = pagina as number
    }
    if (typeof titulo !== "string" || titulo.trim() === "") errores.push(`capítulo ${n}: falta el título`)
  })

  if (errores.length > 0) throw new Error(`Configuración del libro inválida:\n- ${errores.join("\n- ")}`)
  return c as unknown as ConfigLibro
}
```

`src/lib/concurrencia.ts`:

```ts
/** Recorre `items` con como máximo `limite` tareas a la vez. Si una falla, la promesa se rechaza. */
export async function ejecutarConConcurrencia<T>(
  items: T[],
  limite: number,
  tarea: (item: T, indice: number) => Promise<void>,
): Promise<void> {
  let siguiente = 0
  async function trabajador(): Promise<void> {
    while (true) {
      const indice = siguiente++
      if (indice >= items.length) return
      await tarea(items[indice], indice)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador))
}
```

`scripts/libros/si-dios-jugara-futbol.json` (páginas y títulos tomados del propio PDF; el índice del libro no existe, así que salen de los encabezados de cada minuto):

```json
{
  "slug": "si-dios-jugara-futbol",
  "titulo": "Si Dios jugara fútbol",
  "vistaPrevia": { "desde": 1, "hasta": 22 },
  "capitulos": [
    { "pagina": 7, "titulo": "Prólogo" },
    { "pagina": 9, "titulo": "Prefacio" },
    { "pagina": 11, "titulo": "Camerino" },
    { "pagina": 17, "titulo": "Minuto 01 · El ángel azul" },
    { "pagina": 23, "titulo": "Minuto 02 · ¡Ganar!" },
    { "pagina": 29, "titulo": "Minuto 03 · Cuando nace un sueño" },
    { "pagina": 33, "titulo": "Minuto 04 · “Te llamamos”" },
    { "pagina": 39, "titulo": "Minuto 05 · El Paraíso" },
    { "pagina": 45, "titulo": "Minuto 06 · Soltar" },
    { "pagina": 49, "titulo": "Minuto 07 · Tu voz" },
    { "pagina": 55, "titulo": "Minuto 08 · Ropa de Lili" },
    { "pagina": 59, "titulo": "Minuto 09 · Fácil" },
    { "pagina": 63, "titulo": "Minuto 10 · La A." },
    { "pagina": 67, "titulo": "Minuto 11 · El canoso y el gringo" },
    { "pagina": 73, "titulo": "Minuto 12 · Verde" },
    { "pagina": 77, "titulo": "Minuto 13 · Explosión" },
    { "pagina": 81, "titulo": "Minuto 14 · Claroscuro" },
    { "pagina": 85, "titulo": "Minuto 15 · ¿Quién eres?" },
    { "pagina": 89, "titulo": "Minuto 16 · Una mano extendida" },
    { "pagina": 93, "titulo": "Minuto 17 · A ti también" },
    { "pagina": 99, "titulo": "Minuto 18 · Luz" },
    { "pagina": 127, "titulo": "Minuto 19 · Una oración peligrosa" },
    { "pagina": 131, "titulo": "Minuto 20 · Volver" },
    { "pagina": 135, "titulo": "Minuto 21 · Ganar" },
    { "pagina": 139, "titulo": "Minuto 22 · Lo incierto" },
    { "pagina": 143, "titulo": "Minuto 23 · Infeliz" },
    { "pagina": 147, "titulo": "Minuto 24 · ¿Dios es bueno?" },
    { "pagina": 149, "titulo": "Minuto 25 · No más" },
    { "pagina": 153, "titulo": "Minuto 26 · 3 meses" },
    { "pagina": 157, "titulo": "Minuto 27 · Cama y media" },
    { "pagina": 161, "titulo": "Minuto 28 · Orgullo" },
    { "pagina": 165, "titulo": "Minuto 29 · Glorias pasadas" },
    { "pagina": 169, "titulo": "Minuto 30 · El abrazo del Padre" },
    { "pagina": 173, "titulo": "Minuto 31 · Llamado" },
    { "pagina": 177, "titulo": "Minuto 32 · Destino" },
    { "pagina": 181, "titulo": "Minuto 33 · Al lado" },
    { "pagina": 185, "titulo": "Minuto 34 · Relevo" },
    { "pagina": 189, "titulo": "Minuto 35 · Pandemia" },
    { "pagina": 193, "titulo": "Minuto 36 · Firme" },
    { "pagina": 197, "titulo": "Minuto 37 · Rusia" },
    { "pagina": 201, "titulo": "Minuto 38 · Cien" },
    { "pagina": 205, "titulo": "Minuto 39 · Valentina" },
    { "pagina": 211, "titulo": "Minuto 40 · Una pregunta" },
    { "pagina": 215, "titulo": "Minuto 41 · Relaciones" },
    { "pagina": 221, "titulo": "Minuto 42 · Lo nuevo" },
    { "pagina": 225, "titulo": "Minuto 43 · Tu parte" },
    { "pagina": 229, "titulo": "Minuto 44 · Cuando tu nombre no está escrito" },
    { "pagina": 233, "titulo": "Minuto 45 · Estadio" },
    { "pagina": 236, "titulo": "¡Ponte los guayos!" }
  ]
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Render, subida y guardado**

`src/lib/libro/render.ts`:

```ts
import { execFile } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import sharp from "sharp"
import { leerCajasPdfinfo, leerTotalPaginas, type CajaPx, type CajasPdf } from "./recorte"

const ejecutar = promisify(execFile)

/** Número de páginas y cajas del PDF (requiere poppler: `brew install poppler`). */
export async function leerInfoPdf(pdf: string): Promise<{ total: number; cajas: CajasPdf }> {
  const { stdout: resumen } = await ejecutar("pdfinfo", [pdf])
  const total = leerTotalPaginas(resumen)
  const { stdout: cajas } = await ejecutar("pdfinfo", ["-box", "-f", "1", "-l", String(total), pdf], {
    maxBuffer: 16 * 1024 * 1024,
  })
  return { total, cajas: leerCajasPdfinfo(cajas) }
}

/** Renderiza una página recortada a `recorte` y la devuelve como WebP. */
export async function renderizarPagina(
  pdf: string,
  numero: number,
  recorte: CajaPx,
  dpi: number,
  calidad = 82,
): Promise<Buffer> {
  const carpeta = await mkdtemp(path.join(tmpdir(), "pagina-"))
  try {
    const base = path.join(carpeta, "p")
    await ejecutar("pdftoppm", [
      "-f", String(numero),
      "-l", String(numero),
      "-r", String(dpi),
      "-x", String(recorte.x),
      "-y", String(recorte.y),
      "-W", String(recorte.ancho),
      "-H", String(recorte.alto),
      "-png",
      "-singlefile",
      pdf,
      base,
    ])
    return await sharp(await readFile(`${base}.png`)).webp({ quality: calidad }).toBuffer()
  } finally {
    await rm(carpeta, { recursive: true, force: true })
  }
}
```

`src/lib/libro/subir.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { ConfigLibro } from "./config"

export const BUCKET_PAGINAS = "book-pages"

export function rutaPagina(slug: string, numero: number): string {
  return `${slug}/${numero}.webp`
}

export async function subirPagina(admin: SupabaseClient, slug: string, numero: number, webp: Buffer): Promise<void> {
  const { error } = await admin.storage
    .from(BUCKET_PAGINAS)
    .upload(rutaPagina(slug, numero), webp, { contentType: "image/webp", upsert: true })
  if (error) throw new Error(`No se pudo subir la página ${numero}: ${error.message}`)
}

/** Crea o actualiza el libro, sus filas de páginas (con la vista previa marcada) y sus capítulos. Devuelve el book_id. */
export async function guardarLibro(admin: SupabaseClient, config: ConfigLibro, total: number): Promise<string> {
  const { data, error } = await admin
    .from("books")
    .upsert({ slug: config.slug, titulo: config.titulo, total_paginas: total }, { onConflict: "slug" })
    .select("id")
    .single()
  if (error) throw new Error(error.message)
  const bookId = data.id as string

  const filas = Array.from({ length: total }, (_, i) => ({
    book_id: bookId,
    numero: i + 1,
    es_vista_previa: i + 1 >= config.vistaPrevia.desde && i + 1 <= config.vistaPrevia.hasta,
  }))
  for (let i = 0; i < filas.length; i += 100) {
    const { error: errorPaginas } = await admin
      .from("book_pages")
      .upsert(filas.slice(i, i + 100), { onConflict: "book_id,numero" })
    if (errorPaginas) throw new Error(errorPaginas.message)
  }

  const { error: errorBorrar } = await admin.from("book_chapters").delete().eq("book_id", bookId)
  if (errorBorrar) throw new Error(errorBorrar.message)
  const { error: errorCapitulos } = await admin.from("book_chapters").insert(
    config.capitulos.map((capitulo, i) => ({
      book_id: bookId,
      orden: i + 1,
      numero_pagina: capitulo.pagina,
      titulo: capitulo.titulo,
    })),
  )
  if (errorCapitulos) throw new Error(errorCapitulos.message)

  return bookId
}
```

`src/lib/libro/subir.integration.test.ts`:

```ts
import { randomUUID } from "node:crypto"
import { afterAll, describe, expect, it } from "vitest"
import { clienteAdminPrueba, hayEntorno, limpiarPrueba } from "@/test/integracion"
import type { ConfigLibro } from "./config"
import { BUCKET_PAGINAS, guardarLibro, rutaPagina, subirPagina } from "./subir"

describe.skipIf(!hayEntorno)("guardar y subir un libro (Supabase local)", () => {
  const admin = clienteAdminPrueba()
  const slug = `prueba-${randomUUID().slice(0, 8)}`
  const config: ConfigLibro = {
    slug,
    titulo: "Libro de prueba",
    vistaPrevia: { desde: 1, hasta: 2 },
    capitulos: [
      { pagina: 1, titulo: "Uno" },
      { pagina: 4, titulo: "Dos" },
    ],
  }
  let bookId = ""

  afterAll(async () => {
    await limpiarPrueba(admin, { bookIds: bookId ? [bookId] : [], archivos: [rutaPagina(slug, 1)] })
  })

  it("guarda el libro con sus páginas, la vista previa y los capítulos, y es idempotente", async () => {
    bookId = await guardarLibro(admin, config, 5)
    expect(await guardarLibro(admin, config, 5)).toBe(bookId)

    const { data: paginas } = await admin.from("book_pages").select("numero, es_vista_previa").eq("book_id", bookId).order("numero")
    expect(paginas).toHaveLength(5)
    expect(paginas?.filter((p) => p.es_vista_previa).map((p) => p.numero)).toEqual([1, 2])

    const { data: capitulos } = await admin.from("book_chapters").select("orden, numero_pagina, titulo").eq("book_id", bookId).order("orden")
    expect(capitulos).toEqual([
      { orden: 1, numero_pagina: 1, titulo: "Uno" },
      { orden: 2, numero_pagina: 4, titulo: "Dos" },
    ])
  })

  it("sube una página al bucket privado y se puede volver a descargar con la clave secreta", async () => {
    const contenido = Buffer.from("contenido-de-prueba")
    await subirPagina(admin, slug, 1, contenido)
    const { data, error } = await admin.storage.from(BUCKET_PAGINAS).download(rutaPagina(slug, 1))
    expect(error).toBeNull()
    expect(Buffer.from(await (data as Blob).arrayBuffer()).equals(contenido)).toBe(true)
  })
})
```

- [ ] **Step 7: Script de línea de comandos**

`scripts/procesar-libro.ts`:

```ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { cargarEnvLocal } from "../src/lib/cargar-env"
import { ejecutarConConcurrencia } from "../src/lib/concurrencia"
import { validarConfigLibro } from "../src/lib/libro/config"
import { recortePagina } from "../src/lib/libro/recorte"
import { leerInfoPdf, renderizarPagina } from "../src/lib/libro/render"
import { guardarLibro, subirPagina } from "../src/lib/libro/subir"
import { crearClienteAdmin } from "../src/lib/supabase/admin-cliente"

const DPI = 200
const CONCURRENCIA = 4

function leerArgumentos(argv: string[]) {
  const posicionales = argv.filter((a) => !a.startsWith("--"))
  const solo = argv.find((a) => a.startsWith("--solo="))?.slice("--solo=".length)
  return {
    pdf: posicionales[0],
    configuracion: posicionales[1],
    solo: solo ? solo.split(",").map(Number) : null,
    guardarLocal: argv.includes("--guardar-local"),
  }
}

async function main() {
  cargarEnvLocal()
  const { pdf, configuracion, solo, guardarLocal } = leerArgumentos(process.argv.slice(2))
  if (!pdf || !configuracion) {
    console.error('Uso: npm run libro:procesar -- "/ruta/libro.pdf" scripts/libros/mi-libro.json [--solo=17,18] [--guardar-local]')
    process.exit(1)
  }

  const { total, cajas } = await leerInfoPdf(pdf)
  const config = validarConfigLibro(JSON.parse(readFileSync(configuracion, "utf8")), total)
  const recorte = recortePagina(cajas, DPI)
  console.log(`PDF: ${total} páginas. Recorte a la caja de corte: ${recorte.ancho} × ${recorte.alto} px a ${DPI} dpi.`)

  const paginas = solo ?? Array.from({ length: total }, (_, i) => i + 1)
  if (paginas.some((n) => !Number.isInteger(n) || n < 1 || n > total)) {
    console.error(`--solo debe listar páginas entre 1 y ${total}`)
    process.exit(1)
  }

  const admin = crearClienteAdmin()
  await guardarLibro(admin, config, total)

  const carpetaLocal = path.join("out", "paginas", config.slug)
  if (guardarLocal) mkdirSync(carpetaLocal, { recursive: true })

  let hechas = 0
  await ejecutarConConcurrencia(paginas, CONCURRENCIA, async (numero) => {
    const webp = await renderizarPagina(pdf, numero, recorte, DPI)
    if (guardarLocal) writeFileSync(path.join(carpetaLocal, `${numero}.webp`), webp)
    await subirPagina(admin, config.slug, numero, webp)
    hechas++
    if (hechas % 20 === 0 || hechas === paginas.length) console.log(`  ${hechas}/${paginas.length} páginas subidas`)
  })

  console.log(`Listo: "${config.titulo}" (${config.slug}) con ${paginas.length} páginas procesadas.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
```

```bash
npm pkg set scripts.libro:procesar="tsx scripts/procesar-libro.ts"
```

- [ ] **Step 8: Pruebas de integración y tipos**

Run: `npm run test:integracion && npm run typecheck && npm run lint`
Expected: PASS y sin errores.

- [ ] **Step 9: Procesar el libro real**

Requiere `supabase start` corriendo, `.env.local` y poppler (`pdftoppm --version`; si falta, `brew install poppler`).

Primero una prueba con 3 páginas:

```bash
npm run libro:procesar -- "/Users/jheitrujillo/Desktop/Pastor Juangui/Si Dios jugara futbol.pdf" scripts/libros/si-dios-jugara-futbol.json --solo=1,17,110 --guardar-local
```

Expected: `PDF: 240 páginas. Recorte a la caja de corte: 1179 × 1888 px a 200 dpi.` y `Listo: "Si Dios jugara fútbol" (si-dios-jugara-futbol) con 3 páginas procesadas.`

Revisa las 3 imágenes: convierte a PNG y ábrelas con la herramienta de imágenes.

```bash
mkdir -p /tmp/rev && for n in 1 17 110; do node -e "require('sharp')('out/paginas/si-dios-jugara-futbol/$n.webp').png().toFile('/tmp/rev/p$n.png')"; done; ls -la /tmp/rev
```

Expected en cada una: sin marcas de imprenta en las esquinas, sin franja del sangrado, texto legible; la 110 es una página de fotos. Si ves marcas o un borde, sube `insetPx` en `recortePagina` a 2 y repite.

Ahora el libro completo (unos 1 a 3 minutos):

```bash
npm run libro:procesar -- "/Users/jheitrujillo/Desktop/Pastor Juangui/Si Dios jugara futbol.pdf" scripts/libros/si-dios-jugara-futbol.json --guardar-local
```

Expected: avanza hasta `240/240 páginas subidas`.

- [ ] **Step 10: Verificar lo que quedó en la base y en el almacenamiento**

Run: `supabase db query --help | head -15` para ver el formato, y luego:

```bash
supabase db query "select (select count(*) from public.book_pages) as paginas, (select count(*) from public.book_pages where es_vista_previa) as vista_previa, (select count(*) from public.book_chapters) as capitulos, (select count(*) from storage.objects where bucket_id = 'book-pages') as imagenes"
ls out/paginas/si-dios-jugara-futbol | wc -l
du -sh out/paginas/si-dios-jugara-futbol
```

Expected: `paginas = 240`, `vista_previa = 22`, `capitulos = 49`, `imagenes = 240` (no cuentes las de la prueba de integración: esa borra las suyas), 240 archivos y un tamaño en decenas de MB. Anota el tamaño: sirve para saber cuánto ocupará en producción (el plan gratis de Supabase incluye 1 GB).

Borra la copia local del libro, que es contenido protegido y ya no hace falta:

```bash
rm -rf out/paginas /tmp/rev
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: procesamiento del libro a páginas WebP recortadas y carga a Supabase" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Marca de agua y rutas que sirven las páginas

**Files:**
- Create: `src/lib/lectura/marca-de-agua.tsx`, `src/lib/lectura/servir-pagina.ts`, `src/lib/lectura/vista-previa.ts`, `src/lib/lectura/responder.ts`, `src/lib/lectura/datos.ts`, `src/lib/lectura/adaptadores.ts`, `src/app/api/paginas/[slug]/[n]/route.ts`, `src/app/api/vista-previa/[slug]/[n]/route.ts`
- Test: `src/lib/lectura/marca-de-agua.test.ts`, `src/lib/lectura/servir-pagina.test.ts`, `src/lib/lectura/vista-previa.test.ts`, `src/lib/lectura/responder.test.ts`, `src/lib/lectura/paginas.integration.test.ts`

**Interfaces:**
- Consumes: `emailActual`, `consumirCupo`, `crearClienteServidor`, `crearClienteAdmin`, `rutaPagina`/`BUCKET_PAGINAS` (Tarea 7), ayudantes de integración.
- Produces:
  - `textoMarca(email): string`, `crearMosaico(email): Promise<Buffer>`, `estamparMarcaDeAgua(imagen: Buffer, email: string): Promise<Buffer>` (WebP)
  - `type PuertosPagina`, `type RespuestaPagina = { status: 200; imagen: Buffer } | { status: 400 | 401 | 403 | 404 | 429 }`, `LIMITE_PAGINAS = { ventanaSeg: 60, maximo: 30 }`, `parsearNumeroPagina(texto): number | null`, `servirPagina(slug, numeroTexto, puertos): Promise<RespuestaPagina>`
  - `nombreCookieVistaPrevia(slug): string` (`"vp_<slug>"`), `type PuertosVistaPrevia`, `servirVistaPrevia(slug, numeroTexto, tieneCookie: boolean, puertos): Promise<RespuestaPagina>`
  - `responderPagina(resultado: RespuestaPagina, opciones: { cache: string }): Response`
  - `resolverLibro(cliente, slug): Promise<{ id: string; total: number } | null>`, `tieneAcceso(usuario, bookId): Promise<boolean>`, `leerImagen(admin, slug, numero): Promise<Buffer | null>`, `esPaginaVistaPrevia(admin, bookId, numero): Promise<boolean>`
  - `puertosPaginaReales(usuario, admin, limite?)`, `puertosVistaPreviaReales(admin)`
  - `GET /api/paginas/[slug]/[n]` (libro completo, con marca de agua) y `GET /api/vista-previa/[slug]/[n]` (sin marca de agua, exige la cookie)

- [ ] **Step 1: Escribir los tests unitarios que fallan**

`src/lib/lectura/marca-de-agua.test.ts` (usa `next/og`, que necesita el entorno de Node):

```ts
// @vitest-environment node
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { estamparMarcaDeAgua, textoMarca } from "./marca-de-agua"

async function paginaBlanca() {
  return sharp({ create: { width: 600, height: 960, channels: 3, background: "#ffffff" } }).webp().toBuffer()
}

describe("textoMarca", () => {
  it("deja igual un email corto", () => {
    expect(textoMarca("ana@ejemplo.com")).toBe("ana@ejemplo.com")
  })

  it("recorta un email largo a 42 caracteres con puntos suspensivos", () => {
    const largo = `${"a".repeat(60)}@ejemplo.com`
    const texto = textoMarca(largo)
    expect(texto).toHaveLength(42)
    expect(texto.endsWith("…")).toBe(true)
  })
})

describe("estamparMarcaDeAgua", () => {
  it("mantiene el tamaño y deja marcas visibles sobre una página blanca", async () => {
    const original = await paginaBlanca()
    const estampada = await estamparMarcaDeAgua(original, "ana@ejemplo.com")

    const meta = await sharp(estampada).metadata()
    expect([meta.width, meta.height]).toEqual([600, 960])
    expect(meta.format).toBe("webp")
    expect(estampada.equals(original)).toBe(false)

    const { channels } = await sharp(estampada).stats()
    expect(Math.min(...channels.map((c) => c.min))).toBeLessThan(250)
  })

  it("es sutil: la página sigue siendo casi toda blanca", async () => {
    const estampada = await estamparMarcaDeAgua(await paginaBlanca(), "ana@ejemplo.com")
    const { channels } = await sharp(estampada).stats()
    expect(Math.min(...channels.map((c) => c.mean))).toBeGreaterThan(240)
  })

  it("cada email produce una marca distinta", async () => {
    const original = await paginaBlanca()
    const a = await estamparMarcaDeAgua(original, "ana@ejemplo.com")
    const b = await estamparMarcaDeAgua(original, "beto@ejemplo.com")
    expect(a.equals(b)).toBe(false)
  })
})
```

`src/lib/lectura/servir-pagina.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { LIMITE_PAGINAS, parsearNumeroPagina, servirPagina, type PuertosPagina } from "./servir-pagina"

const IMAGEN = Buffer.from("imagen-original")
const ESTAMPADA = Buffer.from("imagen-estampada")

function armarPuertos(cambios: Partial<PuertosPagina> = {}): PuertosPagina {
  return {
    obtenerEmail: vi.fn(async () => "ana@ejemplo.com"),
    resolverLibro: vi.fn(async () => ({ id: "libro-1", total: 10 })),
    tieneAcceso: vi.fn(async () => true),
    consumirCupo: vi.fn(async () => true),
    leerImagen: vi.fn(async () => IMAGEN),
    estampar: vi.fn(async () => ESTAMPADA),
    ...cambios,
  }
}

describe("parsearNumeroPagina", () => {
  it.each([
    ["1", 1],
    ["240", 240],
    ["9999", 9999],
  ])("acepta %s", (texto, esperado) => {
    expect(parsearNumeroPagina(texto)).toBe(esperado)
  })

  it.each(["0", "-1", "01", "1.5", "abc", "", "12345", " 3"])("rechaza %j", (texto) => {
    expect(parsearNumeroPagina(texto)).toBeNull()
  })
})

describe("servirPagina", () => {
  it("devuelve la imagen estampada con el email del lector", async () => {
    const puertos = armarPuertos()
    const resultado = await servirPagina("libro", "3", puertos)
    expect(resultado).toEqual({ status: 200, imagen: ESTAMPADA })
    expect(puertos.leerImagen).toHaveBeenCalledWith("libro", 3)
    expect(puertos.estampar).toHaveBeenCalledWith(IMAGEN, "ana@ejemplo.com")
  })

  it("400 si el número de página no es válido", async () => {
    const puertos = armarPuertos()
    expect(await servirPagina("libro", "abc", puertos)).toEqual({ status: 400 })
    expect(puertos.obtenerEmail).not.toHaveBeenCalled()
  })

  it("401 sin sesión, sin siquiera revelar si el libro existe", async () => {
    const puertos = armarPuertos({ obtenerEmail: vi.fn(async () => null) })
    expect(await servirPagina("libro", "1", puertos)).toEqual({ status: 401 })
    expect(puertos.resolverLibro).not.toHaveBeenCalled()
  })

  it("404 si el libro no existe o la página pasa del total", async () => {
    expect(await servirPagina("x", "1", armarPuertos({ resolverLibro: vi.fn(async () => null) }))).toEqual({ status: 404 })
    expect(await servirPagina("libro", "11", armarPuertos())).toEqual({ status: 404 })
  })

  it("403 sin acceso, y no gasta cupo ni lee la imagen", async () => {
    const puertos = armarPuertos({ tieneAcceso: vi.fn(async () => false) })
    expect(await servirPagina("libro", "1", puertos)).toEqual({ status: 403 })
    expect(puertos.consumirCupo).not.toHaveBeenCalled()
    expect(puertos.leerImagen).not.toHaveBeenCalled()
  })

  it("429 si se pidieron demasiadas páginas, y no lee la imagen", async () => {
    const puertos = armarPuertos({ consumirCupo: vi.fn(async () => false) })
    expect(await servirPagina("libro", "1", puertos)).toEqual({ status: 429 })
    expect(puertos.consumirCupo).toHaveBeenCalledWith("ana@ejemplo.com")
    expect(puertos.leerImagen).not.toHaveBeenCalled()
  })

  it("404 si la imagen no está en el almacenamiento", async () => {
    expect(await servirPagina("libro", "1", armarPuertos({ leerImagen: vi.fn(async () => null) }))).toEqual({ status: 404 })
  })

  it("el límite por defecto es de 30 páginas por minuto", () => {
    expect(LIMITE_PAGINAS).toEqual({ ventanaSeg: 60, maximo: 30 })
  })
})
```

`src/lib/lectura/vista-previa.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { nombreCookieVistaPrevia, servirVistaPrevia, type PuertosVistaPrevia } from "./vista-previa"

const IMAGEN = Buffer.from("imagen-original")

function armarPuertos(cambios: Partial<PuertosVistaPrevia> = {}): PuertosVistaPrevia {
  return {
    resolverLibro: vi.fn(async () => ({ id: "libro-1", total: 10 })),
    esPaginaVistaPrevia: vi.fn(async () => true),
    leerImagen: vi.fn(async () => IMAGEN),
    ...cambios,
  }
}

describe("nombreCookieVistaPrevia", () => {
  it("lleva el slug del libro", () => {
    expect(nombreCookieVistaPrevia("mi-libro")).toBe("vp_mi-libro")
  })
})

describe("servirVistaPrevia", () => {
  it("devuelve la página sin marca de agua cuando hay cookie y la página es de vista previa", async () => {
    expect(await servirVistaPrevia("libro", "2", true, armarPuertos())).toEqual({ status: 200, imagen: IMAGEN })
  })

  it("400 con un número inválido", async () => {
    expect(await servirVistaPrevia("libro", "x", true, armarPuertos())).toEqual({ status: 400 })
  })

  it("401 sin la cookie de la vista previa", async () => {
    const puertos = armarPuertos()
    expect(await servirVistaPrevia("libro", "2", false, puertos)).toEqual({ status: 401 })
    expect(puertos.resolverLibro).not.toHaveBeenCalled()
  })

  it("404 si el libro no existe o la página pasa del total", async () => {
    expect(await servirVistaPrevia("x", "2", true, armarPuertos({ resolverLibro: vi.fn(async () => null) }))).toEqual({ status: 404 })
    expect(await servirVistaPrevia("libro", "11", true, armarPuertos())).toEqual({ status: 404 })
  })

  it("403 si la página no es de la vista previa, y no lee la imagen", async () => {
    const puertos = armarPuertos({ esPaginaVistaPrevia: vi.fn(async () => false) })
    expect(await servirVistaPrevia("libro", "30", true, puertos)).toEqual({ status: 403 })
    expect(puertos.leerImagen).not.toHaveBeenCalled()
  })

  it("404 si la imagen no está en el almacenamiento", async () => {
    expect(await servirVistaPrevia("libro", "2", true, armarPuertos({ leerImagen: vi.fn(async () => null) }))).toEqual({ status: 404 })
  })
})
```

`src/lib/lectura/responder.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest"
import { responderPagina } from "./responder"

describe("responderPagina", () => {
  it("una página va como WebP privado con la caché indicada", async () => {
    const respuesta = responderPagina({ status: 200, imagen: Buffer.from("abc") }, { cache: "private, max-age=300" })
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get("content-type")).toBe("image/webp")
    expect(respuesta.headers.get("cache-control")).toBe("private, max-age=300")
    expect(respuesta.headers.get("x-content-type-options")).toBe("nosniff")
    expect(Buffer.from(await respuesta.arrayBuffer()).toString()).toBe("abc")
  })

  it.each([400, 401, 403, 404, 429] as const)("un %i va sin cuerpo y sin caché", async (status) => {
    const respuesta = responderPagina({ status }, { cache: "private, max-age=300" })
    expect(respuesta.status).toBe(status)
    expect(respuesta.headers.get("cache-control")).toBe("no-store")
    expect(await respuesta.text()).toBe("")
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven los módulos de `lectura`.

- [ ] **Step 3: Implementar la marca de agua**

`src/lib/lectura/marca-de-agua.tsx`:

```tsx
import { ImageResponse } from "next/og"
import sharp from "sharp"

// El texto se dibuja con next/og (trae su propia fuente) y no con el SVG de sharp, que depende de las fuentes
// del sistema y en un servidor Linux sin fuentes mostraría cuadritos.
const ANCHO_MOSAICO = 720
const ALTO_MOSAICO = 400
const MAXIMO_CARACTERES = 42
const OPACIDAD = 0.13
const MAXIMO_EN_MEMORIA = 200

const memoria = new Map<string, Buffer>()

export function textoMarca(email: string): string {
  return email.length > MAXIMO_CARACTERES ? `${email.slice(0, MAXIMO_CARACTERES - 1)}…` : email
}

/** PNG transparente con el email en diagonal, listo para repetirse sobre la página. */
export async function crearMosaico(email: string): Promise<Buffer> {
  const texto = textoMarca(email)
  const guardado = memoria.get(texto)
  if (guardado) return guardado

  const respuesta = new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 32, color: `rgba(29,26,22,${OPACIDAD})`, transform: "rotate(-28deg)" }}>{texto}</div>
      </div>
    ),
    { width: ANCHO_MOSAICO, height: ALTO_MOSAICO },
  )
  const mosaico = Buffer.from(await respuesta.arrayBuffer())

  if (memoria.size >= MAXIMO_EN_MEMORIA) memoria.delete(memoria.keys().next().value as string)
  memoria.set(texto, mosaico)
  return mosaico
}

/** Repite el email del lector, en diagonal y muy tenue, sobre toda la página. Devuelve WebP. */
export async function estamparMarcaDeAgua(imagen: Buffer, email: string): Promise<Buffer> {
  const mosaico = await crearMosaico(email)
  return sharp(imagen).composite([{ input: mosaico, tile: true }]).webp({ quality: 80 }).toBuffer()
}
```

- [ ] **Step 4: Implementar la lógica de servir páginas y las respuestas**

`src/lib/lectura/servir-pagina.ts`:

```ts
export type PuertosPagina = {
  obtenerEmail: () => Promise<string | null>
  resolverLibro: (slug: string) => Promise<{ id: string; total: number } | null>
  tieneAcceso: (bookId: string) => Promise<boolean>
  consumirCupo: (email: string) => Promise<boolean>
  leerImagen: (slug: string, numero: number) => Promise<Buffer | null>
  estampar: (imagen: Buffer, email: string) => Promise<Buffer>
}

export type RespuestaPagina = { status: 200; imagen: Buffer } | { status: 400 | 401 | 403 | 404 | 429 }

/** Más de 30 páginas por minuto por lector devuelven 429. */
export const LIMITE_PAGINAS = { ventanaSeg: 60, maximo: 30 } as const

export function parsearNumeroPagina(texto: string): number | null {
  return /^[1-9]\d{0,3}$/.test(texto) ? Number(texto) : null
}

/** Sirve una página del libro completo, estampada con el email del lector. */
export async function servirPagina(slug: string, numeroTexto: string, puertos: PuertosPagina): Promise<RespuestaPagina> {
  const numero = parsearNumeroPagina(numeroTexto)
  if (numero === null) return { status: 400 }

  const email = await puertos.obtenerEmail()
  if (!email) return { status: 401 }

  const libro = await puertos.resolverLibro(slug)
  if (!libro || numero > libro.total) return { status: 404 }
  if (!(await puertos.tieneAcceso(libro.id))) return { status: 403 }
  if (!(await puertos.consumirCupo(email))) return { status: 429 }

  const imagen = await puertos.leerImagen(slug, numero)
  if (!imagen) return { status: 404 }
  return { status: 200, imagen: await puertos.estampar(imagen, email) }
}
```

`src/lib/lectura/vista-previa.ts`:

```ts
import { parsearNumeroPagina, type RespuestaPagina } from "./servir-pagina"

export function nombreCookieVistaPrevia(slug: string): string {
  return `vp_${slug}`
}

export type PuertosVistaPrevia = {
  resolverLibro: (slug: string) => Promise<{ id: string; total: number } | null>
  esPaginaVistaPrevia: (bookId: string, numero: number) => Promise<boolean>
  leerImagen: (slug: string, numero: number) => Promise<Buffer | null>
}

/**
 * Sirve una página gratuita, sin marca de agua. La cookie solo prueba que el lector dejó su email:
 * es una compuerta de captación, no de seguridad (son páginas gratuitas).
 */
export async function servirVistaPrevia(
  slug: string,
  numeroTexto: string,
  tieneCookie: boolean,
  puertos: PuertosVistaPrevia,
): Promise<RespuestaPagina> {
  const numero = parsearNumeroPagina(numeroTexto)
  if (numero === null) return { status: 400 }
  if (!tieneCookie) return { status: 401 }

  const libro = await puertos.resolverLibro(slug)
  if (!libro || numero > libro.total) return { status: 404 }
  if (!(await puertos.esPaginaVistaPrevia(libro.id, numero))) return { status: 403 }

  const imagen = await puertos.leerImagen(slug, numero)
  return imagen ? { status: 200, imagen } : { status: 404 }
}
```

`src/lib/lectura/responder.ts`:

```ts
import type { RespuestaPagina } from "./servir-pagina"

/** Convierte el resultado en una Response: la imagen va privada y cualquier error va sin caché. */
export function responderPagina(resultado: RespuestaPagina, opciones: { cache: string }): Response {
  if (resultado.status === 200) {
    return new Response(new Uint8Array(resultado.imagen), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": opciones.cache,
        "X-Content-Type-Options": "nosniff",
        Vary: "Cookie",
      },
    })
  }
  return new Response(null, { status: resultado.status, headers: { "Cache-Control": "no-store" } })
}
```

- [ ] **Step 5: Ejecutar los tests unitarios**

Run: `npm test`
Expected: PASS. Si `next/og` falla en Vitest al cargar `marca-de-agua.test.ts`, confirma que el archivo empieza con `// @vitest-environment node`; si sigue fallando, imprime el error completo y arréglalo antes de continuar (esta marca de agua es la pieza que protege el libro).

- [ ] **Step 6: Adaptadores reales y rutas**

Antes de escribir las rutas, lee `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (los `params` de un Route Handler son una promesa).

`src/lib/lectura/datos.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js"
import { BUCKET_PAGINAS, rutaPagina } from "@/lib/libro/subir"

/** Busca el libro por slug. Con el cliente del usuario respeta RLS (los usuarios autenticados ven el catálogo). */
export async function resolverLibro(
  cliente: SupabaseClient,
  slug: string,
): Promise<{ id: string; total: number } | null> {
  const { data, error } = await cliente.from("books").select("id, total_paginas").eq("slug", slug).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? { id: data.id as string, total: data.total_paginas as number } : null
}

/** ¿El usuario de la sesión tiene acceso activo a este libro? (RLS limita la consulta a sus propias filas). */
export async function tieneAcceso(usuario: SupabaseClient, bookId: string): Promise<boolean> {
  const { data, error } = await usuario
    .from("entitlements")
    .select("id")
    .eq("book_id", bookId)
    .eq("activo", true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data !== null
}

export async function esPaginaVistaPrevia(admin: SupabaseClient, bookId: string, numero: number): Promise<boolean> {
  const { data, error } = await admin
    .from("book_pages")
    .select("es_vista_previa")
    .eq("book_id", bookId)
    .eq("numero", numero)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data?.es_vista_previa === true
}

/** Lee la imagen del bucket privado. Solo el servidor (clave secreta) puede hacerlo. */
export async function leerImagen(admin: SupabaseClient, slug: string, numero: number): Promise<Buffer | null> {
  const { data, error } = await admin.storage.from(BUCKET_PAGINAS).download(rutaPagina(slug, numero))
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}
```

`src/lib/lectura/adaptadores.ts`:

```ts
import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import { consumirCupo } from "@/lib/limites"
import { emailActual } from "@/lib/supabase/usuario"
import { esPaginaVistaPrevia, leerImagen, resolverLibro, tieneAcceso } from "./datos"
import { estamparMarcaDeAgua } from "./marca-de-agua"
import { LIMITE_PAGINAS, type PuertosPagina } from "./servir-pagina"
import type { PuertosVistaPrevia } from "./vista-previa"

export function puertosPaginaReales(
  usuario: SupabaseClient,
  admin: SupabaseClient,
  limite: { ventanaSeg: number; maximo: number } = LIMITE_PAGINAS,
): PuertosPagina {
  return {
    obtenerEmail: () => emailActual(usuario),
    resolverLibro: (slug) => resolverLibro(usuario, slug),
    tieneAcceso: (bookId) => tieneAcceso(usuario, bookId),
    consumirCupo: (email) => consumirCupo(admin, `pagina:${email}`, limite.ventanaSeg, limite.maximo),
    leerImagen: (slug, numero) => leerImagen(admin, slug, numero),
    estampar: estamparMarcaDeAgua,
  }
}

export function puertosVistaPreviaReales(admin: SupabaseClient): PuertosVistaPrevia {
  return {
    resolverLibro: (slug) => resolverLibro(admin, slug),
    esPaginaVistaPrevia: (bookId, numero) => esPaginaVistaPrevia(admin, bookId, numero),
    leerImagen: (slug, numero) => leerImagen(admin, slug, numero),
  }
}
```

`src/app/api/paginas/[slug]/[n]/route.ts`:

```ts
import type { NextRequest } from "next/server"
import { puertosPaginaReales } from "@/lib/lectura/adaptadores"
import { responderPagina } from "@/lib/lectura/responder"
import { servirPagina } from "@/lib/lectura/servir-pagina"
import { crearClienteAdmin } from "@/lib/supabase/admin"
import { crearClienteServidor } from "@/lib/supabase/server"

export async function GET(_request: NextRequest, contexto: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await contexto.params
  const usuario = await crearClienteServidor()
  const resultado = await servirPagina(slug, n, puertosPaginaReales(usuario, crearClienteAdmin()))
  return responderPagina(resultado, { cache: "private, max-age=300" })
}
```

`src/app/api/vista-previa/[slug]/[n]/route.ts`:

```ts
import type { NextRequest } from "next/server"
import { puertosVistaPreviaReales } from "@/lib/lectura/adaptadores"
import { responderPagina } from "@/lib/lectura/responder"
import { nombreCookieVistaPrevia, servirVistaPrevia } from "@/lib/lectura/vista-previa"
import { crearClienteAdmin } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, contexto: { params: Promise<{ slug: string; n: string }> }) {
  const { slug, n } = await contexto.params
  const tieneCookie = request.cookies.has(nombreCookieVistaPrevia(slug))
  const resultado = await servirVistaPrevia(slug, n, tieneCookie, puertosVistaPreviaReales(crearClienteAdmin()))
  return responderPagina(resultado, { cache: "private, max-age=300" })
}
```

- [ ] **Step 7: Prueba de integración de las páginas**

`src/lib/lectura/paginas.integration.test.ts`:

```ts
import sharp from "sharp"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { otorgarAcceso } from "@/lib/acceso/otorgar"
import { rutaPagina, subirPagina } from "@/lib/libro/subir"
import {
  clienteAdminPrueba,
  clienteAnonimoPrueba,
  crearLibroPrueba,
  emailUnico,
  hayEntorno,
  limpiarPrueba,
  sesionPara,
  type SesionPrueba,
} from "@/test/integracion"
import { puertosPaginaReales, puertosVistaPreviaReales } from "./adaptadores"
import { servirPagina } from "./servir-pagina"
import { servirVistaPrevia } from "./vista-previa"

describe.skipIf(!hayEntorno)("servir páginas (Supabase local)", () => {
  const admin = clienteAdminPrueba()
  let libro: { id: string; slug: string }
  let original: Buffer
  let ana: SesionPrueba
  let beto: SesionPrueba
  const usuarioIds: string[] = []

  beforeAll(async () => {
    libro = await crearLibroPrueba(admin, 3)
    original = await sharp({ create: { width: 600, height: 960, channels: 3, background: "#ffffff" } }).webp().toBuffer()
    await subirPagina(admin, libro.slug, 1, original)
    await subirPagina(admin, libro.slug, 2, original)
    await admin.from("book_pages").insert([
      { book_id: libro.id, numero: 1, es_vista_previa: true },
      { book_id: libro.id, numero: 2, es_vista_previa: false },
      { book_id: libro.id, numero: 3, es_vista_previa: false },
    ])

    const emailAna = emailUnico("ana")
    await otorgarAcceso(admin, { email: emailAna, slug: libro.slug, origen: "cortesia" })
    ana = await sesionPara(admin, emailAna)
    beto = await sesionPara(admin, emailUnico("beto"))
    usuarioIds.push(ana.usuarioId, beto.usuarioId)
  })

  afterAll(async () => {
    await limpiarPrueba(admin, {
      bookIds: [libro.id],
      usuarioIds,
      archivos: [rutaPagina(libro.slug, 1), rutaPagina(libro.slug, 2)],
    })
  })

  it("un lector con acceso recibe la página estampada (distinta de la original)", async () => {
    const resultado = await servirPagina(libro.slug, "1", puertosPaginaReales(ana.cliente, admin))
    expect(resultado.status).toBe(200)
    if (resultado.status !== 200) return
    expect(resultado.imagen.equals(original)).toBe(false)
    const meta = await sharp(resultado.imagen).metadata()
    expect([meta.width, meta.height]).toEqual([600, 960])
  })

  it("sin sesión responde 401, sin acceso 403, página inexistente 404", async () => {
    expect((await servirPagina(libro.slug, "1", puertosPaginaReales(clienteAnonimoPrueba(), admin))).status).toBe(401)
    expect((await servirPagina(libro.slug, "1", puertosPaginaReales(beto.cliente, admin))).status).toBe(403)
    expect((await servirPagina(libro.slug, "4", puertosPaginaReales(ana.cliente, admin))).status).toBe(404)
    expect((await servirPagina(libro.slug, "3", puertosPaginaReales(ana.cliente, admin))).status).toBe(404) // sin imagen subida
  })

  it("aplica el límite de ritmo con el contador real de la base de datos", async () => {
    const puertos = puertosPaginaReales(ana.cliente, admin, { ventanaSeg: 60, maximo: 3 })
    const estados: number[] = []
    for (let i = 0; i < 4; i++) estados.push((await servirPagina(libro.slug, "1", puertos)).status)
    // Ana ya gastó un cupo en la primera prueba; con máximo 3 el 429 llega antes de la cuarta.
    expect(estados).toContain(429)
  })

  it("el bucket es privado: ni un anónimo ni un lector pueden descargar la imagen directamente", async () => {
    const ruta = rutaPagina(libro.slug, 1)
    const anonimo = await clienteAnonimoPrueba().storage.from("book-pages").download(ruta)
    expect(anonimo.error).not.toBeNull()
    const lector = await ana.cliente.storage.from("book-pages").download(ruta)
    expect(lector.error).not.toBeNull()
  })

  it("la vista previa sirve solo páginas marcadas, sin marca de agua y con la cookie", async () => {
    const puertos = puertosVistaPreviaReales(admin)
    const libre = await servirVistaPrevia(libro.slug, "1", true, puertos)
    expect(libre.status).toBe(200)
    if (libre.status === 200) expect(libre.imagen.equals(original)).toBe(true)
    expect((await servirVistaPrevia(libro.slug, "2", true, puertos)).status).toBe(403)
    expect((await servirVistaPrevia(libro.slug, "1", false, puertos)).status).toBe(401)
  })
})
```

- [ ] **Step 8: Correr todo**

Run: `npm run test:integracion && npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa; el build lista `/api/paginas/[slug]/[n]` y `/api/vista-previa/[slug]/[n]` como dinámicas.

- [ ] **Step 9: Probar las rutas de punta a punta con el libro real**

Con `supabase start` y el libro procesado (Tarea 7):

```bash
npm run acceso -- prueba@ejemplo.com si-dios-jugara-futbol
(npx next start -p 3100 >/dev/null 2>&1 &) ; sleep 4
echo "--- sin sesión (esperado 401) ---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/api/paginas/si-dios-jugara-futbol/17
echo "--- vista previa sin cookie (401), con cookie página 17 (200), con cookie página 100 (403) ---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/api/vista-previa/si-dios-jugara-futbol/17
curl -s -o /dev/null -w "%{http_code}\n" -H "Cookie: vp_si-dios-jugara-futbol=1" http://localhost:3100/api/vista-previa/si-dios-jugara-futbol/17
curl -s -o /dev/null -w "%{http_code}\n" -H "Cookie: vp_si-dios-jugara-futbol=1" http://localhost:3100/api/vista-previa/si-dios-jugara-futbol/100
echo "--- número inválido (400) ---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/api/paginas/si-dios-jugara-futbol/abc
kill $(lsof -ti tcp:3100) 2>/dev/null
```

Expected: `401`, `401`, `200`, `403`, `400`. El recorrido con sesión real (enlace, cookie, 200 estampado y 429) se prueba en la Tarea 11.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: marca de agua con el email y rutas que sirven las páginas con límite de ritmo" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 9: El lector (componentes)

**Files:**
- Create: `src/lib/lectura/tipos.ts`, `src/components/lector/gestos.ts`, `src/components/lector/use-imagen-pagina.ts`, `src/components/lector/indice-capitulos.tsx`, `src/components/lector/lector.tsx`
- Test: `src/components/lector/gestos.test.ts`, `src/components/lector/use-imagen-pagina.test.ts`, `src/components/lector/indice-capitulos.test.tsx`, `src/components/lector/lector.test.tsx`

**Interfaces:**
- Consumes: `ButtonLink` (Fase 1). Las rutas `GET /api/paginas/[slug]/[n]`, `GET /api/vista-previa/[slug]/[n]` y `POST /api/progreso` (Tarea 10) con sus códigos 200/401/403/429.
- Produces:
  - `type Capitulo = { pagina: number; titulo: string }`
  - `type Gesto = "siguiente" | "anterior" | null`, `resolverGesto({ dx, dy, ms, escala }): Gesto`
  - `precargar(url): Promise<string>` (URL de objeto), `liberarCache(): void`, `useImagenPagina(url): EstadoImagen`, `class ErrorImagen`
  - `IndiceCapitulos({ capitulos, paginaActual, ultimaPagina, alSeleccionar, alCerrar })`
  - `Lector({ slug, titulo, total, ultimaPagina, capitulos, paginaInicial, modo })` con `modo: "completo" | "vista-previa"`

- [ ] **Step 1: Escribir los tests que fallan**

`src/components/lector/gestos.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolverGesto } from "./gestos"

describe("resolverGesto", () => {
  it("deslizar a la izquierda pasa a la página siguiente", () => {
    expect(resolverGesto({ dx: -120, dy: 10, ms: 200, escala: 1 })).toBe("siguiente")
  })

  it("deslizar a la derecha vuelve a la anterior", () => {
    expect(resolverGesto({ dx: 120, dy: -10, ms: 200, escala: 1 })).toBe("anterior")
  })

  it("ignora los movimientos cortos", () => {
    expect(resolverGesto({ dx: -30, dy: 0, ms: 100, escala: 1 })).toBeNull()
  })

  it("ignora los movimientos más verticales que horizontales (es un scroll)", () => {
    expect(resolverGesto({ dx: -80, dy: 90, ms: 200, escala: 1 })).toBeNull()
  })

  it("ignora los arrastres lentos", () => {
    expect(resolverGesto({ dx: -120, dy: 0, ms: 1200, escala: 1 })).toBeNull()
  })

  it("ignora los gestos cuando la página está ampliada con pellizco", () => {
    expect(resolverGesto({ dx: -120, dy: 0, ms: 200, escala: 1.5 })).toBeNull()
  })
})
```

`src/components/lector/use-imagen-pagina.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ErrorImagen, liberarCache, precargar } from "./use-imagen-pagina"

let contador = 0

beforeEach(() => {
  contador = 0
  URL.createObjectURL = vi.fn(() => `blob:mock/${++contador}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  liberarCache()
  vi.unstubAllGlobals()
})

function simular(status: number) {
  const fetchSimulado = vi.fn(async () => new Response(status === 200 ? new Blob(["x"]) : null, { status }))
  vi.stubGlobal("fetch", fetchSimulado)
  return fetchSimulado
}

describe("precargar", () => {
  it("pide cada imagen una sola vez", async () => {
    const fetchSimulado = simular(200)
    const [a, b] = await Promise.all([precargar("/api/paginas/libro/1"), precargar("/api/paginas/libro/1")])
    expect(a).toBe(b)
    expect(fetchSimulado).toHaveBeenCalledTimes(1)
  })

  it("distingue el límite de ritmo (429) de la sesión vencida (401 y 403)", async () => {
    simular(429)
    await expect(precargar("/a")).rejects.toMatchObject({ motivo: "limite" })
    simular(401)
    await expect(precargar("/b")).rejects.toMatchObject({ motivo: "sesion" })
    simular(403)
    await expect(precargar("/c")).rejects.toMatchObject({ motivo: "sesion" })
    simular(500)
    await expect(precargar("/d")).rejects.toBeInstanceOf(ErrorImagen)
  })

  it("olvida el intento fallido para poder reintentar", async () => {
    const fallido = simular(429)
    await expect(precargar("/api/paginas/libro/2")).rejects.toBeInstanceOf(ErrorImagen)
    const exitoso = simular(200)
    await expect(precargar("/api/paginas/libro/2")).resolves.toMatch(/^blob:/)
    expect(fallido).toHaveBeenCalledTimes(1)
    expect(exitoso).toHaveBeenCalledTimes(1)
  })

  it("liberarCache revoca las URL de objeto", async () => {
    simular(200)
    await precargar("/api/paginas/libro/3")
    liberarCache()
    await Promise.resolve()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock/1")
  })
})
```

`src/components/lector/indice-capitulos.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { IndiceCapitulos } from "./indice-capitulos"

const capitulos = [
  { pagina: 7, titulo: "Prólogo" },
  { pagina: 17, titulo: "Minuto 01 · El ángel azul" },
  { pagina: 23, titulo: "Minuto 02 · ¡Ganar!" },
  { pagina: 99, titulo: "Minuto 18 · Luz" },
]

function montar(cambios: Partial<Parameters<typeof IndiceCapitulos>[0]> = {}) {
  const alSeleccionar = vi.fn()
  const alCerrar = vi.fn()
  render(
    <IndiceCapitulos
      capitulos={capitulos}
      paginaActual={20}
      ultimaPagina={240}
      alSeleccionar={alSeleccionar}
      alCerrar={alCerrar}
      {...cambios}
    />,
  )
  return { alSeleccionar, alCerrar }
}

describe("IndiceCapitulos", () => {
  it("lista todos los capítulos con su página", () => {
    montar()
    expect(screen.getByRole("dialog", { name: "Índice" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /·|Prólogo/ })).toHaveLength(4)
    expect(screen.getByText("99")).toBeInTheDocument()
  })

  it("en la vista previa solo lista los capítulos alcanzables", () => {
    montar({ ultimaPagina: 22 })
    expect(screen.getByRole("button", { name: /Prólogo/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Minuto 01/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Minuto 02/ })).toBeNull()
    expect(screen.queryByRole("button", { name: /Minuto 18/ })).toBeNull()
  })

  it("marca el capítulo donde va el lector", () => {
    montar({ paginaActual: 20 })
    expect(screen.getByRole("button", { name: /Minuto 01/ })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: /Prólogo/ })).not.toHaveAttribute("aria-current")
  })

  it("elegir un capítulo avisa la página y no cierra por su cuenta el fondo", () => {
    const { alSeleccionar, alCerrar } = montar()
    fireEvent.click(screen.getByRole("button", { name: /Minuto 02/ }))
    expect(alSeleccionar).toHaveBeenCalledWith(23)
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it("se cierra con el botón y al tocar fuera del panel", () => {
    const { alCerrar } = montar()
    fireEvent.click(screen.getByRole("button", { name: "Cerrar índice" }))
    fireEvent.click(screen.getByRole("dialog"))
    expect(alCerrar).toHaveBeenCalledTimes(2)
  })
})
```

`src/components/lector/lector.test.tsx`:

```tsx
import { act, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { Lector, type LectorProps } from "./lector"
import { liberarCache } from "./use-imagen-pagina"

const capitulos = [
  { pagina: 7, titulo: "Prólogo" },
  { pagina: 17, titulo: "Minuto 01 · El ángel azul" },
]

const base: LectorProps = {
  slug: "libro",
  titulo: "Mi libro",
  total: 240,
  ultimaPagina: 240,
  capitulos,
  paginaInicial: 3,
  modo: "completo",
}

let contador = 0

function respuesta(status = 200) {
  return new Response(status === 200 ? new Blob(["img"], { type: "image/webp" }) : null, { status })
}

const urlsPedidas = () => (fetch as Mock).mock.calls.map((llamada) => llamada[0] as string)

beforeEach(() => {
  contador = 0
  URL.createObjectURL = vi.fn(() => `blob:mock/${++contador}`)
  URL.revokeObjectURL = vi.fn()
  vi.stubGlobal("fetch", vi.fn(async () => respuesta()))
})

afterEach(() => {
  liberarCache()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("Lector", () => {
  it("muestra la página inicial y en qué página va", async () => {
    render(<Lector {...base} />)
    expect(await screen.findByAltText("Página 3")).toBeInTheDocument()
    expect(screen.getByText("Página 3 de 240")).toBeInTheDocument()
    expect(urlsPedidas()).toContain("/api/paginas/libro/3")
  })

  it("va precargando las páginas vecinas", async () => {
    render(<Lector {...base} />)
    await screen.findByAltText("Página 3")
    await waitFor(() => expect(urlsPedidas()).toEqual(expect.arrayContaining(["/api/paginas/libro/2", "/api/paginas/libro/4", "/api/paginas/libro/5"])))
  })

  it("los botones pasan de página y se bloquean en los extremos", async () => {
    render(<Lector {...base} paginaInicial={1} />)
    await screen.findByAltText("Página 1")
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    expect(await screen.findByAltText("Página 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeEnabled()
  })

  it("el teclado navega y respeta los límites", async () => {
    render(<Lector {...base} paginaInicial={1} ultimaPagina={5} total={5} />)
    await screen.findByAltText("Página 1")

    fireEvent.keyDown(window, { key: "ArrowLeft" })
    expect(screen.getByText("Página 1 de 5")).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "End" })
    expect(screen.getByText("Página 5 de 5")).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "ArrowRight" })
    expect(screen.getByText("Página 5 de 5")).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "Home" })
    expect(screen.getByText("Página 1 de 5")).toBeInTheDocument()
  })

  it("el índice lleva al capítulo elegido y se cierra", async () => {
    render(<Lector {...base} />)
    await screen.findByAltText("Página 3")

    fireEvent.click(screen.getByRole("button", { name: "Índice" }))
    fireEvent.click(screen.getByRole("button", { name: /Minuto 01/ }))
    expect(await screen.findByAltText("Página 17")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("el deslizador solo cambia de página al soltarlo", async () => {
    render(<Lector {...base} />)
    await screen.findByAltText("Página 3")

    const deslizador = screen.getByRole("slider", { name: "Ir a la página" })
    fireEvent.change(deslizador, { target: { value: "50" } })
    expect(screen.getByText("Página 50 de 240")).toBeInTheDocument()
    expect(urlsPedidas()).not.toContain("/api/paginas/libro/50")

    fireEvent.pointerUp(deslizador)
    expect(await screen.findByAltText("Página 50")).toBeInTheDocument()
  })

  it("bloquea el menú contextual sobre la lectura", async () => {
    render(<Lector {...base} />)
    await screen.findByAltText("Página 3")
    const evento = createEvent.contextMenu(screen.getByRole("main"))
    fireEvent(screen.getByRole("main"), evento)
    expect(evento.defaultPrevented).toBe(true)
  })

  it("avisa cuando se piden páginas demasiado rápido (429) y permite reintentar", async () => {
    ;(fetch as Mock).mockImplementation(async (url: string) => respuesta(url.endsWith("/3") ? 429 : 200))
    render(<Lector {...base} />)
    expect(await screen.findByText(/vas muy rápido/i)).toBeInTheDocument()

    ;(fetch as Mock).mockImplementation(async () => respuesta())
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))
    expect(await screen.findByAltText("Página 3")).toBeInTheDocument()
  })

  it("si la sesión venció ofrece volver a ingresar", async () => {
    ;(fetch as Mock).mockImplementation(async () => respuesta(401))
    render(<Lector {...base} />)
    const enlace = await screen.findByRole("link", { name: /vuelve a ingresar/i })
    expect(enlace).toHaveAttribute("href", "/biblioteca?next=%2Fleer%2Flibro")
  })

  it("guarda el progreso a los 1000 ms de cambiar de página, y no al abrir", async () => {
    render(<Lector {...base} />)
    await screen.findByAltText("Página 3")
    expect(urlsPedidas()).not.toContain("/api/progreso")

    vi.useFakeTimers()
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
    vi.useRealTimers()

    const llamada = (fetch as Mock).mock.calls.find((c) => c[0] === "/api/progreso")
    expect(llamada).toBeDefined()
    expect(llamada?.[1]).toMatchObject({ method: "POST" })
    expect(JSON.parse(llamada?.[1].body as string)).toEqual({ slug: "libro", pagina: 4 })
  })

  describe("vista previa", () => {
    const vista: LectorProps = { ...base, modo: "vista-previa", ultimaPagina: 22, paginaInicial: 1 }

    it("usa la ruta de vista previa y muestra el límite", async () => {
      render(<Lector {...vista} />)
      expect(await screen.findByAltText("Página 1")).toBeInTheDocument()
      expect(urlsPedidas()).toContain("/api/vista-previa/libro/1")
      expect(screen.getByText("Vista previa · página 1 de 22")).toBeInTheDocument()
    })

    it("al llegar al final invita a comprar y no deja avanzar", async () => {
      render(<Lector {...vista} />)
      await screen.findByAltText("Página 1")
      fireEvent.keyDown(window, { key: "End" })

      expect(screen.getByText("Vista previa · página 22 de 22")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "Quiero el libro completo" })).toHaveAttribute("href", "/#comprar")
      expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled()
    })

    it("no guarda progreso", async () => {
      render(<Lector {...vista} />)
      await screen.findByAltText("Página 1")
      vi.useFakeTimers()
      fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }))
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })
      vi.useRealTimers()
      expect(urlsPedidas()).not.toContain("/api/progreso")
    })
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven los módulos de `components/lector`.

- [ ] **Step 3: Implementar tipos, gestos, carga de imágenes e índice**

`src/lib/lectura/tipos.ts`:

```ts
export type Capitulo = { pagina: number; titulo: string }
```

`src/components/lector/gestos.ts`:

```ts
export type Gesto = "siguiente" | "anterior" | null

const DISTANCIA_MINIMA = 50
const DURACION_MAXIMA_MS = 800

/**
 * Decide si un deslizamiento es un cambio de página. Se ignora cuando la página está ampliada con
 * pellizco (ahí el arrastre es para moverse dentro de la página) y cuando el gesto es más vertical.
 */
export function resolverGesto({ dx, dy, ms, escala }: { dx: number; dy: number; ms: number; escala: number }): Gesto {
  if (escala > 1.05 || ms > DURACION_MAXIMA_MS) return null
  const horizontal = Math.abs(dx)
  if (horizontal < DISTANCIA_MINIMA || horizontal < Math.abs(dy) * 1.5) return null
  return dx < 0 ? "siguiente" : "anterior"
}
```

`src/components/lector/use-imagen-pagina.ts`:

```ts
"use client"

import { useEffect, useState } from "react"

export type MotivoError = "limite" | "sesion" | "otro"

export type EstadoImagen =
  | { estado: "cargando" }
  | { estado: "lista"; url: string }
  | { estado: "error"; motivo: MotivoError }

export class ErrorImagen extends Error {
  readonly motivo: MotivoError

  constructor(motivo: MotivoError) {
    super(motivo)
    this.motivo = motivo
  }
}

const cache = new Map<string, Promise<string>>()

async function pedir(url: string): Promise<string> {
  let respuesta: Response
  try {
    respuesta = await fetch(url, { credentials: "same-origin" })
  } catch {
    throw new ErrorImagen("otro")
  }
  if (respuesta.status === 429) throw new ErrorImagen("limite")
  if (respuesta.status === 401 || respuesta.status === 403) throw new ErrorImagen("sesion")
  if (!respuesta.ok) throw new ErrorImagen("otro")
  return URL.createObjectURL(await respuesta.blob())
}

/** Pide cada imagen una sola vez. Si falla, la olvida para que se pueda reintentar. */
export function precargar(url: string): Promise<string> {
  const existente = cache.get(url)
  if (existente) return existente
  const promesa = pedir(url)
  cache.set(url, promesa)
  promesa.catch(() => {
    if (cache.get(url) === promesa) cache.delete(url)
  })
  return promesa
}

/** Libera la memoria de las imágenes ya vistas (URL de objeto). */
export function liberarCache(): void {
  for (const promesa of cache.values()) {
    promesa.then(
      (url) => URL.revokeObjectURL(url),
      () => {},
    )
  }
  cache.clear()
}

/** Estado de la imagen de una página. Usa `key={url}` en el componente para reiniciar el estado al cambiar de página. */
export function useImagenPagina(url: string): EstadoImagen {
  const [estado, setEstado] = useState<EstadoImagen>({ estado: "cargando" })

  useEffect(() => {
    let activo = true
    precargar(url).then(
      (lista) => {
        if (activo) setEstado({ estado: "lista", url: lista })
      },
      (error) => {
        if (activo) setEstado({ estado: "error", motivo: error instanceof ErrorImagen ? error.motivo : "otro" })
      },
    )
    return () => {
      activo = false
    }
  }, [url])

  return estado
}
```

`src/components/lector/indice-capitulos.tsx`:

```tsx
"use client"

import type { Capitulo } from "@/lib/lectura/tipos"

type Props = {
  capitulos: Capitulo[]
  paginaActual: number
  ultimaPagina: number
  alSeleccionar: (pagina: number) => void
  alCerrar: () => void
}

export function IndiceCapitulos({ capitulos, paginaActual, ultimaPagina, alSeleccionar, alCerrar }: Props) {
  const visibles = capitulos.filter((capitulo) => capitulo.pagina <= ultimaPagina)
  const actual = [...visibles].reverse().find((capitulo) => capitulo.pagina <= paginaActual)

  return (
    <div role="dialog" aria-label="Índice" className="fixed inset-0 z-50 flex justify-end bg-tinta/40" onClick={alCerrar}>
      <nav className="h-full w-full max-w-sm overflow-y-auto bg-papel p-6" onClick={(evento) => evento.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">Índice</h2>
          <button type="button" onClick={alCerrar} aria-label="Cerrar índice" className="px-2 text-2xl leading-none">
            ×
          </button>
        </div>
        <ol className="mt-6 space-y-1">
          {visibles.map((capitulo) => (
            <li key={`${capitulo.pagina}-${capitulo.titulo}`}>
              <button
                type="button"
                aria-current={capitulo === actual ? "true" : undefined}
                onClick={() => alSeleccionar(capitulo.pagina)}
                className="flex w-full items-baseline justify-between gap-4 rounded-lg px-3 py-2 text-left hover:bg-papel-oscuro aria-[current=true]:bg-papel-oscuro aria-[current=true]:font-semibold"
              >
                <span>{capitulo.titulo}</span>
                <span className="text-sm text-tinta-suave">{capitulo.pagina}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
```

- [ ] **Step 4: Implementar el lector**

`src/components/lector/lector.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ButtonLink } from "@/components/ui/button"
import type { Capitulo } from "@/lib/lectura/tipos"
import { resolverGesto } from "./gestos"
import { IndiceCapitulos } from "./indice-capitulos"
import { liberarCache, precargar, useImagenPagina } from "./use-imagen-pagina"

export type ModoLector = "completo" | "vista-previa"

export type LectorProps = {
  slug: string
  titulo: string
  total: number
  /** Última página que se puede abrir: el total en el libro completo, o el límite de la vista previa. */
  ultimaPagina: number
  capitulos: Capitulo[]
  paginaInicial: number
  modo: ModoLector
}

function urlPagina(modo: ModoLector, slug: string, numero: number): string {
  return `${modo === "completo" ? "/api/paginas" : "/api/vista-previa"}/${slug}/${numero}`
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(Math.max(valor, minimo), maximo)
}

type PaginaImagenProps = { url: string; numero: number; hrefSesion: string; alReintentar: () => void }

function PaginaImagen({ url, numero, hrefSesion, alReintentar }: PaginaImagenProps) {
  const imagen = useImagenPagina(url)

  if (imagen.estado === "cargando") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Cargando la página"
        className="mx-auto aspect-[5/8] w-full max-w-[calc((100dvh_-_10rem)*0.625)] animate-pulse rounded-sm bg-papel"
      />
    )
  }

  if (imagen.estado === "error") {
    return (
      <div role="alert" className="mx-auto max-w-sm rounded-2xl border border-linea bg-white/70 p-6 text-center">
        {imagen.motivo === "limite" ? <p>Vas muy rápido. Espera unos segundos y vuelve a intentar.</p> : null}
        {imagen.motivo === "sesion" ? (
          <p>
            Tu sesión venció.{" "}
            <Link href={hrefSesion} className="underline underline-offset-4">
              Vuelve a ingresar
            </Link>
            .
          </p>
        ) : null}
        {imagen.motivo === "otro" ? <p>No pudimos cargar la página.</p> : null}
        {imagen.motivo !== "sesion" ? (
          <button type="button" onClick={alReintentar} className="mt-4 rounded-full border border-cancha px-5 py-2 text-sm font-semibold text-cancha">
            Reintentar
          </button>
        ) : null}
      </div>
    )
  }

  return (
    // Es una URL de objeto (blob:) de una página protegida: next/image no aplica.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imagen.url}
      alt={`Página ${numero}`}
      draggable={false}
      className="mx-auto h-auto max-h-[calc(100dvh_-_10rem)] w-auto max-w-full select-none rounded-sm shadow-portada"
    />
  )
}

export function Lector({ slug, titulo, total, ultimaPagina, capitulos, paginaInicial, modo }: LectorProps) {
  const [pagina, setPagina] = useState(() => limitar(paginaInicial, 1, ultimaPagina))
  const [borrador, setBorrador] = useState<number | null>(null)
  const [indiceAbierto, setIndiceAbierto] = useState(false)
  const [intento, setIntento] = useState(0)
  const inicioGesto = useRef<{ x: number; y: number; t: number } | null>(null)
  const ultimaGuardada = useRef(limitar(paginaInicial, 1, ultimaPagina))

  const irA = useCallback((numero: number) => setPagina(limitar(numero, 1, ultimaPagina)), [ultimaPagina])
  const siguiente = useCallback(() => setPagina((p) => limitar(p + 1, 1, ultimaPagina)), [ultimaPagina])
  const anterior = useCallback(() => setPagina((p) => limitar(p - 1, 1, ultimaPagina)), [ultimaPagina])

  // Teclado: flechas, RePág/AvPág, espacio, Inicio y Fin. El deslizador maneja sus propias flechas.
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.target instanceof HTMLInputElement) return
      switch (evento.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          evento.preventDefault()
          siguiente()
          break
        case "ArrowLeft":
        case "PageUp":
          evento.preventDefault()
          anterior()
          break
        case "Home":
          evento.preventDefault()
          irA(1)
          break
        case "End":
          evento.preventDefault()
          irA(ultimaPagina)
          break
        case "Escape":
          setIndiceAbierto(false)
          break
      }
    }
    window.addEventListener("keydown", alPulsar)
    return () => window.removeEventListener("keydown", alPulsar)
  }, [siguiente, anterior, irA, ultimaPagina])

  // Precarga las páginas vecinas para que pasar de página sea inmediato.
  useEffect(() => {
    for (const numero of [pagina + 1, pagina + 2, pagina - 1]) {
      if (numero >= 1 && numero <= ultimaPagina) precargar(urlPagina(modo, slug, numero)).catch(() => {})
    }
  }, [pagina, modo, slug, ultimaPagina])

  // Guarda el progreso 1 segundo después de dejar de cambiar de página (solo en el libro completo).
  useEffect(() => {
    if (modo !== "completo" || pagina === ultimaGuardada.current) return
    const id = window.setTimeout(() => {
      ultimaGuardada.current = pagina
      void fetch("/api/progreso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, pagina }),
        keepalive: true,
      }).catch(() => {})
    }, 1000)
    return () => window.clearTimeout(id)
  }, [modo, slug, pagina])

  useEffect(() => () => liberarCache(), [])

  function confirmarBorrador() {
    if (borrador === null) return
    irA(borrador)
    setBorrador(null)
  }

  const mostrada = borrador ?? pagina
  const etiqueta =
    modo === "completo" ? `Página ${mostrada} de ${ultimaPagina}` : `Vista previa · página ${mostrada} de ${ultimaPagina}`
  const hrefSesion =
    modo === "completo" ? `/biblioteca?next=${encodeURIComponent(`/leer/${slug}`)}` : `/leer/${slug}/vista-previa`
  const alFinalDeVistaPrevia = modo === "vista-previa" && pagina === ultimaPagina && total > ultimaPagina
  const url = urlPagina(modo, slug, pagina)

  return (
    <div className="flex h-dvh flex-col bg-papel-oscuro">
      <header className="flex items-center justify-between gap-3 border-b border-linea bg-papel px-4 py-3">
        <Link href={modo === "completo" ? "/biblioteca" : `/libro/${slug}`} className="text-sm underline underline-offset-4">
          ← Salir
        </Link>
        <p className="min-w-0 flex-1 truncate text-center font-serif text-lg">{titulo}</p>
        <button
          type="button"
          onClick={() => setIndiceAbierto(true)}
          className="rounded-full border border-cancha px-4 py-1.5 text-sm font-semibold text-cancha"
        >
          Índice
        </button>
      </header>

      <main
        className="flex-1 select-none overflow-y-auto px-2 py-3 [-webkit-touch-callout:none]"
        style={{ touchAction: "pan-y pinch-zoom" }}
        onContextMenu={(evento) => evento.preventDefault()}
        onPointerDown={(evento) => {
          inicioGesto.current = { x: evento.clientX, y: evento.clientY, t: evento.timeStamp }
        }}
        onPointerUp={(evento) => {
          const inicio = inicioGesto.current
          inicioGesto.current = null
          if (!inicio) return
          const gesto = resolverGesto({
            dx: evento.clientX - inicio.x,
            dy: evento.clientY - inicio.y,
            ms: evento.timeStamp - inicio.t,
            escala: window.visualViewport?.scale ?? 1,
          })
          if (gesto === "siguiente") siguiente()
          if (gesto === "anterior") anterior()
        }}
        onPointerCancel={() => {
          inicioGesto.current = null
        }}
      >
        <PaginaImagen
          key={`${url}-${intento}`}
          url={url}
          numero={pagina}
          hrefSesion={hrefSesion}
          alReintentar={() => setIntento((n) => n + 1)}
        />
      </main>

      <footer className="border-t border-linea bg-papel px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        {alFinalDeVistaPrevia ? (
          <div className="mb-3 rounded-2xl border border-dorado-claro bg-papel-oscuro p-4 text-center">
            <p className="font-serif text-lg">Llegaste al final de la vista previa</p>
            <p className="mt-1 text-sm text-tinta-suave">Si te gustó, sigue con el libro completo.</p>
            <ButtonLink href="/#comprar" className="mt-3">
              Quiero el libro completo
            </ButtonLink>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={anterior}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            className="h-11 w-11 shrink-0 rounded-full border border-cancha text-xl text-cancha disabled:cursor-not-allowed disabled:opacity-40"
          >
            ‹
          </button>
          <div className="min-w-0 flex-1">
            <input
              type="range"
              min={1}
              max={ultimaPagina}
              value={mostrada}
              aria-label="Ir a la página"
              onChange={(evento) => setBorrador(Number(evento.target.value))}
              onPointerUp={confirmarBorrador}
              onKeyUp={confirmarBorrador}
              onBlur={confirmarBorrador}
              className="w-full accent-cancha"
            />
            <p aria-live="polite" className="mt-1 text-center text-xs text-tinta-suave">
              {etiqueta}
            </p>
          </div>
          <button
            type="button"
            onClick={siguiente}
            disabled={pagina >= ultimaPagina}
            aria-label="Página siguiente"
            className="h-11 w-11 shrink-0 rounded-full border border-cancha text-xl text-cancha disabled:cursor-not-allowed disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </footer>

      {indiceAbierto ? (
        <IndiceCapitulos
          capitulos={capitulos}
          paginaActual={pagina}
          ultimaPagina={ultimaPagina}
          alSeleccionar={(numero) => {
            irA(numero)
            setIndiceAbierto(false)
          }}
          alCerrar={() => setIndiceAbierto(false)}
        />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS. Si `fireEvent.pointerUp` no dispara `onPointerUp` en jsdom, usa `fireEvent.keyUp(deslizador)` en esa prueba (el componente confirma con ambos). Si el lint marca `react-hooks/set-state-in-effect`, comprueba que solo se llama a `setEstado` dentro de las promesas (así está escrito) y no directamente en el cuerpo del efecto.

- [ ] **Step 6: Verificar y hacer commit**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

```bash
git add -A
git commit -m "feat: lector con navegación por gestos, teclado, índice, progreso y vista previa" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Páginas del lector, progreso, vista previa y enlaces desde la landing

**Files:**
- Create: `src/lib/lectura/progreso.ts`, `src/lib/lectura/capturar-lead.ts`, `src/app/api/progreso/route.ts`, `src/app/leer/[slug]/page.tsx`, `src/app/leer/[slug]/vista-previa/page.tsx`, `src/app/leer/[slug]/vista-previa/tipos.ts`, `src/app/leer/[slug]/vista-previa/actions.ts`, `src/app/leer/[slug]/vista-previa/formulario-vista-previa.tsx`
- Modify: `src/lib/lectura/datos.ts`, `src/lib/lectura/adaptadores.ts`, `src/components/book/hero.tsx`, `src/components/book/book-landing.tsx`, `src/components/book/content-sections.test.tsx`, `src/components/book/book-landing.test.tsx`
- Test: `src/lib/lectura/progreso.test.ts`, `src/lib/lectura/capturar-lead.test.ts`, `src/app/leer/[slug]/vista-previa/formulario-vista-previa.test.tsx`, `src/lib/lectura/lectura.integration.test.ts`

**Interfaces:**
- Consumes: `Lector`, `Capitulo`, `resolverLibro`, `tieneAcceso`, `crearClienteServidor`, `crearClienteAdmin`, `emailActual`, `nombreCookieVistaPrevia`, `normalizarEmail`, `getBook`.
- Produces:
  - `type PuertosProgreso`, `type RespuestaProgreso = 204 | 400 | 401 | 403 | 404`, `guardarProgreso(cuerpo: unknown, puertos): Promise<RespuestaProgreso>`
  - `type PuertosLead`, `type ResultadoLead = "ok" | "email-invalido" | "libro-inexistente"`, `capturarLead({ email, slug }, puertos): Promise<ResultadoLead>`
  - `type DatosLibro = { id; slug; titulo; total; capitulos: Capitulo[]; ultimaPaginaVistaPrevia: number }`, `obtenerDatosLibro(admin, slug): Promise<DatosLibro | null>`, `ultimaPaginaLeida(usuario, bookId): Promise<number | null>`
  - `puertosProgresoReales(usuario)`, `puertosLeadReales(admin)`
  - `POST /api/progreso` (204/400/401/403/404), páginas `/leer/[slug]` y `/leer/[slug]/vista-previa`
  - En la landing: botón "Leer un capítulo gratis" y enlace "Mi biblioteca"

- [ ] **Step 1: Escribir los tests que fallan**

`src/lib/lectura/progreso.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { guardarProgreso, type PuertosProgreso } from "./progreso"

function armarPuertos(cambios: Partial<PuertosProgreso> = {}): PuertosProgreso {
  return {
    obtenerEmail: vi.fn(async () => "ana@ejemplo.com"),
    resolverLibro: vi.fn(async () => ({ id: "libro-1", total: 240 })),
    guardar: vi.fn(async () => true),
    ...cambios,
  }
}

describe("guardarProgreso", () => {
  it("guarda la página y responde 204", async () => {
    const puertos = armarPuertos()
    expect(await guardarProgreso({ slug: "libro", pagina: 17 }, puertos)).toBe(204)
    expect(puertos.guardar).toHaveBeenCalledWith("ana@ejemplo.com", "libro-1", 17)
  })

  it.each([
    [null],
    ["texto"],
    [{}],
    [{ slug: "libro" }],
    [{ slug: "", pagina: 3 }],
    [{ slug: "libro", pagina: 0 }],
    [{ slug: "libro", pagina: 2.5 }],
    [{ slug: "libro", pagina: "3" }],
  ])("400 con un cuerpo inválido: %j", async (cuerpo) => {
    const puertos = armarPuertos()
    expect(await guardarProgreso(cuerpo, puertos)).toBe(400)
    expect(puertos.obtenerEmail).not.toHaveBeenCalled()
  })

  it("401 sin sesión", async () => {
    expect(await guardarProgreso({ slug: "libro", pagina: 3 }, armarPuertos({ obtenerEmail: vi.fn(async () => null) }))).toBe(401)
  })

  it("404 si el libro no existe y 400 si la página pasa del total", async () => {
    expect(await guardarProgreso({ slug: "x", pagina: 3 }, armarPuertos({ resolverLibro: vi.fn(async () => null) }))).toBe(404)
    expect(await guardarProgreso({ slug: "libro", pagina: 241 }, armarPuertos())).toBe(400)
  })

  it("403 si la base de datos rechaza el guardado (no tiene acceso a ese libro)", async () => {
    expect(await guardarProgreso({ slug: "libro", pagina: 3 }, armarPuertos({ guardar: vi.fn(async () => false) }))).toBe(403)
  })
})
```

`src/lib/lectura/capturar-lead.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { capturarLead, type PuertosLead } from "./capturar-lead"

function armarPuertos(cambios: Partial<PuertosLead> = {}): PuertosLead {
  return {
    resolverLibro: vi.fn(async () => ({ id: "libro-1" })),
    guardarLead: vi.fn(async () => {}),
    ...cambios,
  }
}

describe("capturarLead", () => {
  it("guarda el email normalizado con su origen", async () => {
    const puertos = armarPuertos()
    expect(await capturarLead({ email: "  Ana@Ejemplo.COM ", slug: "libro" }, puertos)).toBe("ok")
    expect(puertos.guardarLead).toHaveBeenCalledWith("ana@ejemplo.com", "libro-1", "vista-previa")
  })

  it("rechaza un email inválido sin tocar la base de datos", async () => {
    const puertos = armarPuertos()
    expect(await capturarLead({ email: "nada", slug: "libro" }, puertos)).toBe("email-invalido")
    expect(puertos.resolverLibro).not.toHaveBeenCalled()
  })

  it("avisa si el libro no existe", async () => {
    const puertos = armarPuertos({ resolverLibro: vi.fn(async () => null) })
    expect(await capturarLead({ email: "ana@ejemplo.com", slug: "x" }, puertos)).toBe("libro-inexistente")
    expect(await capturarLead({ email: "ana@ejemplo.com", slug: 42 }, armarPuertos())).toBe("libro-inexistente")
    expect(puertos.guardarLead).not.toHaveBeenCalled()
  })
})
```

`src/app/leer/[slug]/vista-previa/formulario-vista-previa.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FormularioVistaPrevia } from "./formulario-vista-previa"
import type { EstadoVistaPrevia } from "./tipos"

function enviar(email: string) {
  fireEvent.change(screen.getByLabelText("Tu email"), { target: { value: email } })
  fireEvent.submit(screen.getByRole("button", { name: "Abrir la vista previa" }).closest("form") as HTMLFormElement)
}

describe("FormularioVistaPrevia", () => {
  it("muestra cuántas páginas son gratis y el campo de email", () => {
    render(<FormularioVistaPrevia accion={vi.fn()} slug="libro" paginasGratis={22} titulo="Mi libro" />)
    expect(screen.getByRole("heading", { name: /primeras 22 páginas/i })).toBeInTheDocument()
    expect(screen.getByLabelText("Tu email")).toBeInTheDocument()
  })

  it("lleva el slug del libro en un campo oculto", () => {
    const { container } = render(<FormularioVistaPrevia accion={vi.fn()} slug="libro" paginasGratis={22} titulo="Mi libro" />)
    expect(container.querySelector('input[name="slug"]')).toHaveValue("libro")
  })

  it("pide revisar el email si la acción lo marca como inválido", async () => {
    const accion = vi.fn(async (): Promise<EstadoVistaPrevia> => ({ estado: "invalido" }))
    render(<FormularioVistaPrevia accion={accion} slug="libro" paginasGratis={22} titulo="Mi libro" />)
    enviar("mal")
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/revisa tu email/i))
  })

  it("muestra un mensaje si algo falla", async () => {
    const accion = vi.fn(async (): Promise<EstadoVistaPrevia> => ({ estado: "error" }))
    render(<FormularioVistaPrevia accion={accion} slug="libro" paginasGratis={22} titulo="Mi libro" />)
    enviar("ana@ejemplo.com")
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/no pudimos abrir/i))
  })
})
```

Agrega dentro de `describe("Hero", …)` de `src/components/book/content-sections.test.tsx`:

```tsx
  it("ofrece leer un capítulo gratis", () => {
    render(<Hero book={book} />)
    expect(screen.getByRole("link", { name: "Leer un capítulo gratis" })).toHaveAttribute(
      "href",
      "/leer/libro-de-prueba/vista-previa",
    )
  })
```

Agrega dentro de `describe("BookLanding", …)` de `src/components/book/book-landing.test.tsx`:

```tsx
  it("enlaza a la biblioteca desde el pie de página", () => {
    render(<BookLanding book={makeBook()} />)
    expect(screen.getByRole("link", { name: "Mi biblioteca" })).toHaveAttribute("href", "/biblioteca")
  })
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — faltan `progreso`, `capturar-lead`, `formulario-vista-previa` y los enlaces de la landing.

- [ ] **Step 3: Implementar la lógica de progreso y de leads**

`src/lib/lectura/progreso.ts`:

```ts
export type PuertosProgreso = {
  obtenerEmail: () => Promise<string | null>
  resolverLibro: (slug: string) => Promise<{ id: string; total: number } | null>
  /** Devuelve false si la base de datos rechaza el guardado (RLS: el lector no tiene acceso a ese libro). */
  guardar: (email: string, bookId: string, pagina: number) => Promise<boolean>
}

export type RespuestaProgreso = 204 | 400 | 401 | 403 | 404

export async function guardarProgreso(cuerpo: unknown, puertos: PuertosProgreso): Promise<RespuestaProgreso> {
  const { slug, pagina } = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as { slug?: unknown; pagina?: unknown }
  if (typeof slug !== "string" || slug === "" || !Number.isInteger(pagina) || (pagina as number) < 1) return 400

  const email = await puertos.obtenerEmail()
  if (!email) return 401

  const libro = await puertos.resolverLibro(slug)
  if (!libro) return 404
  if ((pagina as number) > libro.total) return 400

  return (await puertos.guardar(email, libro.id, pagina as number)) ? 204 : 403
}
```

`src/lib/lectura/capturar-lead.ts`:

```ts
import { normalizarEmail } from "@/lib/correo/normalizar"

export type PuertosLead = {
  resolverLibro: (slug: string) => Promise<{ id: string } | null>
  guardarLead: (email: string, bookId: string, origen: string) => Promise<void>
}

export type ResultadoLead = "ok" | "email-invalido" | "libro-inexistente"

/** Guarda el email de quien pide la vista previa gratuita (una sola vez por email y libro). */
export async function capturarLead(
  entrada: { email: unknown; slug: unknown },
  puertos: PuertosLead,
): Promise<ResultadoLead> {
  const email = normalizarEmail(entrada.email)
  if (!email) return "email-invalido"
  if (typeof entrada.slug !== "string") return "libro-inexistente"

  const libro = await puertos.resolverLibro(entrada.slug)
  if (!libro) return "libro-inexistente"

  await puertos.guardarLead(email, libro.id, "vista-previa")
  return "ok"
}
```

En `src/lib/lectura/datos.ts` agrega `import type { Capitulo } from "./tipos"` junto a las importaciones del principio, y el resto al final del archivo:

```ts
export type DatosLibro = {
  id: string
  slug: string
  titulo: string
  total: number
  capitulos: Capitulo[]
  /** Las páginas gratuitas son siempre las primeras N: aquí va N. */
  ultimaPaginaVistaPrevia: number
}

/** Datos del libro para armar el lector. Usa la clave del servidor porque lee tablas que los usuarios no ven. */
export async function obtenerDatosLibro(admin: SupabaseClient, slug: string): Promise<DatosLibro | null> {
  const { data: libro, error } = await admin
    .from("books")
    .select("id, slug, titulo, total_paginas")
    .eq("slug", slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!libro) return null

  const { data: capitulos, error: errorCapitulos } = await admin
    .from("book_chapters")
    .select("numero_pagina, titulo")
    .eq("book_id", libro.id)
    .order("orden")
  if (errorCapitulos) throw new Error(errorCapitulos.message)

  const { count, error: errorConteo } = await admin
    .from("book_pages")
    .select("numero", { count: "exact", head: true })
    .eq("book_id", libro.id)
    .eq("es_vista_previa", true)
  if (errorConteo) throw new Error(errorConteo.message)

  return {
    id: libro.id as string,
    slug: libro.slug as string,
    titulo: libro.titulo as string,
    total: libro.total_paginas as number,
    capitulos: (capitulos ?? []).map((c) => ({ pagina: c.numero_pagina as number, titulo: c.titulo as string })),
    ultimaPaginaVistaPrevia: count ?? 0,
  }
}

/** Última página que el lector dejó abierta (RLS limita la consulta a su propio progreso). */
export async function ultimaPaginaLeida(usuario: SupabaseClient, bookId: string): Promise<number | null> {
  const { data, error } = await usuario
    .from("reading_progress")
    .select("ultima_pagina")
    .eq("book_id", bookId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.ultima_pagina as number | undefined) ?? null
}
```

Agrega al final de `src/lib/lectura/adaptadores.ts` (y sus importaciones al principio):

```ts
import type { PuertosLead } from "./capturar-lead"
import type { PuertosProgreso } from "./progreso"

export function puertosProgresoReales(usuario: SupabaseClient): PuertosProgreso {
  return {
    obtenerEmail: () => emailActual(usuario),
    resolverLibro: (slug) => resolverLibro(usuario, slug),
    guardar: async (email, bookId, pagina) => {
      const { error } = await usuario
        .from("reading_progress")
        .upsert(
          { email, book_id: bookId, ultima_pagina: pagina, actualizado_en: new Date().toISOString() },
          { onConflict: "email,book_id" },
        )
      if (!error) return true
      if (error.code === "42501") return false
      throw new Error(error.message)
    },
  }
}

export function puertosLeadReales(admin: SupabaseClient): PuertosLead {
  return {
    resolverLibro: async (slug) => {
      const libro = await resolverLibro(admin, slug)
      return libro ? { id: libro.id } : null
    },
    guardarLead: async (email, bookId, origen) => {
      const { error } = await admin
        .from("leads")
        .upsert({ email, book_id: bookId, origen }, { onConflict: "email,book_id", ignoreDuplicates: true })
      if (error) throw new Error(error.message)
    },
  }
}
```

`src/app/api/progreso/route.ts`:

```ts
import type { NextRequest } from "next/server"
import { puertosProgresoReales } from "@/lib/lectura/adaptadores"
import { guardarProgreso } from "@/lib/lectura/progreso"
import { crearClienteServidor } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const cuerpo = await request.json().catch(() => null)
  const usuario = await crearClienteServidor()
  const estado = await guardarProgreso(cuerpo, puertosProgresoReales(usuario))
  return new Response(null, { status: estado, headers: { "Cache-Control": "no-store" } })
}
```

- [ ] **Step 4: Páginas del lector y de la vista previa**

`src/app/leer/[slug]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation"
import { Lector } from "@/components/lector/lector"
import { getBook } from "@/content/books"
import { obtenerDatosLibro, tieneAcceso, ultimaPaginaLeida } from "@/lib/lectura/datos"
import { crearClienteAdmin } from "@/lib/supabase/admin"
import { crearClienteServidor } from "@/lib/supabase/server"
import { emailActual } from "@/lib/supabase/usuario"

export const metadata = { title: "Leer", robots: { index: false } }

type Props = { params: Promise<{ slug: string }> }

export default async function LeerPage({ params }: Props) {
  const { slug } = await params
  const usuario = await crearClienteServidor()
  if (!(await emailActual(usuario))) redirect(`/biblioteca?next=${encodeURIComponent(`/leer/${slug}`)}`)

  const libro = await obtenerDatosLibro(crearClienteAdmin(), slug)
  if (!libro) notFound()
  if (!(await tieneAcceso(usuario, libro.id))) redirect(`/leer/${slug}/vista-previa`)

  const paginaInicial = (await ultimaPaginaLeida(usuario, libro.id)) ?? 1
  return (
    <Lector
      slug={slug}
      titulo={getBook(slug)?.titulo ?? libro.titulo}
      total={libro.total}
      ultimaPagina={libro.total}
      capitulos={libro.capitulos}
      paginaInicial={paginaInicial}
      modo="completo"
    />
  )
}
```

`src/app/leer/[slug]/vista-previa/tipos.ts`:

```ts
export type EstadoVistaPrevia = { estado: "inicial" | "invalido" | "error" }

export const ESTADO_INICIAL_VISTA_PREVIA: EstadoVistaPrevia = { estado: "inicial" }
```

`src/app/leer/[slug]/vista-previa/actions.ts`:

```ts
"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { puertosLeadReales } from "@/lib/lectura/adaptadores"
import { capturarLead } from "@/lib/lectura/capturar-lead"
import { nombreCookieVistaPrevia } from "@/lib/lectura/vista-previa"
import { crearClienteAdmin } from "@/lib/supabase/admin"
import type { EstadoVistaPrevia } from "./tipos"

const TREINTA_DIAS = 60 * 60 * 24 * 30

export async function pedirVistaPrevia(_anterior: EstadoVistaPrevia, datos: FormData): Promise<EstadoVistaPrevia> {
  const slug = String(datos.get("slug") ?? "")
  const resultado = await capturarLead({ email: datos.get("email"), slug }, puertosLeadReales(crearClienteAdmin()))
  if (resultado === "email-invalido") return { estado: "invalido" }
  if (resultado === "libro-inexistente") return { estado: "error" }

  const almacen = await cookies()
  almacen.set(nombreCookieVistaPrevia(slug), "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TREINTA_DIAS,
  })
  redirect(`/leer/${slug}/vista-previa`)
}
```

`src/app/leer/[slug]/vista-previa/formulario-vista-previa.tsx`:

```tsx
"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { ESTADO_INICIAL_VISTA_PREVIA, type EstadoVistaPrevia } from "./tipos"

type Props = {
  accion: (anterior: EstadoVistaPrevia, datos: FormData) => Promise<EstadoVistaPrevia>
  slug: string
  paginasGratis: number
  titulo: string
}

export function FormularioVistaPrevia({ accion, slug, paginasGratis, titulo }: Props) {
  const [estado, formAction, pendiente] = useActionState(accion, ESTADO_INICIAL_VISTA_PREVIA)

  return (
    <form action={formAction} className="space-y-4 text-left">
      <h1 className="font-serif text-3xl">Lee las primeras {paginasGratis} páginas gratis</h1>
      <p className="text-tinta-suave">Escribe tu email para abrir la vista previa de {titulo}.</p>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Tu email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-linea bg-white px-4 py-3 text-base outline-none focus:border-cancha focus:ring-2 focus:ring-cancha/30"
        />
      </div>
      <input type="hidden" name="slug" value={slug} />
      {estado.estado === "invalido" ? (
        <p role="alert" className="text-sm">
          Revisa tu email: parece que no está bien escrito.
        </p>
      ) : null}
      {estado.estado === "error" ? (
        <p role="alert" className="text-sm">
          No pudimos abrir la vista previa. Inténtalo de nuevo en un momento.
        </p>
      ) : null}
      <Button type="submit" disabled={pendiente} className="w-full">
        {pendiente ? "Abriendo…" : "Abrir la vista previa"}
      </Button>
    </form>
  )
}
```

`src/app/leer/[slug]/vista-previa/page.tsx`:

```tsx
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Lector } from "@/components/lector/lector"
import { getBook } from "@/content/books"
import { obtenerDatosLibro } from "@/lib/lectura/datos"
import { nombreCookieVistaPrevia } from "@/lib/lectura/vista-previa"
import { crearClienteAdmin } from "@/lib/supabase/admin"
import { pedirVistaPrevia } from "./actions"
import { FormularioVistaPrevia } from "./formulario-vista-previa"

export const metadata = { title: "Vista previa gratuita", robots: { index: false } }

type Props = { params: Promise<{ slug: string }> }

export default async function VistaPreviaPage({ params }: Props) {
  const { slug } = await params
  const libro = await obtenerDatosLibro(crearClienteAdmin(), slug)
  if (!libro || libro.ultimaPaginaVistaPrevia < 1) notFound()

  const titulo = getBook(slug)?.titulo ?? libro.titulo
  const almacen = await cookies()

  if (!almacen.has(nombreCookieVistaPrevia(slug))) {
    return (
      <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-16 sm:px-6">
        <FormularioVistaPrevia
          accion={pedirVistaPrevia}
          slug={slug}
          paginasGratis={libro.ultimaPaginaVistaPrevia}
          titulo={titulo}
        />
        <p className="mt-10 text-sm">
          <Link href={`/libro/${slug}`} className="underline underline-offset-4">
            Volver al libro
          </Link>
        </p>
      </main>
    )
  }

  return (
    <Lector
      slug={slug}
      titulo={titulo}
      total={libro.total}
      ultimaPagina={libro.ultimaPaginaVistaPrevia}
      capitulos={libro.capitulos}
      paginaInicial={1}
      modo="vista-previa"
    />
  )
}
```

- [ ] **Step 5: Enlaces desde la landing**

En `src/components/book/hero.tsx`, agrega el botón secundario justo después del botón principal:

```tsx
          <ButtonLink href={`/leer/${book.slug}/vista-previa`} variant="secondary">
            Leer un capítulo gratis
          </ButtonLink>
```

En `src/components/book/book-landing.tsx`, importa `Link` (`import Link from "next/link"`) y reemplaza el pie de página:

```tsx
      <footer className="px-4 pb-24 pt-8 text-center text-sm text-tinta-suave md:pb-10">
        © {book.anioPublicacion} {book.autor}. Distribución digital: Ebooks de Jhei Trujillo.
        <span className="mt-2 block">
          <Link href="/biblioteca" className="underline underline-offset-4">
            Mi biblioteca
          </Link>
        </span>
      </footer>
```

- [ ] **Step 6: Ejecutar los tests unitarios**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Prueba de integración de datos, progreso y leads**

`src/lib/lectura/lectura.integration.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { otorgarAcceso } from "@/lib/acceso/otorgar"
import type { ConfigLibro } from "@/lib/libro/config"
import { guardarLibro } from "@/lib/libro/subir"
import {
  clienteAdminPrueba,
  emailUnico,
  hayEntorno,
  limpiarPrueba,
  sesionPara,
  type SesionPrueba,
} from "@/test/integracion"
import { puertosLeadReales, puertosProgresoReales } from "./adaptadores"
import { capturarLead } from "./capturar-lead"
import { obtenerDatosLibro, tieneAcceso, ultimaPaginaLeida } from "./datos"
import { guardarProgreso } from "./progreso"

describe.skipIf(!hayEntorno)("lectura: datos, progreso y leads (Supabase local)", () => {
  const admin = clienteAdminPrueba()
  const slug = `prueba-${crypto.randomUUID().slice(0, 8)}`
  const config: ConfigLibro = {
    slug,
    titulo: "Libro de prueba",
    vistaPrevia: { desde: 1, hasta: 3 },
    capitulos: [
      { pagina: 1, titulo: "Uno" },
      { pagina: 6, titulo: "Dos" },
    ],
  }
  let bookId = ""
  let ana: SesionPrueba
  let beto: SesionPrueba
  const usuarioIds: string[] = []

  beforeAll(async () => {
    bookId = await guardarLibro(admin, config, 10)
    const emailAna = emailUnico("ana")
    await otorgarAcceso(admin, { email: emailAna, slug, origen: "cortesia" })
    ana = await sesionPara(admin, emailAna)
    beto = await sesionPara(admin, emailUnico("beto"))
    usuarioIds.push(ana.usuarioId, beto.usuarioId)
  })

  afterAll(async () => {
    await limpiarPrueba(admin, { bookIds: bookId ? [bookId] : [], usuarioIds })
  })

  it("obtenerDatosLibro devuelve el total, los capítulos en orden y el largo de la vista previa", async () => {
    expect(await obtenerDatosLibro(admin, slug)).toEqual({
      id: bookId,
      slug,
      titulo: "Libro de prueba",
      total: 10,
      capitulos: [
        { pagina: 1, titulo: "Uno" },
        { pagina: 6, titulo: "Dos" },
      ],
      ultimaPaginaVistaPrevia: 3,
    })
    expect(await obtenerDatosLibro(admin, "no-existe")).toBeNull()
  })

  it("solo quien tiene acceso lo tiene", async () => {
    expect(await tieneAcceso(ana.cliente, bookId)).toBe(true)
    expect(await tieneAcceso(beto.cliente, bookId)).toBe(false)
  })

  it("guarda y actualiza el progreso de quien tiene acceso", async () => {
    const puertos = puertosProgresoReales(ana.cliente)
    expect(await ultimaPaginaLeida(ana.cliente, bookId)).toBeNull()
    expect(await guardarProgreso({ slug, pagina: 4 }, puertos)).toBe(204)
    expect(await ultimaPaginaLeida(ana.cliente, bookId)).toBe(4)
    expect(await guardarProgreso({ slug, pagina: 7 }, puertos)).toBe(204)
    expect(await ultimaPaginaLeida(ana.cliente, bookId)).toBe(7)
  })

  it("rechaza el progreso de quien no tiene acceso (403) y de una página fuera del libro (400)", async () => {
    expect(await guardarProgreso({ slug, pagina: 2 }, puertosProgresoReales(beto.cliente))).toBe(403)
    expect(await guardarProgreso({ slug, pagina: 11 }, puertosProgresoReales(ana.cliente))).toBe(400)
    expect(await guardarProgreso({ slug: "no-existe", pagina: 1 }, puertosProgresoReales(ana.cliente))).toBe(404)
  })

  it("captura el lead una sola vez por email", async () => {
    const puertos = puertosLeadReales(admin)
    const email = emailUnico("curioso")
    expect(await capturarLead({ email: email.toUpperCase(), slug }, puertos)).toBe("ok")
    expect(await capturarLead({ email, slug }, puertos)).toBe("ok")

    const { data } = await admin.from("leads").select("email, origen").eq("book_id", bookId)
    expect(data).toEqual([{ email, origen: "vista-previa" }])
  })
})
```

Run: `npm run test:integracion`
Expected: PASS (incluye las de las tareas anteriores).

- [ ] **Step 8: Verificar y hacer commit**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa; el build lista `/leer/[slug]`, `/leer/[slug]/vista-previa` y `/api/progreso`, y `/` sigue siendo estática.

```bash
git add -A
git commit -m "feat: páginas del lector con progreso, vista previa gratuita y enlaces desde la landing" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Guía de producción, README y verificación final

**Files:**
- Create: `docs/supabase-produccion.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: la guía para publicar en un proyecto real de Supabase y la constancia de que el recorrido completo funciona con el libro real.

- [ ] **Step 1: Escribir la guía de producción**

`docs/supabase-produccion.md`:

````md
# Publicar el lector con un proyecto real de Supabase

En desarrollo todo corre con el Supabase local (Docker). Para publicar necesitas un proyecto en supabase.com.

## Lo que necesitas antes (cuentas del dueño)

- Una cuenta de Supabase. Crea un proyecto **nuevo**, separado del de AIVI: es otro producto con otros datos y otros permisos.
- Una cuenta de Resend con el dominio de la tienda verificado (registros SPF y DKIM en el DNS).
- El dominio de la tienda y una cuenta de Vercel.

## Pasos

1. **Crear el proyecto** en supabase.com. Elige una región cercana a tus lectores y guarda la contraseña de la base de datos.
2. **Aplicar el esquema.**
   ```bash
   supabase login
   supabase link --project-ref <ref-del-proyecto>
   supabase db push
   supabase db advisors --linked
   ```
   En el panel confirma que las 7 tablas tienen RLS activo y que el bucket `book-pages` es **privado**.
3. **Configurar Auth** (Authentication → URL Configuration): `Site URL` = `https://tu-dominio.com`. Si en la Tarea 5 comprobaste que `enable_signup = false` funciona, desactiva también "Allow new users to sign up" en el panel.
4. **Revisar la API de datos** (Integrations → Data API → Settings): las tablas nuevas no se exponen solas. Solo deben tener acceso las que otorga la migración.
5. **Variables en Vercel** (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SITE_URL` = `https://tu-dominio.com`
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (panel → API Keys → clave publicable)
   - `SUPABASE_SECRET_KEY` (clave secreta; márcala como sensible; jamás con prefijo `NEXT_PUBLIC_`)
   - `RESEND_API_KEY` y `EMAIL_FROM` (por ejemplo `Ebooks de Jhei Trujillo <acceso@tu-dominio.com>`)
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` (opcional)
   - **No** definas `CORREO_DEV`.
6. **Subir el libro al proyecto real.** Crea un archivo temporal `.env.produccion` con la URL y la clave secreta del proyecto, protégelo y úsalo solo para este comando:
   ```bash
   printf 'NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co\nSUPABASE_SECRET_KEY=<clave-secreta>\n' > .env.produccion
   chmod 600 .env.produccion
   node --env-file=.env.produccion --import tsx scripts/procesar-libro.ts "<ruta al PDF>" scripts/libros/si-dios-jugara-futbol.json
   rm .env.produccion
   ```
   Las variables que ya están puestas en el comando no las pisa `.env.local`.
7. **Dar acceso de cortesía** a los autores y a ti, de la misma forma:
   ```bash
   node --env-file=.env.produccion --import tsx scripts/dar-acceso.ts autor@ejemplo.com si-dios-jugara-futbol
   ```
8. **Probar de punta a punta** con un email real: pedir el enlace, abrirlo desde el celular, leer, cambiar de página y ver la marca de agua con tu email.

## Consumo a vigilar

Cada lector que termina el libro descarga todas las páginas (el tamaño total que mediste al procesar el libro, del orden de decenas de MB). El plan gratis de Supabase incluye 1 GB de almacenamiento y un tope mensual de transferencia; vigila el panel de uso cuando lleguen las primeras ventas y pasa a un plan de pago antes de agotarlo.

## Si cambias el PDF

Vuelve a correr el paso 6: reemplaza las imágenes y actualiza las filas (es idempotente). Si cambian las páginas de los capítulos, edita `scripts/libros/si-dios-jugara-futbol.json` antes.
````

- [ ] **Step 2: Actualizar el README**

En `README.md`, agrega esta sección antes de "## Contenido del libro":

````md
## Lector y accesos (Supabase local)

Requiere Docker Desktop encendido y poppler (`brew install poppler`).

    npm run db:start                # levanta Supabase local (la primera vez tarda)
    npm run env:local               # escribe .env.local con las claves locales
    npm run db:reset                # aplica las migraciones
    npm run libro:procesar -- "/ruta/Si Dios jugara futbol.pdf" scripts/libros/si-dios-jugara-futbol.json
    npm run acceso -- ana@ejemplo.com si-dios-jugara-futbol    # acceso de cortesía
    npm run dev

En desarrollo, el enlace de acceso no se envía por correo: se guarda en `out/correo-dev/` (permisos 600).

Pruebas: `npm test` (sin base de datos), `npm run test:integracion` (con Supabase local) y `npm run db:test` (RLS con pgTAP).

Para publicar con un proyecto real de Supabase, sigue `docs/supabase-produccion.md`.
````

- [ ] **Step 3: Correr toda la batería**

```bash
npm test && npm run typecheck && npm run lint && npm run build
npm run test:integracion
supabase test db
```

Expected: todo en verde (unitarias, tipos, lint, build, integración y pgTAP).

- [ ] **Step 4: Preparar la revisión de punta a punta**

```bash
rm -f out/correo-dev/*.txt
npm run acceso -- lector.e2e@ejemplo.com si-dios-jugara-futbol
```

Guarda este script **fuera del repositorio** (en el directorio temporal de la sesión), por ejemplo como `revision_lector.py`, y cambia `OUT` por esa carpeta:

```python
import glob, os, re, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:3100"
SLUG = "si-dios-jugara-futbol"
EMAIL = "lector.e2e@ejemplo.com"
OUT = "/tmp"  # carpeta donde guardar las capturas
resultados = []


def revisar(nombre, ok, detalle=""):
    resultados.append(ok)
    print(("PASA  " if ok else "FALLA ") + nombre + (f"  -> {detalle}" if detalle else ""))


def ultimo_enlace():
    for _ in range(40):
        archivos = sorted(glob.glob("out/correo-dev/*.txt"), key=os.path.getmtime)
        if archivos:
            return open(archivos[-1]).read().splitlines()[1]
        time.sleep(0.5)
    raise RuntimeError("no apareció el enlace en out/correo-dev")


def etiqueta(page):
    return page.locator("footer p[aria-live]").inner_text()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ---------- 1. Lector con sesión (celular) ----------
    movil = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
    page = movil.new_page()
    errores = []
    page.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)

    page.goto(URL + "/biblioteca")
    page.wait_for_load_state("networkidle")
    page.get_by_label("Tu email").fill(EMAIL)
    page.get_by_role("button", name="Enviarme el enlace").click()
    page.get_by_text("Revisa tu correo").wait_for()
    enlace = ultimo_enlace()
    revisar("pedir el enlace muestra el mensaje neutro y guarda el enlace en el archivo de desarrollo", "/auth/confirm?token_hash=" in enlace)

    page.goto(enlace)
    page.get_by_role("heading", name="Un paso más").wait_for()
    revisar("el enlace abre una pantalla con botón (no gasta el token al abrirse)", True)
    page.get_by_role("button", name="Entrar a mi biblioteca").click()
    page.get_by_text(f"Entraste como {EMAIL}").wait_for()
    page.screenshot(path=f"{OUT}/f2-biblioteca-movil.png")
    revisar("la sesión queda abierta y la biblioteca lista el libro", page.get_by_role("heading", name="Si Dios jugara fútbol").is_visible())

    page.get_by_role("link", name=re.compile("Empezar a leer|Seguir leyendo")).click()
    page.locator("img[alt^='Página ']").wait_for()
    imagen = page.locator("img[alt^='Página ']")
    revisar("la página se muestra desde una URL de objeto (blob:), no desde una URL directa", imagen.get_attribute("src").startswith("blob:"))
    revisar("la imagen tiene resolución suficiente", imagen.evaluate("e => e.naturalWidth") >= 1000, str(imagen.evaluate("e => e.naturalWidth")))
    page.screenshot(path=f"{OUT}/f2-lector-movil.png")

    page.keyboard.press("End")
    page.locator("img[alt='Página 240']").wait_for()
    page.keyboard.press("Home")
    page.locator("img[alt='Página 1']").wait_for()
    revisar("Inicio y Fin del teclado llegan a la primera y a la última página", True)

    page.get_by_role("button", name="Índice").click()
    page.get_by_role("button", name=re.compile("Minuto 01")).click()
    page.locator("img[alt='Página 17']").wait_for()
    page.screenshot(path=f"{OUT}/f2-pagina17-movil.png")
    revisar("el índice lleva al Minuto 01 (página 17)", etiqueta(page) == "Página 17 de 240", etiqueta(page))

    time.sleep(1.8)
    page.reload()
    page.locator("img[alt^='Página ']").wait_for()
    revisar("el progreso quedó guardado: al volver abre en la página 17", etiqueta(page) == "Página 17 de 240", etiqueta(page))

    # ---------- 2. Enlace de un solo uso y cierre de sesión ----------
    otro = browser.new_context()
    otra = otro.new_page()
    otra.goto(enlace)
    otra.get_by_role("button", name="Entrar a mi biblioteca").click()
    otra.wait_for_url("**/biblioteca?error=enlace")
    revisar("el enlace ya usado no sirve (un solo uso)", otra.get_by_role("alert").first.is_visible())
    otro.close()

    # ---------- 3. Límite de ritmo ----------
    estados = page.evaluate(
        "async () => { const s = []; for (let i = 0; i < 40; i++) { const r = await fetch('/api/paginas/si-dios-jugara-futbol/' + ((i % 200) + 1)); s.push(r.status) } return s }"
    )
    revisar("más de 30 páginas en un minuto devuelven 429", 429 in estados, f"{estados.count(200)} x 200 y {estados.count(429)} x 429")

    # ---------- 4. Cerrar sesión ----------
    page.goto(URL + "/biblioteca")
    page.get_by_role("button", name="Cerrar sesión").click()
    page.get_by_label("Tu email").wait_for()
    codigo = page.evaluate("async () => (await fetch('/api/paginas/si-dios-jugara-futbol/1')).status")
    revisar("sin sesión la API de páginas responde 401", codigo == 401, str(codigo))
    revisar("sin errores en la consola del navegador", len(errores) == 0, "; ".join(errores[:3]))

    # ---------- 5. Anónimo: lector protegido y vista previa ----------
    anonimo = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    a = anonimo.new_page()
    a.goto(URL + "/leer/" + SLUG)
    a.wait_for_url("**/biblioteca?next=*")
    revisar("el libro completo redirige a la biblioteca si no hay sesión", True)

    a.goto(URL + "/leer/" + SLUG + "/vista-previa")
    a.get_by_label("Tu email").fill("curioso@ejemplo.com")
    a.screenshot(path=f"{OUT}/f2-vista-previa-formulario.png")
    a.get_by_role("button", name="Abrir la vista previa").click()
    a.locator("img[alt^='Página ']").wait_for()
    revisar("la vista previa abre tras dejar el email", "Vista previa · página 1 de 22" in etiqueta(a), etiqueta(a))
    a.keyboard.press("End")
    a.get_by_role("link", name="Quiero el libro completo").wait_for()
    a.screenshot(path=f"{OUT}/f2-vista-previa-final.png")
    fuera = a.evaluate("async () => (await fetch('/api/vista-previa/si-dios-jugara-futbol/23')).status")
    revisar("la página 23 no es de la vista previa (403)", fuera == 403, str(fuera))
    anonimo.close()

    # ---------- 6. Computador ----------
    pc = browser.new_context(viewport={"width": 1280, "height": 800})
    c = pc.new_page()
    c.goto(URL + "/biblioteca")
    c.get_by_label("Tu email").fill(EMAIL)
    c.get_by_role("button", name="Enviarme el enlace").click()
    c.get_by_text("Revisa tu correo").wait_for()
    c.goto(ultimo_enlace())
    c.get_by_role("button", name="Entrar a mi biblioteca").click()
    c.get_by_role("link", name=re.compile("Empezar a leer|Seguir leyendo")).click()
    c.locator("img[alt^='Página ']").wait_for()
    c.screenshot(path=f"{OUT}/f2-lector-pc.png")

    browser.close()

print("\nRESULTADO:", "TODO PASA" if all(resultados) else "HAY FALLAS", f"({sum(resultados)}/{len(resultados)})")
```

Nota: la revisión 3 (límite de ritmo) gasta el cupo de 30 páginas por minuto del lector de prueba; por eso va después de las demás lecturas y el paso 6 usa un enlace nuevo (el límite de enlaces es de 3 cada 10 minutos por email: si repites el script varias veces seguidas, espera 10 minutos o cambia `EMAIL`).

- [ ] **Step 5: Ejecutar la revisión con el skill de pruebas web**

Usa el skill `webapp-testing`. Primero `python3 <skill>/scripts/with_server.py --help`, y luego, desde la raíz del repo (el script lee `out/correo-dev/`):

```bash
npm run build
python3 <ruta-del-skill>/scripts/with_server.py --server "CORREO_DEV=1 npx next start -p 3100" --port 3100 -- python3 revision_lector.py
```

Expected: cada línea `PASA` y al final `RESULTADO: TODO PASA (N/N)`. `CORREO_DEV=1` es necesario porque `next start` corre con `NODE_ENV=production`.

Si algo falla, corrige la causa (con su prueba, si es lógica) y repite el script antes de seguir. Casos conocidos:
- Tras iniciar sesión el navegador no conserva la sesión: la ruta `POST /auth/entrar` devuelve un `NextResponse.redirect` y las cookies de `crearClienteServidor()` no llegan a la respuesta. Copia las cookies al objeto de respuesta (`respuesta.cookies.set(...)`) desde el `setAll` del cliente, o arma el cliente dentro de la ruta con `createServerClient` y las cookies de la propia respuesta, como hace `refrescarSesion`.
- La marca de agua no se ve o sale con cuadritos: revisa que `estamparMarcaDeAgua` use `next/og` (no SVG con `sharp`).

- [ ] **Step 6: Revisar las capturas**

Abre con la herramienta de imágenes `f2-pagina17-movil.png`, `f2-lector-movil.png`, `f2-biblioteca-movil.png`, `f2-vista-previa-formulario.png`, `f2-vista-previa-final.png` y `f2-lector-pc.png`. Comprueba a ojo:

- La página 17 se ve completa en el celular, sin cortarse, con el email del lector en diagonal y **muy tenue** (se lee el libro sin esfuerzo).
- En la vista previa la página **no** lleva marca de agua.
- Los botones de página, el deslizador y el índice se ven con el look editorial (crema, verde cancha) y caben en 390 px sin scroll horizontal.
- En el computador la página se ve entera, centrada y sin deformarse.

- [ ] **Step 7: Limpiar y actualizar la memoria del proyecto**

```bash
rm -f out/correo-dev/*.txt
git status --short
```

Expected: el árbol solo muestra los cambios de esta tarea (README y la guía).

Actualiza el archivo de memoria `tienda-ebooks-contexto.md` (carpeta de memoria del proyecto): cambia la línea de **Estado** para decir que la Fase 2 (lector y protección) quedó construida y verificada con el Supabase local, que faltan la Fase 3 (pagos, emails, Pixel/CAPI) y la Fase 4 (admin, legales, dominio), y que para publicar hay que seguir `docs/supabase-produccion.md`. Agrega estas dos decisiones que no se deducen del código: el enlace mágico lo genera el servidor y lo envía Resend (por la restricción de plantillas del plan gratis de Supabase desde el 3 de junio de 2026) y las páginas del libro se recortan a la TrimBox de 150 × 240 mm.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "docs: guía de producción con Supabase, README y verificación final del lector" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```



