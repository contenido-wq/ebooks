import { describe, expect, it } from "vitest"
import { almacenFalso } from "@/test/almacen-falso"
import { canjearTicket, crearTicket, permitirIntento } from "./tickets"

describe("tickets de descarga", () => {
  it("crea un ticket aleatorio de 256 bits, distinto cada vez, con vida de 10 minutos", async () => {
    const a = almacenFalso()
    const t1 = await crearTicket(a)
    const t2 = await crearTicket(a)
    expect(t1).toMatch(/^[0-9a-f]{64}$/)
    expect(t1).not.toBe(t2)
    expect(a.ttlDe(`ticket:${t1}`)).toBe(600)
  })

  it("un ticket sirve una sola vez", async () => {
    const a = almacenFalso()
    const t = await crearTicket(a)
    expect(await canjearTicket(a, t)).toBe(true)
    expect(await canjearTicket(a, t)).toBe(false)
  })

  it("un ticket vencido no sirve", async () => {
    const a = almacenFalso()
    const t = await crearTicket(a)
    a.avanzar(601)
    expect(await canjearTicket(a, t)).toBe(false)
  })

  it("un ticket inventado o con formato raro no sirve", async () => {
    const a = almacenFalso()
    expect(await canjearTicket(a, "0".repeat(64))).toBe(false)
    for (const raro of ["", "abc", "../ticket:x", "A".repeat(64), `${"a".repeat(63)}!`, "a".repeat(65)]) {
      expect(await canjearTicket(a, raro), raro).toBe(false)
    }
  })
})

describe("permitirIntento", () => {
  it("deja 5 intentos por clave en 10 minutos y bloquea el sexto", async () => {
    const a = almacenFalso()
    for (let i = 0; i < 5; i++) expect(await permitirIntento(a, "ip:1.2.3.4")).toBe(true)
    expect(await permitirIntento(a, "ip:1.2.3.4")).toBe(false)
  })

  it("cada clave tiene su propio contador", async () => {
    const a = almacenFalso()
    for (let i = 0; i < 5; i++) await permitirIntento(a, "ip:1.2.3.4")
    expect(await permitirIntento(a, "ip:5.6.7.8")).toBe(true)
  })

  it("el contador se reinicia pasados los 10 minutos", async () => {
    const a = almacenFalso()
    for (let i = 0; i < 6; i++) await permitirIntento(a, "ip:1.2.3.4")
    a.avanzar(601)
    expect(await permitirIntento(a, "ip:1.2.3.4")).toBe(true)
  })
})
