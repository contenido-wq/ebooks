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

  it("los autores del libro destacado son los del libro, no el editor", () => {
    expect(getFeaturedBook().autor).toBe("Juan Guillermo Ricaurte y Jeins Durán")
  })
})
