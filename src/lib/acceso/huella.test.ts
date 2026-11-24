import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { huellaCorreo, normalizarCorreo } from "./huella"

describe("normalizarCorreo", () => {
  it("recorta espacios y pasa a minúsculas", () => {
    expect(normalizarCorreo("  Ana@Mail.COM ")).toBe("ana@mail.com")
  })

  it("rechaza lo que no parece un correo", () => {
    for (const malo of ["", "   ", "sin-arroba", "a@b", "a b@c.com", "@c.com", "a@", "a@@c.com", `${"x".repeat(250)}@mail.com`]) {
      expect(normalizarCorreo(malo), malo).toBeNull()
    }
  })
})

describe("huellaCorreo", () => {
  it("es el SHA-256 en hexadecimal del correo normalizado", async () => {
    const esperado = createHash("sha256").update("ana@mail.com").digest("hex")
    expect(await huellaCorreo("ana@mail.com")).toBe(esperado)
  })

  it("no depende de mayúsculas ni de espacios", async () => {
    expect(await huellaCorreo("  ANA@mail.com")).toBe(await huellaCorreo("ana@mail.com"))
  })

  it("es distinta para correos distintos y no contiene el correo", async () => {
    const a = await huellaCorreo("ana@mail.com")
    const b = await huellaCorreo("luis@mail.com")
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toContain("ana")
  })

  it("devuelve null si el correo no es válido", async () => {
    expect(await huellaCorreo("no-es-correo")).toBeNull()
  })
})
