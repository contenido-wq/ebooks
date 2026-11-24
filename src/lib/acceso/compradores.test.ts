import { describe, expect, it } from "vitest"
import { almacenFalso } from "@/test/almacen-falso"
import { esComprador, registrarCompra } from "./compradores"

describe("compradores", () => {
  it("registra la compra con la huella del correo y nunca con el correo en claro", async () => {
    const a = almacenFalso()
    expect(await registrarCompra(a, "Ana@Mail.com")).toBe(true)
    expect(a.claves()).toHaveLength(1)
    expect(a.claves()[0]).toMatch(/^pagado:[0-9a-f]{64}$/)
    const todo = JSON.stringify([...a.claves(), ...a.valores()]).toLowerCase()
    expect(todo).not.toContain("ana")
    expect(todo).not.toContain("mail.com")
  })

  it("reconoce al comprador sin importar mayúsculas ni espacios", async () => {
    const a = almacenFalso()
    await registrarCompra(a, "ana@mail.com")
    expect(await esComprador(a, "  ANA@mail.com ")).toBe(true)
  })

  it("no reconoce a quien no compró", async () => {
    const a = almacenFalso()
    await registrarCompra(a, "ana@mail.com")
    expect(await esComprador(a, "luis@mail.com")).toBe(false)
  })

  it("un correo inválido ni se registra ni se reconoce", async () => {
    const a = almacenFalso()
    expect(await registrarCompra(a, "no-es-correo")).toBe(false)
    expect(a.claves()).toHaveLength(0)
    expect(await esComprador(a, "no-es-correo")).toBe(false)
  })

  it("registrar dos veces el mismo correo es inocuo", async () => {
    const a = almacenFalso()
    await registrarCompra(a, "ana@mail.com")
    await registrarCompra(a, "ANA@mail.com")
    expect(a.claves()).toHaveLength(1)
  })
})
