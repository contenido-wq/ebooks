import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(() => {
  vi.resetModules()
  vi.doUnmock("@/content/books")
  vi.unstubAllEnvs()
})

describe("página /gracias", () => {
  it("no se indexa en buscadores", async () => {
    const { metadata } = await import("./page")
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("responde 404 si el libro no tiene datos de post-compra", async () => {
    const real = await vi.importActual<typeof import("@/content/books")>("@/content/books")
    vi.doMock("@/content/books", () => ({
      ...real,
      getFeaturedBook: () => ({ ...real.getFeaturedBook(), postCompra: undefined }),
    }))
    const { default: Pagina } = await import("./page")
    expect(() => Pagina()).toThrow(expect.objectContaining({ digest: expect.stringContaining("404") }))
  })

  it("con el enlace del PDF configurado se arma la página sin lanzar error", async () => {
    vi.stubEnv("NEXT_PUBLIC_DESCARGA_URL", "https://drive.google.com/file/d/ID_DE_PRUEBA/view")
    const { default: Pagina } = await import("./page")
    expect(() => Pagina()).not.toThrow()
  })
})
