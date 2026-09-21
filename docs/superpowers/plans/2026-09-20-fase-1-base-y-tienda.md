# Fase 1 — Base y tienda: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar publicable la landing editorial de *Si Dios jugara fútbol* con links por canal (`/ig`, `/tiktok`, `/wa`, `/qr`), vista previa al compartir y generador de QR, sin pagos ni lector todavía.

**Architecture:** Next.js (App Router) con el catálogo de libros en un módulo tipado dentro del repo (`src/content`), que en la Fase 2 se reemplaza por Supabase sin tocar los componentes (todos reciben un `Book`). La landing es una composición de secciones pequeñas de servidor. Los redirects de canal son route handlers 307 (temporales, sin caché) para que el QR impreso pueda cambiar de destino.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS v4, Vitest + Testing Library, `qrcode`, `sharp`, `jsqr` (solo tests), `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-20-tienda-ebooks-design.md` (secciones 5, 9 y 11; fase 1 de la sección 14)

## Global Constraints

- Idioma de toda la interfaz y el copy: español neutro latinoamericano.
- Look editorial cálido: fondo crema `#f6f0e4`, tinta `#1d1a16`, acento verde cancha `#1f5a3d`, detalles dorados (`#8a6420` para texto, `#b8893a` decorativo). **No aplica el dark mode del proyecto AIVI**: esta tienda es un proyecto aparte y el dueño eligió el look claro.
- Tipografía: Fraunces (serif, títulos) e Inter (sans, texto) cargadas con `next/font/google`.
- Diseño primero para celular: la página debe verse bien a 390 px de ancho, con márgenes laterales de 16 px y sin scroll horizontal.
- Precio de lanzamiento: US$19.99 (`precioUsd`), configurable. El precio en COP (`precioCop`) es independiente, sin conversión automática.
- Garantía de 7 días.
- Los redirects de canal usan estado **307** con `Cache-Control: no-store`.
- Imágenes compartibles en formato 9:16 (la tarjeta de historias mide 1080 × 1920).
- Nunca inventar afirmaciones sobre el libro: todo texto sobre el libro y sus autores sale del propio PDF (`Si Dios jugara futbol.pdf`). Lo que no se pueda respaldar con el libro no se publica.
- Autoría: los autores son Juan Guillermo Ricaurte y Jeins Durán. Jhei Trujillo es el editor y distribuidor, y su marca es el nombre de la tienda ("Ebooks de Jhei Trujillo"). No es el autor.
- Todos los commits terminan con `-m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"` como segundo mensaje.
- Gestor de paquetes: npm.

## Fuera de este plan (van en otras fases)

Lector y capítulo gratis (Fase 2). Pagos, emails, Meta Pixel, CAPI y GA4 (Fase 3). `/admin`, páginas legales, favicon propio, dominio y claves reales (Fase 4). El PDF trae solo el interior (con marcas de corte de imprenta), sin portada: la portada real se conecta cuando el dueño entregue el archivo, poniendo su ruta en `portada` de `src/content/books.ts`. Mientras tanto se usa la portada generada con texto.

## Estructura de archivos

```
src/
  app/
    layout.tsx                 fuentes, metadata base, <html lang="es">
    globals.css                tokens de color, fuentes y efecto 3D de la portada
    page.tsx                   landing del libro destacado
    libro/[slug]/page.tsx      landing de cualquier libro del catálogo
    opengraph-image.tsx        imagen 1200×630 al compartir
    ig/route.ts  tiktok/route.ts  wa/route.ts  qr/route.ts
  components/
    ui/button.tsx              Button y ButtonLink
    book/cover.tsx             portada real o generada
    book/hero.tsx  audience.tsx  contents.tsx  author.tsx
    book/testimonials.tsx  guarantee.tsx  faq.tsx  purchase-panel.tsx
    book/sticky-buy-bar.tsx    barra fija de compra en celular
    book/book-landing.tsx      compone todas las secciones
  content/
    types.ts                   tipo Book
    books.ts                   catálogo y funciones de consulta
  lib/
    site.ts                    getSiteUrl()
    format-price.ts            formatPrice()
    channels.ts                CHANNELS y channelUrl()
    channel-redirect.ts        channelRedirect()
    whatsapp.ts                buildWhatsappUrl()
    book-metadata.ts           bookMetadata()
    qr.ts                      generateQrAssets(), wrapText(), escapeXml()
  test/fixtures.ts             makeBook() para tests
scripts/generar-qr.ts          genera PNG, SVG y tarjeta 9:16
vitest.config.mts  vitest.setup.ts  .env.example  README.md
```

---

### Task 0: Documentos y rama de trabajo

**Files:**
- Create: (ya existen sin commit) `docs/superpowers/specs/2026-09-20-tienda-ebooks-design.md`, `docs/superpowers/plans/2026-09-20-fase-1-base-y-tienda.md`

**Interfaces:**
- Produces: rama `feat/tienda-base` desde la que trabajan todas las tareas siguientes.

- [ ] **Step 1: Confirmar el estado del repo**

Run: `cd /Users/jheitrujillo/Proyectos/ebooks/ebooks && git status --short && git branch --show-current`
Expected: solo aparece `?? docs/` y la rama es `main` sin commits.

- [ ] **Step 2: Commit inicial con los documentos (el repo está vacío, no hay nada que proteger en `main`)**

```bash
git add docs
git commit -m "docs: diseño de la tienda de ebooks y plan de la fase 1" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Crear la rama de trabajo**

Run: `git switch -c feat/tienda-base && git branch --show-current`
Expected: `feat/tienda-base`

---

### Task 1: Proyecto base, pruebas y layout

**Files:**
- Create: `vitest.config.mts`, `vitest.setup.ts`, `.env.example`, `src/lib/site.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `.gitignore`, `package.json`
- Test: `src/lib/site.test.ts`

**Interfaces:**
- Produces: `getSiteUrl(env?: Record<string, string | undefined>): string` (sin barra final, por defecto `http://localhost:3000`). Clases de Tailwind `bg-papel`, `bg-papel-oscuro`, `text-tinta`, `text-tinta-suave`, `bg-cancha`, `bg-cancha-oscuro`, `text-dorado`, `text-dorado-claro`, `border-linea`, `font-serif`, `font-sans`, `shadow-portada`, y la clase CSS `.cover-tilt`.

- [ ] **Step 1: Crear el proyecto Next.js en la carpeta actual**

