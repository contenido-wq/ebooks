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
