import { beforeEach, describe, expect, it, vi } from "vitest"
import { CLAVE_PDF } from "@/lib/acceso/descarga"
import { crearTicket } from "@/lib/acceso/tickets"
import { almacenFalso } from "@/test/almacen-falso"

vi.mock("@/lib/cloudflare-env", () => ({ leerEntornoSitio: vi.fn() }))

import { leerEntornoSitio } from "@/lib/cloudflare-env"
import { GET } from "./route"

const CONTENIDO = "%PDF-1.7 prueba"
const kv = almacenFalso()

function pedir(ticket?: string) {
  const url = new URL("https://sidiosjugarafutbol.com/descarga")
  if (ticket !== undefined) url.searchParams.set("t", ticket)
  return GET(new Request(url))
}

beforeEach(() => {
  const bucket = {
    get: async (clave: string) => (clave === CLAVE_PDF ? (new Response(CONTENIDO).body as ReadableStream) : null),
  }
  vi.mocked(leerEntornoSitio).mockResolvedValue({ COMPRADORES: kv, LIBRO_PDF: bucket })
})

describe("GET /descarga", () => {
  it("con un ticket válido entrega el PDF una sola vez", async () => {
    const ticket = await crearTicket(kv)
    const primera = await pedir(ticket)
    expect(primera.status).toBe(200)
    expect(primera.headers.get("content-type")).toBe("application/pdf")
    expect(await primera.text()).toBe(CONTENIDO)
    expect((await pedir(ticket)).status).toBe(410)
  })

  it("sin ticket o con uno inventado responde 410", async () => {
    expect((await pedir()).status).toBe(410)
    expect((await pedir("0".repeat(64))).status).toBe(410)
  })

  it("sin Cloudflare disponible responde 503", async () => {
    vi.mocked(leerEntornoSitio).mockResolvedValue({})
    expect((await pedir("0".repeat(64))).status).toBe(503)
  })
})
