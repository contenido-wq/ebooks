import { beforeEach, describe, expect, it, vi } from "vitest"
import { registrarCompra } from "@/lib/acceso/compradores"
import { almacenFalso } from "@/test/almacen-falso"

vi.mock("@/lib/cloudflare-env", () => ({ leerEntornoSitio: vi.fn() }))

import { leerEntornoSitio } from "@/lib/cloudflare-env"
import { POST } from "./route"

function peticion(cuerpo: string, ip = "1.1.1.1") {
  return new Request("https://sidiosjugarafutbol.com/api/gracias", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: cuerpo,
  })
}

beforeEach(async () => {
  const kv = almacenFalso()
  await registrarCompra(kv, "ana@mail.com")
  const bucket = { get: async () => null }
  vi.mocked(leerEntornoSitio).mockResolvedValue({ COMPRADORES: kv, LIBRO_PDF: bucket })
})

describe("POST /api/gracias", () => {
  it("a un comprador le responde 200 con su enlace de un solo uso, sin caché", async () => {
    const res = await POST(peticion(JSON.stringify({ correo: "ana@mail.com" })))
    expect(res.status).toBe(200)
    expect(res.headers.get("cache-control")).toContain("no-store")
    const json = (await res.json()) as { ok: boolean; url: string }
    expect(json.ok).toBe(true)
    expect(json.url).toMatch(/^\/descarga\?t=[0-9a-f]{64}$/)
  })

  it("a quien no compró le responde 404", async () => {
    const res = await POST(peticion(JSON.stringify({ correo: "otra@mail.com" })))
    expect(res.status).toBe(404)
  })

  it("un cuerpo que no es JSON responde 400", async () => {
    expect((await POST(peticion("{no es json"))).status).toBe(400)
  })

  it("un cuerpo enorme responde 413 sin procesarlo", async () => {
    expect((await POST(peticion(JSON.stringify({ correo: "a".repeat(5000) })))).status).toBe(413)
  })

  it("limita los intentos por IP usando el encabezado de Cloudflare", async () => {
    let ultimo = 0
    for (let i = 0; i < 6; i++) ultimo = (await POST(peticion(JSON.stringify({ correo: `x${i}@mail.com` }), "7.7.7.7"))).status
    expect(ultimo).toBe(429)
  })

  it("sin Cloudflare disponible responde 503 en español", async () => {
    vi.mocked(leerEntornoSitio).mockResolvedValue({})
    const res = await POST(peticion(JSON.stringify({ correo: "ana@mail.com" })))
    expect(res.status).toBe(503)
    expect(((await res.json()) as { mensaje: string }).mensaje).toMatch(/WhatsApp/)
  })
})
