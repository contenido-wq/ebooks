import { existsSync } from "node:fs"
import path from "node:path"
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
