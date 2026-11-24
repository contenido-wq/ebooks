import { describe, expect, it, vi } from "vitest"
import { almacenFalso } from "@/test/almacen-falso"
import { registrarCompra } from "./compradores"
import { CLAVE_PDF, entregarPdf, verificarCorreo, type AlmacenPdf } from "./descarga"
import { crearTicket } from "./tickets"

const CONTENIDO = "%PDF-1.7 contenido de prueba"

/** Imita el KV donde vive el PDF: `get(clave, "stream")` devuelve el contenido como flujo, o null si no existe. */
function bucketFalso(existe = true): AlmacenPdf {
  return {
    async get(clave, tipo) {
      if (tipo !== "stream") throw new Error("el PDF siempre se pide como flujo")
      if (!existe || clave !== CLAVE_PDF) return null
      return new Response(CONTENIDO).body as ReadableStream
    },
  }
}

async function entornoConComprador(correo = "ana@mail.com") {
  const kv = almacenFalso()
  await registrarCompra(kv, correo)
  return { kv, env: { COMPRADORES: kv, LIBRO_PDF: bucketFalso() } }
}

describe("verificarCorreo", () => {
  it("a un comprador le da un enlace de descarga de un solo uso", async () => {
    const { env } = await entornoConComprador()
    const r = await verificarCorreo(env, "ana@mail.com", "1.1.1.1")
    expect(r.estado).toBe(200)
    expect(r.cuerpo.ok).toBe(true)
    expect(String(r.cuerpo.url)).toMatch(/^\/descarga\?t=[0-9a-f]{64}$/)
  })

  it("no distingue mayúsculas ni espacios", async () => {
    const { env } = await entornoConComprador()
    expect((await verificarCorreo(env, "  ANA@Mail.com ", "1.1.1.1")).estado).toBe(200)
  })

  it("a quien no compró le responde 404 y no crea ningún ticket", async () => {
    const { kv, env } = await entornoConComprador()
    const r = await verificarCorreo(env, "otra@mail.com", "1.1.1.1")
    expect(r.estado).toBe(404)
    expect(r.cuerpo.ok).toBe(false)
    expect(kv.claves().some((c) => c.startsWith("ticket:"))).toBe(false)
  })

  it("un correo inválido o que no es texto responde 400", async () => {
    const { env } = await entornoConComprador()
    for (const malo of ["", "sin-arroba", 42, null, undefined, { a: 1 }]) {
      expect((await verificarCorreo(env, malo, "1.1.1.1")).estado, String(malo)).toBe(400)
    }
  })

  it("después de 5 intentos desde la misma IP responde 429, incluso a un comprador", async () => {
    const { env } = await entornoConComprador()
    for (let i = 0; i < 5; i++) await verificarCorreo(env, `x${i}@mail.com`, "9.9.9.9")
    expect((await verificarCorreo(env, "ana@mail.com", "9.9.9.9")).estado).toBe(429)
  })

  it("después de 5 intentos con el mismo correo (desde IP distintas) responde 429", async () => {
    const { env } = await entornoConComprador()
    for (let i = 0; i < 5; i++) await verificarCorreo(env, "victima@mail.com", `2.2.2.${i}`)
    expect((await verificarCorreo(env, "victima@mail.com", "2.2.2.99")).estado).toBe(429)
  })

  it("sin almacén o sin bucket responde 503", async () => {
    expect((await verificarCorreo({}, "ana@mail.com", "1.1.1.1")).estado).toBe(503)
    expect((await verificarCorreo({ COMPRADORES: almacenFalso() }, "ana@mail.com", "1.1.1.1")).estado).toBe(503)
  })

  it("si el almacén falla responde 503 sin detalles", async () => {
    const roto = { ...almacenFalso(), get: vi.fn(async () => { throw new Error("kv caído: secreto-interno") }) }
    const r = await verificarCorreo({ COMPRADORES: roto, LIBRO_PDF: bucketFalso() }, "ana@mail.com", "1.1.1.1")
    expect(r.estado).toBe(503)
    expect(JSON.stringify(r.cuerpo)).not.toContain("secreto-interno")
  })

  it("nunca devuelve el correo en la respuesta", async () => {
    const { env } = await entornoConComprador()
    const r = await verificarCorreo(env, "ana@mail.com", "1.1.1.1")
    expect(JSON.stringify(r.cuerpo)).not.toContain("ana@mail.com")
  })
})

describe("entregarPdf", () => {
  it("con un ticket válido entrega el PDF como adjunto, sin caché", async () => {
    const kv = almacenFalso()
    const ticket = await crearTicket(kv)
    const res = await entregarPdf({ COMPRADORES: kv, LIBRO_PDF: bucketFalso() }, ticket)
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toBe("application/pdf")
    const disposicion = res.headers.get("content-disposition") ?? ""
    expect(disposicion).toContain("attachment")
    expect(disposicion).toContain("filename*=UTF-8''Si%20Dios%20jugara%20futbol.pdf")
    expect(res.headers.get("cache-control")).toContain("no-store")
    expect(res.headers.get("x-robots-tag")).toContain("noindex")
    expect(await res.text()).toBe(CONTENIDO)
  })

  it("el mismo ticket usado una segunda vez responde 410", async () => {
    const kv = almacenFalso()
    const env = { COMPRADORES: kv, LIBRO_PDF: bucketFalso() }
    const ticket = await crearTicket(kv)
    expect((await entregarPdf(env, ticket)).status).toBe(200)
    expect((await entregarPdf(env, ticket)).status).toBe(410)
  })

  it("un ticket vencido, inventado o ausente responde 410 y no entrega nada", async () => {
    const kv = almacenFalso()
    const env = { COMPRADORES: kv, LIBRO_PDF: bucketFalso() }
    const viejo = await crearTicket(kv)
    kv.avanzar(601)
    for (const t of [viejo, "0".repeat(64), "basura", "", null]) {
      const res = await entregarPdf(env, t)
      expect(res.status, String(t)).toBe(410)
      expect(await res.text()).not.toContain("%PDF")
    }
  })

  it("el mensaje de error está en español", async () => {
    const res = await entregarPdf({ COMPRADORES: almacenFalso(), LIBRO_PDF: bucketFalso() }, null)
    expect(await res.text()).toMatch(/enlace/i)
  })

  it("sin almacén o sin bucket responde 503", async () => {
    expect((await entregarPdf({}, "0".repeat(64))).status).toBe(503)
  })

  it("si el PDF no está en el bucket responde 404", async () => {
    const kv = almacenFalso()
    const ticket = await crearTicket(kv)
    const res = await entregarPdf({ COMPRADORES: kv, LIBRO_PDF: bucketFalso(false) }, ticket)
    expect(res.status).toBe(404)
  })
})