```bash
cd /Users/jheitrujillo/Proyectos/ebooks/ebooks
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

Expected: se crean `package.json`, `src/app/`, `public/`, etc. y `docs/` queda intacto. Si el comando se niega por archivos existentes, crea el proyecto en una carpeta temporal del scratchpad con los mismos flags y copia todo (menos `.git`) a esta carpeta.

- [ ] **Step 2: Quitar los archivos de ejemplo e instalar las dependencias de prueba**

```bash
rm -f public/*.svg
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.typecheck="tsc --noEmit"
```

- [ ] **Step 3: Crear la configuración de Vitest**

`vitest.config.mts`:

```ts
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
```

`vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(() => cleanup())
```

- [ ] **Step 4: Escribir el test que falla de `getSiteUrl`**

`src/lib/site.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { getSiteUrl } from "./site"

describe("getSiteUrl", () => {
  it("usa localhost cuando no hay variable", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3000")
  })

  it("usa NEXT_PUBLIC_SITE_URL", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://tienda.ejemplo.com" })).toBe(
      "https://tienda.ejemplo.com",
    )
  })

  it("quita la barra final y los espacios", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "  https://tienda.ejemplo.com/  " })).toBe(
      "https://tienda.ejemplo.com",
    )
  })

  it("trata una cadena vacía como ausente", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "   " })).toBe("http://localhost:3000")
  })
})
```

- [ ] **Step 5: Ejecutar y ver que falla**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./site"`.

- [ ] **Step 6: Implementar `getSiteUrl`**

`src/lib/site.ts`:

```ts
const DEFAULT_SITE_URL = "http://localhost:3000"

export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}
```

- [ ] **Step 7: Ejecutar y ver que pasa**

Run: `npm test`
Expected: PASS — 4 tests.

- [ ] **Step 8: Reemplazar estilos globales por los tokens editoriales**

`src/app/globals.css` (reemplaza todo el contenido; se elimina a propósito el esquema oscuro que trae el proyecto por defecto):

```css
@import "tailwindcss";

@theme {
  --color-papel: #f6f0e4;
  --color-papel-oscuro: #ece3d0;
  --color-tinta: #1d1a16;
  --color-tinta-suave: #5b5347;
  --color-cancha: #1f5a3d;
  --color-cancha-oscuro: #163f2b;
  --color-dorado: #8a6420;
  --color-dorado-claro: #b8893a;
  --color-linea: #dccfb4;

  --font-serif: var(--font-fraunces), Georgia, serif;
  --font-sans: var(--font-inter), system-ui, sans-serif;

  --shadow-portada:
    0 30px 60px -20px rgb(29 26 22 / 0.45), 0 8px 16px -8px rgb(29 26 22 / 0.3);
}

:root {
  color-scheme: light;
}

html {
  background: var(--color-papel);
}

@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}

.cover-tilt {
  transition: transform 400ms ease;
  transform-style: preserve-3d;
}

@media (prefers-reduced-motion: no-preference) and (hover: hover) {
  .cover-tilt:hover {
    transform: perspective(1200px) rotateY(-10deg) rotateX(3deg) scale(1.02);
  }
}
```

- [ ] **Step 9: Layout con fuentes y metadata base**

`src/app/layout.tsx` (reemplaza todo):

```tsx
import type { Metadata } from "next"
import { Fraunces, Inter } from "next/font/google"
import { getSiteUrl } from "@/lib/site"
import "./globals.css"

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Ebooks de Jhei Trujillo",
  description: "Libros digitales para leer en línea.",
  openGraph: { siteName: "Ebooks de Jhei Trujillo", locale: "es_LA", type: "website" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-papel font-sans text-tinta antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 10: Página provisional (se reemplaza en la Tarea 6)**

`src/app/page.tsx` (reemplaza todo):

```tsx
export default function Home() {
  return <main className="p-8 font-serif text-3xl">Tienda de ebooks</main>
}
```

- [ ] **Step 11: Variables de entorno y `.gitignore`**

`.env.example`:

```
# URL pública de la tienda, sin barra final. Se usa para la vista previa al compartir (Open Graph).
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Número de WhatsApp con código de país, solo dígitos (ejemplo: 573001234567). Si se deja vacío, no aparece el botón.
NEXT_PUBLIC_WHATSAPP_NUMBER=
```

Agregar al final de `.gitignore` (el patrón `.env*` del proyecto ignoraría también el ejemplo):

```
!.env.example
/out
```

- [ ] **Step 12: Verificar compilación, tipos y lint**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: los tres terminan sin errores (el build descarga las fuentes de Google, necesita internet).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: proyecto Next.js con Vitest, tokens editoriales y layout base" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Datos del libro y formato de precio

**Files:**
- Create: `src/content/types.ts`, `src/content/books.ts`, `src/lib/format-price.ts`, `src/test/fixtures.ts`
- Test: `src/content/books.test.ts`, `src/lib/format-price.test.ts`

**Interfaces:**
- Produces:
  - `type Testimonial = { nombre: string; texto: string; detalle?: string }`
  - `type FaqItem = { pregunta: string; respuesta: string }`
  - `type Book = { slug; titulo; subtitulo; autor; sinopsis: string; portada: string | null; precioUsd: number; precioCop: number; paraQuien: string[]; encontraras: { titulo: string; descripcion: string }[]; sobreLosAutores: string; garantiaDias: number; anioPublicacion: number; testimonios: Testimonial[]; faq: FaqItem[] }` (`sinopsis` admite varios párrafos separados por una línea en blanco)
  - `FEATURED_SLUG: string`, `books: Book[]`, `getBook(slug: string): Book | undefined`, `getFeaturedBook(): Book`
  - `type Currency = "USD" | "COP"`, `formatPrice(amount: number, currency: Currency): string`
  - `makeBook(overrides?: Partial<Book>): Book` (solo para tests)

- [ ] **Step 1: Escribir los tests que fallan**

`src/lib/format-price.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { formatPrice } from "./format-price"

describe("formatPrice", () => {
  it("formatea dólares con dos decimales", () => {
    expect(formatPrice(19.99, "USD")).toBe("US$19.99")
    expect(formatPrice(5, "USD")).toBe("US$5.00")
  })

  it("formatea pesos con puntos de miles y sin decimales", () => {
    expect(formatPrice(79900, "COP")).toBe("$79.900 COP")
    expect(formatPrice(1234567, "COP")).toBe("$1.234.567 COP")
    expect(formatPrice(900, "COP")).toBe("$900 COP")
  })
})
```

`src/content/books.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { FEATURED_SLUG, books, getBook, getFeaturedBook } from "./books"

describe("catálogo de libros", () => {
  it("el libro destacado existe", () => {
    expect(getFeaturedBook().slug).toBe(FEATURED_SLUG)
  })

  it("getBook devuelve undefined para un slug desconocido", () => {
    expect(getBook("no-existe")).toBeUndefined()
  })

  it("los slugs son únicos", () => {
    const slugs = books.map((b) => b.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it("cada libro tiene precios y garantía válidos", () => {
    for (const book of books) {
      expect(book.precioUsd).toBeGreaterThan(0)
      expect(book.precioCop).toBeGreaterThan(0)
      expect(book.garantiaDias).toBeGreaterThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven `./format-price` ni `./books`.

- [ ] **Step 3: Implementar el tipo, el formato de precio y el fixture**

`src/content/types.ts`:

```ts
export type Testimonial = { nombre: string; texto: string; detalle?: string }

export type FaqItem = { pregunta: string; respuesta: string }

export type Book = {
  slug: string
  titulo: string
  subtitulo: string
  autor: string
  sinopsis: string
  /** Ruta dentro de /public (por ejemplo "/portada.webp"). Con null se genera una portada de texto. */
  portada: string | null
  /** Precio en dólares. */
  precioUsd: number
  /** Precio en pesos colombianos, fijado a mano (no se convierte del dólar). */
  precioCop: number
  paraQuien: string[]
  encontraras: { titulo: string; descripcion: string }[]
  sobreLosAutores: string
  garantiaDias: number
  /** Año de la edición impresa: es el año del copyright que se muestra en el pie de página. */
  anioPublicacion: number
  testimonios: Testimonial[]
  faq: FaqItem[]
}
```

`src/lib/format-price.ts`:

```ts
export type Currency = "USD" | "COP"

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "USD") return `US$${amount.toFixed(2)}`
  const entero = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `$${entero} COP`
}
```

`src/test/fixtures.ts`:

```ts
import type { Book } from "@/content/types"

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    slug: "libro-de-prueba",
    titulo: "Libro de Prueba",
    subtitulo: "Un subtítulo de prueba",
    autor: "Autora Prueba",
    sinopsis: "Sinopsis de prueba.",
    portada: null,
    precioUsd: 19.99,
    precioCop: 79900,
    paraQuien: ["Quieres leer algo", "Buscas inspiración"],
    encontraras: [
      { titulo: "Capítulo uno", descripcion: "Descripción uno" },
      { titulo: "Capítulo dos", descripcion: "Descripción dos" },
    ],
    sobreLosAutores: "Bio de prueba.",
    garantiaDias: 7,
    anioPublicacion: 2026,
    testimonios: [],
    faq: [{ pregunta: "¿Cómo leo el libro?", respuesta: "En línea." }],
    ...overrides,
  }
}
```

- [ ] **Step 4: Implementar el catálogo con contenido de prueba**

`src/content/books.ts`:

```ts
import type { Book } from "./types"

