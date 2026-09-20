// @vitest-environment node
import { describe, expect, it } from "vitest"
import { GET as ig } from "./ig/route"
import { GET as qr } from "./qr/route"
import { GET as tiktok } from "./tiktok/route"
import { GET as wa } from "./wa/route"

const origen = "http://localhost:3000"

describe("rutas de canal", () => {
  it.each([
    ["/ig", ig, "instagram", "bio"],
    ["/tiktok", tiktok, "tiktok", "bio"],
    ["/wa", wa, "whatsapp", "chat"],
    ["/qr", qr, "qr", "offline"],
  ])("%s redirige con 307 a la tienda con sus UTM", (ruta, handler, fuente, medio) => {
    const res = handler(new Request(`${origen}${ruta}`))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe(
      `${origen}/?utm_source=${fuente}&utm_medium=${medio}&utm_campaign=tienda`,
    )
  })

  it("no permite guardar la redirección en caché", () => {
    const res = qr(new Request(`${origen}/qr`))
    expect(res.headers.get("cache-control")).toBe("no-store")
  })
})
