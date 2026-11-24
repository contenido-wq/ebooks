import { describe, expect, it } from "vitest"
import GraciasPage, { metadata } from "./page"

describe("página /gracias", () => {
  it("no se indexa en buscadores", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("se arma sin depender de ninguna variable de entorno ni de un enlace al PDF", () => {
    expect(() => GraciasPage()).not.toThrow()
  })
})