export const FEATURED_SLUG = "si-dios-jugara-futbol"

// Los textos salen del propio libro (Si Dios jugara futbol.pdf, primera edición, junio de 2026).
// testimonios va vacío a propósito: el "Camerino" del libro trae comentarios de futbolistas con nombre,
// y usarlos en una página de ventas requiere el visto bueno del dueño. Con la lista vacía la sección no se muestra.
// portada es null hasta que el dueño entregue el archivo de la portada: mientras tanto se genera con texto.
// precioCop es un valor de prueba: el dueño debe fijar el precio real antes de lanzar.
const siDiosJugaraFutbol: Book = {
  slug: FEATURED_SLUG,
  titulo: "Si Dios jugara fútbol",
  subtitulo:
    "45 relatos, uno por cada minuto del primer tiempo, para que te pongas los guayos y juegues el partido de tu vida.",
  autor: "Juan Guillermo Ricaurte y Jeins Durán",
  sinopsis: [
    "Medellín, 2011. Juan Guillermo Ricaurte conduce un viejo Mazda azul cargado de tablones y pide que no se lo encuentre el bus del Atlético Nacional. Hace poco, el estadio entero gritaba su nombre; hoy vive con su esposa y sus dos hijas en una sola pieza. ¿Cómo llegó hasta ahí?",
    "Para responderlo, el libro vuelve a Cisneros, el pueblo del ferrocarril donde un niño vendía avena fría a los pasajeros del tren y soñaba con jugar en el verde. Pasa por la gloria en el Nacional, por las lesiones y las sombras que llegaron con ella, y por el encuentro que lo cambió todo.",
    "Está escrito como el primer tiempo de un partido: 45 relatos breves, uno por minuto. Al final de cada uno, una invitación a ponerte los guayos y jugar en la cancha de tu propia vida. Puedes leer un minuto al día o jugarte todo el tiempo de corrido.",
  ].join("\n\n"),
  portada: null,
  precioUsd: 19.99,
  precioCop: 79900,
  paraQuien: [
    "Amas el fútbol y quieres conocer la historia detrás de la camiseta 14 del Atlético Nacional.",
    "Sientes que tu mejor momento ya pasó y necesitas recordar que el partido no se acaba hasta el pitazo final.",
    "Buscas una lectura para tu fe, en relatos breves que puedes leer un minuto al día.",
    "Te inspiran las historias reales de familia, esfuerzo y segundas oportunidades.",
  ],
  encontraras: [
    {
      titulo: "45 relatos, 45 minutos",
      descripcion:
        "Cada capítulo es un minuto del primer tiempo: una escena real, breve y lista para leer en cualquier momento.",
    },
    {
      titulo: "De la cancha al estadio y al ángel azul",
      descripcion:
        "De Cisneros al Atlético Nacional, del Mazda azul de 2011 y hasta el regreso al estadio Atanasio Girardot ante más de 45.000 personas.",
    },
    {
      titulo: "Ponte los guayos",
      descripcion:
        "Al final de cada relato, una invitación a jugar tu propio partido en la cancha multicolor de tu vida.",
    },
  ],
  sobreLosAutores:
    "Juan Guillermo Ricaurte, \"Juanchi\", nació en Cisneros, Antioquia, en 1976. Jugó en el Atlético Nacional con la camiseta 14 y hoy es pastor en Medellín, donde acompaña a familias y a deportistas, entre ellos jugadores de la Selección Colombia. Jeins Durán es coautor y editor del libro: dio forma escrita a cada una de las vivencias que lo componen.",
  garantiaDias: 7,
  anioPublicacion: 2026,
  testimonios: [],
  faq: [
    {
      pregunta: "¿Cómo leo el libro?",
      respuesta:
        "Al pagar recibes un email con un enlace de acceso. Lees en línea, desde tu celular o tu computador, sin descargar nada.",
    },
    {
      pregunta: "¿Puedo descargar el PDF?",
      respuesta:
        "No. El libro se lee solo en línea y cada página lleva tu email para cuidar el trabajo de los autores.",
    },
    {
      pregunta: "¿Qué hago si no me llega el email?",
      respuesta:
        "Entra a Mi biblioteca con el email que usaste al comprar y te enviamos un enlace nuevo al instante.",
    },
    {
      pregunta: "¿Y si no es lo que esperaba?",
      respuesta:
        "Tienes 7 días de garantía. Escríbenos dentro de ese plazo y te devolvemos tu dinero.",
    },
  ],
}

export const books: Book[] = [siDiosJugaraFutbol]

export function getBook(slug: string): Book | undefined {
  return books.find((book) => book.slug === slug)
}

