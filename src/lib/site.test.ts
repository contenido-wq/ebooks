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
