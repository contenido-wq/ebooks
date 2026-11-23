import { existsSync } from "node:fs"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
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

  it("cada libro tiene precios válidos", () => {
    for (const book of books) {
      expect(book.precioUsd).toBeGreaterThan(0)
      expect(book.precioCop).toBeGreaterThan(0)
      expect(book.urlCompra).toMatch(/^https:\/\//)
    }
  })

  it("los autores del libro destacado son los del libro, no el editor", () => {
    expect(getFeaturedBook().autor).toBe("Juan Guillermo Ricaurte y Jeins Durán")
  })
})

describe("datos de post-compra", () => {
  const URL_PDF = "https://drive.google.com/file/d/ID_DE_PRUEBA/view?usp=sharing"

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // El enlace del PDF no vive en el código (el repositorio es público): sale de una variable de entorno.
  async function cargarLibro(urlDescarga: string) {
    vi.stubEnv("NEXT_PUBLIC_DESCARGA_URL", urlDescarga)
    vi.resetModules()
    return (await import("./books")).getFeaturedBook()
  }

  it("el enlace del PDF sale de NEXT_PUBLIC_DESCARGA_URL, no del código", async () => {
    expect((await cargarLibro(URL_PDF)).postCompra?.urlDescarga).toBe(URL_PDF)
  })

  it("sin la variable no hay datos de post-compra (y /gracias responde 404)", async () => {
    expect((await cargarLibro("")).postCompra).toBeUndefined()
  })

  it("un enlace que no es https se descarta", async () => {
    expect((await cargarLibro("javascript:alert(1)")).postCompra).toBeUndefined()
    expect((await cargarLibro("http://drive.google.com/file/d/ID/view")).postCompra).toBeUndefined()
  })

  it("la cuenta de Wemany queda sin enlace hasta que el dueño lo dé", async () => {
    expect((await cargarLibro(URL_PDF)).postCompra?.urlCuentaWemany).toBeNull()
  })
})

describe("preguntas frecuentes", () => {
  const { faq } = getFeaturedBook()
  const respuestaDe = (pregunta: string) => faq.find((item) => item.pregunta === pregunta)?.respuesta

  it("dice que sí se puede descargar el PDF", () => {
    expect(respuestaDe("¿Puedo descargar el PDF?")).toMatch(/^Sí/)
  })

  it("no revela dónde está la página de descarga a quien no ha pagado", () => {
    expect(respuestaDe("¿Puedo descargar el PDF?")).not.toMatch(/gracias|página|\/gracias/i)
  })

  it("explica que el libro se descarga en PDF, no que se lee en línea", () => {
    const respuesta = respuestaDe("¿Cómo leo el libro?")
    expect(respuesta).toMatch(/PDF/)
    expect(respuesta).not.toMatch(/email|en línea|sin descargar/i)
  })

  it("manda a WhatsApp si hay problemas con la descarga", () => {
    expect(respuestaDe("¿Qué hago si tengo problemas con la descarga?")).toMatch(/WhatsApp/)
  })

  it("ninguna respuesta menciona un lector o una biblioteca que no existen", () => {
    expect(JSON.stringify(faq)).not.toMatch(/biblioteca|enlace de acceso/i)
  })
})

describe("contenido de la landing", () => {
  const libro = getFeaturedBook()

  it("todas las imágenes que usa existen en public/", () => {
    const { landing } = libro
    const rutas = [
      libro.portada?.src,
      landing.hero.imagen.src,
      landing.historia.imagen.src,
      ...landing.pases.tarjetas.map((t) => t.imagen.src),
      landing.autor.imagen.src,
      landing.cierre.imagen.src,
    ].filter((ruta): ruta is string => Boolean(ruta))

    expect(rutas.length).toBe(8)
    for (const ruta of rutas) expect(existsSync(path.join("public", ruta)), ruta).toBe(true)
  })

  it("todas las imágenes tienen texto alternativo", () => {
    const { landing } = libro
    const imagenes = [
      landing.hero.imagen,
      landing.historia.imagen,
      ...landing.pases.tarjetas.map((t) => t.imagen),
      landing.autor.imagen,
      landing.cierre.imagen,
    ]
    for (const imagen of imagenes) expect(imagen.alt.length).toBeGreaterThan(10)
  })

  it("tiene tres pases, de los minutos 3, 18 y 31 del libro, en orden", () => {
    expect(libro.landing.pases.tarjetas.map((t) => t.minuto)).toEqual([3, 18, 31])
  })

  it("el autor de la sección de autor es Juan Guillermo Ricaurte, no el editor", () => {
    expect(libro.landing.autor.nombre).toBe("Juan Guillermo Ricaurte")
    expect(libro.landing.autor.escritoPor).toContain("Jeins Durán")
  })
})