export function getFeaturedBook(): Book {
  const book = getBook(FEATURED_SLUG)
  if (!book) throw new Error(`No existe el libro destacado "${FEATURED_SLUG}" en el catálogo`)
  return book
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS — todos los tests, incluidos los de la Tarea 1.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: catálogo de libros con contenido de prueba y formato de precio" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Links por canal y WhatsApp

**Files:**
- Create: `src/lib/channels.ts`, `src/lib/channel-redirect.ts`, `src/lib/whatsapp.ts`, `src/app/ig/route.ts`, `src/app/tiktok/route.ts`, `src/app/wa/route.ts`, `src/app/qr/route.ts`
- Test: `src/lib/channels.test.ts`, `src/lib/whatsapp.test.ts`, `src/app/canales.test.ts`

**Interfaces:**
- Produces:
  - `CHANNELS`, `type ChannelKey = "ig" | "tiktok" | "wa" | "qr"`, `channelUrl(channel: ChannelKey, origin: string): string`
  - `channelRedirect(channel: ChannelKey): (request: Request) => Response`
  - `buildWhatsappUrl(number: string, message: string): string | null`

- [ ] **Step 1: Escribir los tests que fallan**

`src/lib/channels.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { channelUrl } from "./channels"

describe("channelUrl", () => {
  it("arma la URL de Instagram con sus UTM", () => {
    expect(channelUrl("ig", "http://localhost:3000")).toBe(
      "http://localhost:3000/?utm_source=instagram&utm_medium=bio&utm_campaign=tienda",
    )
  })

  it("arma la URL de cada canal con su fuente y medio", () => {
    expect(channelUrl("tiktok", "https://t.ejemplo.com")).toBe(
      "https://t.ejemplo.com/?utm_source=tiktok&utm_medium=bio&utm_campaign=tienda",
    )
    expect(channelUrl("wa", "https://t.ejemplo.com")).toBe(
      "https://t.ejemplo.com/?utm_source=whatsapp&utm_medium=chat&utm_campaign=tienda",
    )
    expect(channelUrl("qr", "https://t.ejemplo.com")).toBe(
      "https://t.ejemplo.com/?utm_source=qr&utm_medium=offline&utm_campaign=tienda",
    )
  })
})
```

`src/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildWhatsappUrl } from "./whatsapp"

describe("buildWhatsappUrl", () => {
  it("deja solo dígitos y codifica el mensaje", () => {
    expect(buildWhatsappUrl("+57 300 123 4567", "Hola, ¿qué tal?")).toBe(
      "https://wa.me/573001234567?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F",
    )
  })

  it("quita los ceros iniciales", () => {
    expect(buildWhatsappUrl("0057300123", "Hola")).toBe("https://wa.me/57300123?text=Hola")
  })

  it("devuelve null si no hay número", () => {
    expect(buildWhatsappUrl("", "Hola")).toBeNull()
    expect(buildWhatsappUrl("   ", "Hola")).toBeNull()
  })
})
```

`src/app/canales.test.ts`:

```ts
// @vitest-environment node
import { describe, expect, it } from "vitest"
import { GET as ig } from "./ig/route"
import { GET as qr } from "./qr/route"
import { GET as tiktok } from "./tiktok/route"
import { GET as wa } from "./wa/route"

const origen = "http://localhost:3000"

describe("rutas de canal", () => {
  it.each([
    ["/ig", ig, "instagram", "bio"],
    ["/tiktok", tiktok, "tiktok", "bio"],
    ["/wa", wa, "whatsapp", "chat"],
    ["/qr", qr, "qr", "offline"],
  ])("%s redirige con 307 a la tienda con sus UTM", (ruta, handler, fuente, medio) => {
    const res = handler(new Request(`${origen}${ruta}`))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(
      `${origen}/?utm_source=${fuente}&utm_medium=${medio}&utm_campaign=tienda`,
    )
  })

  it("no permite guardar la redirección en caché", () => {
    const res = qr(new Request(`${origen}/qr`))
    expect(res.headers.get("cache-control")).toBe("no-store")
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven `./channels`, `./whatsapp`, `./ig/route`, etc.

- [ ] **Step 3: Implementar los helpers**

`src/lib/channels.ts`:

```ts
export const CHANNELS = {
  ig: { source: "instagram", medium: "bio" },
  tiktok: { source: "tiktok", medium: "bio" },
  wa: { source: "whatsapp", medium: "chat" },
  qr: { source: "qr", medium: "offline" },
} as const satisfies Record<string, { source: string; medium: string }>

export type ChannelKey = keyof typeof CHANNELS

const CAMPAIGN = "tienda"

export function channelUrl(channel: ChannelKey, origin: string): string {
  const { source, medium } = CHANNELS[channel]
  const url = new URL("/", origin)
  url.searchParams.set("utm_source", source)
  url.searchParams.set("utm_medium", medium)
  url.searchParams.set("utm_campaign", CAMPAIGN)
  return url.toString()
}
```

`src/lib/channel-redirect.ts`:

```ts
import { NextResponse } from "next/server"
import { type ChannelKey, channelUrl } from "./channels"

/**
 * Redirección temporal (307) y sin caché: así el destino de un QR impreso puede cambiar sin reimprimir.
 */
export function channelRedirect(channel: ChannelKey) {
  return function GET(request: Request): Response {
    const response = NextResponse.redirect(channelUrl(channel, new URL(request.url).origin), 307)
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}
```

`src/lib/whatsapp.ts`:

```ts
export function buildWhatsappUrl(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "").replace(/^0+/, "")
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 4: Crear las cuatro rutas**

`src/app/ig/route.ts`:

```ts
import { channelRedirect } from "@/lib/channel-redirect"

export const GET = channelRedirect("ig")
```

`src/app/tiktok/route.ts`:

```ts
import { channelRedirect } from "@/lib/channel-redirect"

export const GET = channelRedirect("tiktok")
```

`src/app/wa/route.ts`:

```ts
import { channelRedirect } from "@/lib/channel-redirect"

export const GET = channelRedirect("wa")
```

`src/app/qr/route.ts`:

```ts
import { channelRedirect } from "@/lib/channel-redirect"

export const GET = channelRedirect("qr")
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: links por canal con UTM y helper de WhatsApp" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Botones y portada

**Files:**
- Create: `src/components/ui/button.tsx`, `src/components/book/cover.tsx`
- Test: `src/components/ui/button.test.tsx`, `src/components/book/cover.test.tsx`

**Interfaces:**
- Consumes: tokens de color y `shadow-portada` de la Tarea 1.
- Produces:
  - `Button(props: ComponentProps<"button"> & { variant?: "primary" | "secondary" })`
  - `ButtonLink(props: ComponentProps<"a"> & { variant?: "primary" | "secondary" })`
  - `Cover({ titulo, autor, src }: { titulo: string; autor: string; src: string | null })`

- [ ] **Step 1: Escribir los tests que fallan**

`src/components/ui/button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button, ButtonLink } from "./button"

describe("Button", () => {
  it("renderiza un botón con su texto", () => {
    render(<Button>Pagar</Button>)
    expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled()
  })

  it("respeta disabled", () => {
    render(<Button disabled>Pagar</Button>)
    expect(screen.getByRole("button", { name: "Pagar" })).toBeDisabled()
  })
})

describe("ButtonLink", () => {
  it("renderiza un enlace con su href", () => {
    render(<ButtonLink href="#comprar">Comprar</ButtonLink>)
    expect(screen.getByRole("link", { name: "Comprar" })).toHaveAttribute("href", "#comprar")
  })
})
```

`src/components/book/cover.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Cover } from "./cover"

describe("Cover", () => {
  it("genera una portada de texto cuando no hay imagen", () => {
    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" src={null} />)
    const portada = screen.getByRole("img", { name: "Portada de Libro de Prueba" })
    expect(portada).toHaveTextContent("Libro de Prueba")
    expect(portada).toHaveTextContent("Autora Prueba")
  })

  it("muestra la imagen cuando hay portada", () => {
    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" src="/portada.webp" />)
    expect(screen.getByAltText("Portada de Libro de Prueba")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven `./button` ni `./cover`.

- [ ] **Step 3: Implementar los botones**

`src/components/ui/button.tsx`:

```tsx
import type { ComponentProps } from "react"

type Variant = "primary" | "secondary"

const base =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cancha disabled:cursor-not-allowed disabled:opacity-50"

const variants: Record<Variant, string> = {
  primary: "bg-cancha text-white enabled:hover:bg-cancha-oscuro",
  secondary: "border border-cancha text-cancha enabled:hover:bg-cancha/10",
}

function classes(variant: Variant, extra?: string) {
  return `${base} ${variants[variant]}${extra ? ` ${extra}` : ""}`
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={classes(variant, className)} {...props} />
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return <a className={classes(variant, className)} {...props} />
}
```

- [ ] **Step 4: Implementar la portada**

`src/components/book/cover.tsx`:

```tsx
import Image from "next/image"

type CoverProps = { titulo: string; autor: string; src: string | null }

export function Cover({ titulo, autor, src }: CoverProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={`Portada de ${titulo}`}
        width={800}
        height={1200}
        priority
        className="h-auto w-full rounded-md shadow-portada"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`Portada de ${titulo}`}
      className="flex aspect-[2/3] w-full flex-col justify-between rounded-md bg-cancha-oscuro p-6 text-papel shadow-portada"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dorado-claro">
        {autor}
      </span>
      <span className="font-serif text-3xl leading-tight text-balance">{titulo}</span>
      <span aria-hidden className="h-px w-12 bg-dorado-claro" />
    </div>
  )
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: botones y portada con versión generada" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Secciones de contenido de la landing

**Files:**
- Create: `src/components/book/hero.tsx`, `src/components/book/audience.tsx`, `src/components/book/contents.tsx`, `src/components/book/author.tsx`
- Test: `src/components/book/content-sections.test.tsx`

**Interfaces:**
- Consumes: `Book` (Tarea 2), `formatPrice` (Tarea 2), `Cover` y `ButtonLink` (Tarea 4), `makeBook` (Tarea 2).
- Produces: `Hero`, `Audience`, `Contents`, `Author`, cada una como `({ book }: { book: Book }) => JSX`. `Hero` renderiza la sección con `id="hero"` y un enlace a `#comprar`.

- [ ] **Step 1: Escribir los tests que fallan**

`src/components/book/content-sections.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { Audience } from "./audience"
import { Author } from "./author"
import { Contents } from "./contents"
import { Hero } from "./hero"

const book = makeBook()

describe("Hero", () => {
  it("muestra el título como encabezado principal", () => {
    render(<Hero book={book} />)
    expect(screen.getByRole("heading", { level: 1, name: "Libro de Prueba" })).toBeInTheDocument()
    expect(screen.getByText("Un subtítulo de prueba")).toBeInTheDocument()
  })

  it("enlaza a la sección de compra con el precio", () => {
    render(<Hero book={book} />)
    const enlace = screen.getByRole("link", { name: /comprar ahora/i })
    expect(enlace).toHaveAttribute("href", "#comprar")
    expect(enlace).toHaveTextContent("US$19.99")
  })

  it("muestra la portada y la garantía", () => {
    render(<Hero book={book} />)
    expect(screen.getByRole("img", { name: "Portada de Libro de Prueba" })).toBeInTheDocument()
    expect(screen.getByText(/garantía de 7 días/i)).toBeInTheDocument()
  })
})

describe("Audience", () => {
  it("lista cada situación", () => {
    render(<Audience book={book} />)
    expect(screen.getByText("Quieres leer algo")).toBeInTheDocument()
    expect(screen.getByText("Buscas inspiración")).toBeInTheDocument()
  })
})

describe("Contents", () => {
  it("muestra la sinopsis y cada aprendizaje", () => {
    render(<Contents book={book} />)
    expect(screen.getByText("Sinopsis de prueba.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 4, name: "Capítulo uno" })).toBeInTheDocument()
    expect(screen.getByText("Descripción dos")).toBeInTheDocument()
  })

  it("separa la sinopsis en un párrafo por cada línea en blanco", () => {
    render(<Contents book={makeBook({ sinopsis: "Primer párrafo.\n\nSegundo párrafo." })} />)
    expect(screen.getByText("Primer párrafo.")).toBeInTheDocument()
    expect(screen.getByText("Segundo párrafo.")).toBeInTheDocument()
  })
})

describe("Author", () => {
  it("muestra el nombre y la biografía", () => {
    render(<Author book={book} />)
    expect(screen.getByRole("heading", { name: "Sobre los autores" })).toBeInTheDocument()
    expect(screen.getByText("Autora Prueba")).toBeInTheDocument()
    expect(screen.getByText("Bio de prueba.")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven `./hero`, `./audience`, `./contents`, `./author`.

- [ ] **Step 3: Implementar las cuatro secciones**

`src/components/book/hero.tsx`:

```tsx
import { ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"
import { Cover } from "./cover"

export function Hero({ book }: { book: Book }) {
  return (
    <section
      id="hero"
      className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-2 md:gap-16 md:pt-20"
    >
      <div className="mx-auto w-3/4 max-w-xs md:order-2 md:w-full md:max-w-sm">
        <div className="cover-tilt">
          <Cover titulo={book.titulo} autor={book.autor} src={book.portada} />
        </div>
      </div>
      <div className="text-center md:text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dorado">{book.autor}</p>
        <h1 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">
          {book.titulo}
        </h1>
        <p className="mt-4 text-pretty text-lg text-tinta-suave">{book.subtitulo}</p>
        <div className="mt-8 flex flex-col items-center gap-3 md:items-start">
          <ButtonLink href="#comprar">
            Comprar ahora · {formatPrice(book.precioUsd, "USD")}
          </ButtonLink>
          <p className="text-sm text-tinta-suave">
            Lectura en línea · Garantía de {book.garantiaDias} días
          </p>
        </div>
      </div>
    </section>
  )
}
```

`src/components/book/audience.tsx`:

```tsx
import type { Book } from "@/content/types"

export function Audience({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Este libro es para ti si…</h2>
      <ul className="mt-8 space-y-4">
        {book.paraQuien.map((item) => (
          <li key={item} className="flex gap-4 text-lg">
            <span aria-hidden className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-cancha" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

`src/components/book/contents.tsx`:

```tsx
import type { Book } from "@/content/types"

export function Contents({ book }: { book: Book }) {
  return (
    <section className="bg-papel-oscuro">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-serif text-3xl sm:text-4xl">De qué trata</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-tinta-suave">
          {book.sinopsis.split(/\n\s*\n/).map((parrafo) => (
            <p key={parrafo}>{parrafo}</p>
          ))}
        </div>
        <h3 className="mt-14 text-sm font-semibold uppercase tracking-[0.2em] text-dorado">
          Lo que vas a encontrar
        </h3>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {book.encontraras.map((item) => (
            <li key={item.titulo} className="rounded-2xl border border-linea bg-papel p-6">
              <h4 className="font-serif text-xl">{item.titulo}</h4>
              <p className="mt-2 text-tinta-suave">{item.descripcion}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

`src/components/book/author.tsx`:

```tsx
import type { Book } from "@/content/types"

export function Author({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Sobre los autores</h2>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-dorado">
        {book.autor}
      </p>
      <p className="mt-6 text-lg leading-relaxed">{book.sobreLosAutores}</p>
    </section>
  )
}
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: secciones de contenido de la landing" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Secciones de cierre, barra fija y páginas

**Files:**
- Create: `src/components/book/testimonials.tsx`, `src/components/book/guarantee.tsx`, `src/components/book/faq.tsx`, `src/components/book/purchase-panel.tsx`, `src/components/book/sticky-buy-bar.tsx`, `src/components/book/book-landing.tsx`, `src/lib/book-metadata.ts`, `src/app/libro/[slug]/page.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/book/closing-sections.test.tsx`, `src/components/book/sticky-buy-bar.test.tsx`, `src/components/book/book-landing.test.tsx`, `src/lib/book-metadata.test.ts`

**Interfaces:**
- Consumes: `Book`, `getBook`, `getFeaturedBook`, `books`, `formatPrice` (Tarea 2); `Button`, `ButtonLink` (Tarea 4); `Hero`, `Audience`, `Contents`, `Author` (Tarea 5); `buildWhatsappUrl` (Tarea 3).
- Produces:
  - `Testimonials`, `Guarantee`, `Faq` como `({ book }: { book: Book }) => JSX`
  - `PurchasePanel({ book, whatsappUrl }: { book: Book; whatsappUrl?: string | null })` con `id="comprar"`
  - `StickyBuyBar({ precio }: { precio: string })`
  - `BookLanding({ book }: { book: Book })`
  - `bookMetadata(book: Book): Metadata`

- [ ] **Step 1: Escribir los tests que fallan**

`src/components/book/closing-sections.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { Faq } from "./faq"
import { Guarantee } from "./guarantee"
import { PurchasePanel } from "./purchase-panel"
import { Testimonials } from "./testimonials"

describe("Testimonials", () => {
  it("no renderiza nada si no hay testimonios", () => {
    const { container } = render(<Testimonials book={makeBook({ testimonios: [] })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("muestra cada testimonio con su autor", () => {
    const book = makeBook({
      testimonios: [{ nombre: "Ana", texto: "Me cambió la mirada", detalle: "Medellín" }],
    })
    render(<Testimonials book={book} />)
    expect(screen.getByText(/Me cambió la mirada/)).toBeInTheDocument()
    expect(screen.getByText("Ana")).toBeInTheDocument()
    expect(screen.getByText(/Medellín/)).toBeInTheDocument()
  })
})

describe("Guarantee", () => {
  it("indica los días de garantía", () => {
    render(<Guarantee book={makeBook({ garantiaDias: 7 })} />)
    expect(screen.getByRole("heading", { name: /garantía de 7 días/i })).toBeInTheDocument()
  })
})

describe("Faq", () => {
  it("muestra cada pregunta y su respuesta", () => {
    render(<Faq book={makeBook()} />)
    expect(screen.getByText("¿Cómo leo el libro?")).toBeInTheDocument()
    expect(screen.getByText("En línea.")).toBeInTheDocument()
  })
})

describe("PurchasePanel", () => {
  it("es el destino de #comprar y muestra ambos precios", () => {
    const { container } = render(<PurchasePanel book={makeBook()} />)
    expect(container.querySelector("#comprar")).not.toBeNull()
    expect(screen.getByText("US$19.99")).toBeInTheDocument()
    expect(screen.getByText(/\$79\.900 COP/)).toBeInTheDocument()
  })

  it("deja los pagos deshabilitados hasta la fase de pagos", () => {
    render(<PurchasePanel book={makeBook()} />)
    expect(screen.getByRole("button", { name: /tarjeta/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /pse/i })).toBeDisabled()
  })

  it("muestra el botón de WhatsApp solo si hay enlace", () => {
    const { rerender } = render(<PurchasePanel book={makeBook()} whatsappUrl={null} />)
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull()

    rerender(<PurchasePanel book={makeBook()} whatsappUrl="https://wa.me/573001234567?text=Hola" />)
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/573001234567?text=Hola",
    )
  })
})
```

`src/components/book/sticky-buy-bar.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StickyBuyBar } from "./sticky-buy-bar"

class FakeObserver {
  static instances: FakeObserver[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = () => []
  constructor(public callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this)
  }
}

function avisar(hero: Element, compra: Element, heroVisible: boolean, compraVisible: boolean) {
  const observer = FakeObserver.instances[0]
  act(() => {
    observer.callback(
      [
        { target: hero, isIntersecting: heroVisible },
        { target: compra, isIntersecting: compraVisible },
      ] as IntersectionObserverEntry[],
      observer as unknown as IntersectionObserver,
    )
  })
}

describe("StickyBuyBar", () => {
  beforeEach(() => {
    FakeObserver.instances = []
    vi.stubGlobal("IntersectionObserver", FakeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function montar() {
    render(
      <>
        <div id="hero" />
        <div id="comprar" />
        <StickyBuyBar precio="US$19.99" />
      </>,
    )
    return {
      hero: document.getElementById("hero") as Element,
      compra: document.getElementById("comprar") as Element,
    }
  }

  it("está oculta mientras se ve el hero", () => {
    montar()
    expect(screen.queryByRole("link", { name: /comprar/i })).toBeNull()
  })

  it("aparece al salir del hero y enlaza a #comprar", () => {
    const { hero, compra } = montar()
    avisar(hero, compra, false, false)
    const enlace = screen.getByRole("link", { name: /comprar/i })
    expect(enlace).toHaveAttribute("href", "#comprar")
    expect(enlace).toHaveTextContent("US$19.99")
  })

  it("se oculta cuando el panel de compra ya está a la vista", () => {
    const { hero, compra } = montar()
    avisar(hero, compra, false, false)
    avisar(hero, compra, false, true)
    expect(screen.queryByRole("link", { name: /comprar/i })).toBeNull()
  })

  it("no falla si el navegador no soporta IntersectionObserver", () => {
    vi.unstubAllGlobals()
    montar()
    expect(screen.queryByRole("link", { name: /comprar/i })).toBeNull()
  })
})
```

`src/components/book/book-landing.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { BookLanding } from "./book-landing"

describe("BookLanding", () => {
  it("compone todas las secciones de la página", () => {
    const { container } = render(<BookLanding book={makeBook()} />)
    expect(screen.getByRole("heading", { level: 1, name: "Libro de Prueba" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "De qué trata" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Sobre los autores" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /garantía de 7 días/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Preguntas frecuentes" })).toBeInTheDocument()
    expect(container.querySelector("#hero")).not.toBeNull()
    expect(container.querySelector("#comprar")).not.toBeNull()
  })
})
```

`src/lib/book-metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { bookMetadata } from "./book-metadata"

describe("bookMetadata", () => {
  const metadata = bookMetadata(makeBook())

  it("arma el título con autor y la descripción con el subtítulo", () => {
    expect(metadata.title).toBe("Libro de Prueba — Autora Prueba")
    expect(metadata.description).toBe("Un subtítulo de prueba")
  })

  it("define Open Graph y Twitter para compartir", () => {
    expect(metadata.openGraph).toMatchObject({
      title: "Libro de Prueba — Autora Prueba",
      locale: "es_LA",
    })
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" })
  })

  it("apunta el canonical a la página del libro", () => {
    expect(metadata.alternates?.canonical).toBe("/libro/libro-de-prueba")
  })
})
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelven los módulos nuevos.

- [ ] **Step 3: Implementar las secciones de cierre**

`src/components/book/testimonials.tsx`:

```tsx
import type { Book } from "@/content/types"

export function Testimonials({ book }: { book: Book }) {
  if (book.testimonios.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Lo que dicen los lectores</h2>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {book.testimonios.map((t) => (
          <figure key={t.nombre} className="rounded-2xl border border-linea bg-white/60 p-6">
            <blockquote className="text-lg leading-relaxed">“{t.texto}”</blockquote>
            <figcaption className="mt-4 text-sm font-semibold">
              {t.nombre}
              {t.detalle ? <span className="font-normal text-tinta-suave"> · {t.detalle}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
```

`src/components/book/guarantee.tsx`:

```tsx
import type { Book } from "@/content/types"

export function Guarantee({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-dorado-claro bg-papel-oscuro p-8 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl">Garantía de {book.garantiaDias} días</h2>
        <p className="mt-3 text-tinta-suave">
          Si el libro no es lo que esperabas, te devolvemos tu dinero. Escríbenos dentro de los
          primeros {book.garantiaDias} días.
        </p>
      </div>
    </section>
  )
}
```

`src/components/book/faq.tsx`:

```tsx
import type { Book } from "@/content/types"

export function Faq({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Preguntas frecuentes</h2>
      <div className="mt-8 divide-y divide-linea border-y border-linea">
        {book.faq.map((item) => (
          <details key={item.pregunta} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {item.pregunta}
              <span aria-hidden className="text-2xl text-dorado transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-tinta-suave">{item.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
```

`src/components/book/purchase-panel.tsx`:

```tsx
import { Button, ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"

type PurchasePanelProps = { book: Book; whatsappUrl?: string | null }

export function PurchasePanel({ book, whatsappUrl }: PurchasePanelProps) {
  return (
    <section id="comprar" className="mx-auto w-full max-w-xl scroll-mt-8 px-4 py-16 sm:px-6 sm:py-24">
      <div className="rounded-3xl border border-linea bg-white/60 p-8 text-center shadow-sm">
        <h2 className="font-serif text-3xl">Lee {book.titulo} hoy</h2>
        <p className="mt-2 text-tinta-suave">
          Acceso inmediato en línea, desde tu celular o tu computador.
        </p>
        <p className="mt-6 font-serif text-5xl">{formatPrice(book.precioUsd, "USD")}</p>
        <p className="mt-1 text-sm text-tinta-suave">
          o {formatPrice(book.precioCop, "COP")} en Colombia
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button disabled>Pagar con tarjeta o Apple Pay</Button>
          <Button variant="secondary" disabled>
            Pagar con PSE o Nequi
          </Button>
        </div>
        <p className="mt-4 text-sm text-tinta-suave">Los pagos se activan pronto.</p>
        {whatsappUrl ? (
          <ButtonLink
            href={whatsappUrl}
            variant="secondary"
            className="mt-6 w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            Preguntar por WhatsApp
          </ButtonLink>
        ) : null}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implementar la barra fija**

`src/components/book/sticky-buy-bar.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { ButtonLink } from "@/components/ui/button"

export function StickyBuyBar({ precio }: { precio: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById("hero")
    const compra = document.getElementById("comprar")
    if (!hero || !compra || typeof IntersectionObserver === "undefined") return

    let heroVisible = true
    let compraVisible = false

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting
        if (entry.target === compra) compraVisible = entry.isIntersecting
      }
      setVisible(!heroVisible && !compraVisible)
    })

    observer.observe(hero)
    observer.observe(compra)
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-papel/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <ButtonLink href="#comprar" className="w-full">
        Comprar · {precio}
      </ButtonLink>
    </div>
  )
}
```

- [ ] **Step 5: Implementar la composición y los metadatos**

`src/components/book/book-landing.tsx`:

```tsx
import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"
import { buildWhatsappUrl } from "@/lib/whatsapp"
import { Audience } from "./audience"
import { Author } from "./author"
import { Contents } from "./contents"
import { Faq } from "./faq"
import { Guarantee } from "./guarantee"
import { Hero } from "./hero"
import { PurchasePanel } from "./purchase-panel"
import { StickyBuyBar } from "./sticky-buy-bar"
import { Testimonials } from "./testimonials"

export function BookLanding({ book }: { book: Book }) {
  const whatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    `Hola, tengo una pregunta sobre "${book.titulo}"`,
  )

  return (
    <>
      <main>
        <Hero book={book} />
        <Audience book={book} />
        <Contents book={book} />
        <Author book={book} />
        <Testimonials book={book} />
        <Guarantee book={book} />
        <Faq book={book} />
        <PurchasePanel book={book} whatsappUrl={whatsappUrl} />
      </main>
      <footer className="px-4 pb-24 pt-8 text-center text-sm text-tinta-suave md:pb-10">
        © {book.anioPublicacion} {book.autor}. Distribución digital: Ebooks de Jhei Trujillo.
      </footer>
      <StickyBuyBar precio={formatPrice(book.precioUsd, "USD")} />
    </>
  )
}
```

`src/lib/book-metadata.ts`:

```ts
import type { Metadata } from "next"
import type { Book } from "@/content/types"

export function bookMetadata(book: Book): Metadata {
  const title = `${book.titulo} — ${book.autor}`
  const description = book.subtitulo
  return {
    title,
    description,
    alternates: { canonical: `/libro/${book.slug}` },
    openGraph: { title, description, type: "website", locale: "es_LA" },
    twitter: { card: "summary_large_image", title, description },
  }
}
```

- [ ] **Step 6: Conectar las páginas**

`src/app/page.tsx` (reemplaza el contenido provisional):

```tsx
import { BookLanding } from "@/components/book/book-landing"
import { getFeaturedBook } from "@/content/books"
import { bookMetadata } from "@/lib/book-metadata"

export function generateMetadata() {
  return bookMetadata(getFeaturedBook())
}

export default function Home() {
  return <BookLanding book={getFeaturedBook()} />
}
```

`src/app/libro/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BookLanding } from "@/components/book/book-landing"
import { books, getBook } from "@/content/books"
import { bookMetadata } from "@/lib/book-metadata"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return books.map((book) => ({ slug: book.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const book = getBook(slug)
  return book ? bookMetadata(book) : {}
}

export default async function LibroPage({ params }: Props) {
  const { slug } = await params
  const book = getBook(slug)
  if (!book) notFound()
  return <BookLanding book={book} />
}
```

- [ ] **Step 7: Ejecutar tests, tipos y lint**

Run: `npm test && npm run typecheck && npm run lint`
Expected: los tres pasan sin errores.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: landing completa con barra de compra fija, metadatos y páginas de libro" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Imagen al compartir (Open Graph)

**Files:**
- Create: `src/app/opengraph-image.tsx`

**Interfaces:**
- Consumes: `getFeaturedBook` y `formatPrice` (Tarea 2). La ruta `/libro/[slug]` hereda esta imagen porque no define la suya.

Esta tarea no tiene test unitario: la imagen se genera con `next/og` y se verifica pidiéndola a un servidor real.

- [ ] **Step 1: Crear la imagen**

`src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from "next/og"
import { getFeaturedBook } from "@/content/books"
import { formatPrice } from "@/lib/format-price"

export const alt = "Portada y datos del libro"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  const book = getFeaturedBook()

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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 300,
            height: 450,
            padding: 28,
            borderRadius: 8,
            background: "#163f2b",
            color: "#f6f0e4",
            boxShadow: "0 30px 60px -20px rgba(29,26,22,0.45)",
          }}
        >
          <div style={{ fontSize: 16, letterSpacing: 4, textTransform: "uppercase", color: "#b8893a" }}>
            {book.autor}
          </div>
          <div style={{ fontSize: 40, lineHeight: 1.1 }}>{book.titulo}</div>
        </div>
      </div>
    ),
    size,
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run typecheck && npm run build`
Expected: sin errores y la lista de rutas incluye `/opengraph-image`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: imagen Open Graph para compartir el link" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Generador de QR y tarjeta 9:16

**Files:**
- Create: `src/lib/qr.ts`, `scripts/generar-qr.ts`
- Modify: `package.json`, `README.md`
- Test: `src/lib/qr.test.ts`

**Interfaces:**
- Consumes: `getFeaturedBook` (Tarea 2).
- Produces:
  - `STORY_SIZE = { width: 1080, height: 1920 }`
  - `escapeXml(text: string): string`, `wrapText(text: string, maxChars: number): string[]`
  - `generateQrAssets(url: string, meta: { titulo: string; autor: string }): Promise<{ png: Buffer; svg: string; story: Buffer }>`

- [ ] **Step 1: Instalar dependencias**

```bash
npm install qrcode sharp
npm install -D @types/qrcode jsqr tsx
npm pkg set scripts.qr="tsx scripts/generar-qr.ts"
```

- [ ] **Step 2: Escribir los tests que fallan**

`src/lib/qr.test.ts`:

```ts
// @vitest-environment node
import jsQR from "jsqr"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { STORY_SIZE, escapeXml, generateQrAssets, wrapText } from "./qr"

const URL_QR = "https://tienda.ejemplo.com/qr"
const meta = { titulo: "Si Dios jugara fútbol", autor: "Juan Guillermo Ricaurte y Jeins Durán" }

async function decodificar(imagen: Buffer): Promise<string | null> {
  const { data, info } = await sharp(imagen).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
}

describe("escapeXml", () => {
  it("escapa los caracteres especiales de XML", () => {
    expect(escapeXml(`A & B <c> "d" 'e'`)).toBe("A &amp; B &lt;c&gt; &quot;d&quot; &apos;e&apos;")
  })
})

describe("wrapText", () => {
  it("parte el texto en líneas sin pasar del máximo", () => {
    expect(wrapText("Si Dios jugara fútbol", 16)).toEqual(["Si Dios jugara", "fútbol"])
  })

  it("deja una palabra larga en su propia línea", () => {
    expect(wrapText("Extraordinariamente bueno", 10)).toEqual(["Extraordinariamente", "bueno"])
  })

  it("devuelve una lista vacía con texto vacío", () => {
    expect(wrapText("   ", 10)).toEqual([])
  })
})

describe("generateQrAssets", () => {
  it("genera un PNG válido que al escanearlo devuelve la URL", async () => {
    const { png } = await generateQrAssets(URL_QR, meta)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(await decodificar(png)).toBe(URL_QR)
  })

  it("genera un SVG", async () => {
    const { svg } = await generateQrAssets(URL_QR, meta)
    expect(svg).toContain("<svg")
  })

  it("genera la tarjeta 9:16 de 1080×1920 con un QR que también escanea", async () => {
    const { story } = await generateQrAssets(URL_QR, meta)
    const info = await sharp(story).metadata()
    expect(info.width).toBe(STORY_SIZE.width)
    expect(info.height).toBe(STORY_SIZE.height)
    expect(await decodificar(story)).toBe(URL_QR)
  })
})
```

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL — no se resuelve `./qr`.

- [ ] **Step 4: Implementar el generador**

`src/lib/qr.ts`:

```ts
import QRCode from "qrcode"
import sharp from "sharp"

export const STORY_SIZE = { width: 1080, height: 1920 } as const

const INK = "#1d1a16"
const INK_SOFT = "#5b5347"
const PAPER = "#f6f0e4"
const GOLD = "#8a6420"

// El QR de la tarjeta mide 640 px y va sobre una caja blanca de 760 px, centrada.
const CARD_QR = { size: 640, left: 220, top: 860 }
const CARD_BOX = { size: 760, left: 160, top: 800 }

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const word of text.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function storySvg({ titulo, autor }: { titulo: string; autor: string }): string {
  const { width, height } = STORY_SIZE
  const autores = wrapText(autor.toUpperCase(), 24)
    .map(
      (linea, i) =>
        `<text x="${width / 2}" y="${220 + i * 52}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" letter-spacing="6" fill="${GOLD}">${escapeXml(linea)}</text>`,
    )
    .join("")
  const lineas = wrapText(titulo, 16)
    .map(
      (linea, i) =>
        `<text x="${width / 2}" y="${430 + i * 112}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="96" fill="${INK}">${escapeXml(linea)}</text>`,
    )
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PAPER}"/>
  ${autores}
  ${lineas}
  <rect x="${CARD_BOX.left}" y="${CARD_BOX.top}" width="${CARD_BOX.size}" height="${CARD_BOX.size}" rx="40" fill="#ffffff"/>
  <text x="${width / 2}" y="1690" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" fill="${INK}">Escanea para leerlo</text>
  <text x="${width / 2}" y="1758" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${INK_SOFT}">Lectura en línea</text>
  <rect x="${width / 2 - 60}" y="1810" width="120" height="4" fill="${GOLD}"/>
</svg>`
}

export type QrAssets = { png: Buffer; svg: string; story: Buffer }

export async function generateQrAssets(
  url: string,
  meta: { titulo: string; autor: string },
): Promise<QrAssets> {
  const options = { errorCorrectionLevel: "M" as const, color: { dark: INK, light: "#ffffff" } }

  const [svg, png, storyQr] = await Promise.all([
    QRCode.toString(url, { ...options, type: "svg", margin: 1 }),
    QRCode.toBuffer(url, { ...options, type: "png", width: 1024, margin: 2 }),
    QRCode.toBuffer(url, { ...options, type: "png", width: CARD_QR.size, margin: 1 }),
  ])

  const story = await sharp(Buffer.from(storySvg(meta)))
    .composite([{ input: storyQr, left: CARD_QR.left, top: CARD_QR.top }])
    .png()
    .toBuffer()

  return { png, svg, story }
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test`
Expected: PASS — incluido el escaneo real del QR con `jsqr`.

- [ ] **Step 6: Crear el script de línea de comandos**

`scripts/generar-qr.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getFeaturedBook } from "../src/content/books"
import { channelUrl } from "../src/lib/channels"
import { generateQrAssets } from "../src/lib/qr"

async function main() {
  const entrada = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!entrada) {
    console.error("Falta la URL pública de la tienda.")
    console.error("Uso: npm run qr -- https://tu-dominio.com")
    process.exit(1)
  }

  let origen: string
  try {
    origen = new URL(entrada).origin
  } catch {
    console.error(`"${entrada}" no es una URL válida (incluye https://).`)
    process.exit(1)
  }

  if (new URL(origen).hostname === "localhost") {
    console.warn("Aviso: el QR apunta a localhost y solo funcionará en este computador.")
  }

  // El QR apunta a /qr (redirección propia): así el destino puede cambiar sin reimprimir.
  const destino = new URL("/qr", origen).toString()
  const libro = getFeaturedBook()
  const { png, svg, story } = await generateQrAssets(destino, {
    titulo: libro.titulo,
    autor: libro.autor,
  })

  const carpeta = path.resolve("out", "qr")
  await mkdir(carpeta, { recursive: true })
  await Promise.all([
    writeFile(path.join(carpeta, "qr-tienda.png"), png),
    writeFile(path.join(carpeta, "qr-tienda.svg"), svg),
    writeFile(path.join(carpeta, "tarjeta-historia-9x16.png"), story),
  ])

  console.log(`QR generado para ${destino}`)
  console.log(`Ejemplo de la tienda con UTM de QR: ${channelUrl("qr", origen)}`)
  console.log(`Archivos en ${carpeta}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 7: Probar el script de punta a punta**

Run: `npm run qr -- https://tienda.ejemplo.com && ls -la out/qr`
Expected: imprime `QR generado para https://tienda.ejemplo.com/qr` y lista `qr-tienda.png`, `qr-tienda.svg` y `tarjeta-historia-9x16.png`.

Run: `npm run qr`
Expected: mensaje "Falta la URL pública de la tienda." y salida con error (código distinto de 0).

Abre `out/qr/tarjeta-historia-9x16.png` y revisa a ojo que el título, el autor y el QR se ven bien.

- [ ] **Step 8: Documentar en el README**

`README.md` (reemplaza todo):

```md
# Tienda de ebooks

Tienda de ebooks con lector en línea. Primer libro: *Si Dios jugara fútbol*.

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
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: generador de QR y tarjeta 9:16 para historias" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Verificación final de la Fase 1

**Files:** ninguno (solo se corrige lo que la verificación encuentre).

**Interfaces:**
- Consumes: todo lo anterior.

- [ ] **Step 1: Suite completa**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: todo pasa sin errores ni advertencias nuevas.

- [ ] **Step 2: Levantar la versión de producción**

Run (en segundo plano): `npx next start -p 3100`
Expected: el servidor queda escuchando en `http://localhost:3100`.

- [ ] **Step 3: Comprobar redirects, metadatos e imagen al compartir**

```bash
for ruta in ig tiktok wa qr; do curl -s -o /dev/null -w "/$ruta -> %{http_code} %{redirect_url}\n" http://localhost:3100/$ruta; done
curl -sI http://localhost:3100/qr | grep -i cache-control
curl -sI http://localhost:3100/opengraph-image | head -5
curl -s http://localhost:3100/ | grep -o '<meta property="og:[a-z:]*" content="[^"]*"'
curl -s -o /dev/null -w "/libro/si-dios-jugara-futbol -> %{http_code}\n" http://localhost:3100/libro/si-dios-jugara-futbol
curl -s -o /dev/null -w "/libro/no-existe -> %{http_code}\n" http://localhost:3100/libro/no-existe
```

Expected:
- Los cuatro canales responden `307` y `Location` con su `utm_source` y `utm_medium`.
- `cache-control: no-store` en `/qr`.
- `/opengraph-image` responde `200` con `content-type: image/png`.
- Aparecen `og:title`, `og:description`, `og:locale` con `es_LA` y `og:image`.
- La página del libro responde `200` y el slug inexistente `404`.

- [ ] **Step 4: Revisión visual en celular y computador**

Usa el skill `webapp-testing` (Playwright) contra `http://localhost:3100` para capturar la página a 390 × 844 y a 1280 × 800. Revisa:
- Sin scroll horizontal a 390 px y con márgenes laterales de 16 px.
- El hero, los títulos serif, la portada con sombra y el fondo crema se ven como el diseño.
- La barra fija "Comprar · US$19.99" aparece en celular al bajar del hero y desaparece al llegar al panel de compra.
- Los botones de pago están deshabilitados y dicen "Los pagos se activan pronto."

- [ ] **Step 5: Detener el servidor y corregir hallazgos**

Detén el proceso de `next start`. Si alguna comprobación falló, corrígela con su propio commit (`fix: ...`) y vuelve a correr el paso que falló.

- [ ] **Step 6: Estado final**

Run: `git status --short && git log --oneline`
Expected: árbol limpio y un commit por tarea sobre `feat/tienda-base`.
