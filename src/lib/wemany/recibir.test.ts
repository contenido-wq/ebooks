import { describe, expect, it, vi } from "vitest"
import { igualesConstante, recibirWebhook } from "./recibir"

const ENTORNO = {
  WEBHOOK_TOKEN: "codigo-correcto",
  SHEETS_SCRIPT_URL: "https://script.google.com/macros/s/ABC/exec",
  SHEETS_SCRIPT_TOKEN: "token-hoja",
}
const AHORA = () => new Date("2026-11-18T04:15:02Z")

function peticion(cuerpo: string, tipo = "application/json", extra: Record<string, string> = {}) {
  return new Request("https://sidiosjugarafutbol.com/api/wemany/x", {
    method: "POST",
    headers: { "content-type": tipo, ...extra },
    body: cuerpo,
  })
}

function hojaOk() {
  return vi.fn(async () => Response.json({ ok: true }))
}

describe("igualesConstante", () => {
  it("compara bien", () => {
    expect(igualesConstante("abc", "abc")).toBe(true)
    expect(igualesConstante("abc", "abd")).toBe(false)
    expect(igualesConstante("abc", "abcd")).toBe(false)
    expect(igualesConstante("", "a")).toBe(false)
  })
})

describe("recibirWebhook", () => {
  it("rechaza con 404 si el código es incorrecto y no toca la hoja", async () => {
    const hoja = hojaOk()
    const res = await recibirWebhook(peticion("{}"), "otro", ENTORNO, { fetch: hoja })
    expect(res.status).toBe(404)
    expect(hoja).not.toHaveBeenCalled()
  })

  it("rechaza con 404 si el servidor no tiene código configurado", async () => {
    const res = await recibirWebhook(peticion("{}"), "", { ...ENTORNO, WEBHOOK_TOKEN: undefined })
    expect(res.status).toBe(404)
  })

  it("envía la fila a la hoja con el token de la hoja y responde 200", async () => {
    const hoja = hojaOk()
    const res = await recibirWebhook(
      peticion(JSON.stringify({ event: "purchase.approved", email: "ana@mail.com", amount: 79900 })),
      "codigo-correcto",
      ENTORNO,
      { fetch: hoja, ahora: AHORA },
    )
    expect(res.status).toBe(200)
    expect(hoja).toHaveBeenCalledTimes(1)
    const [url, init] = hoja.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(ENTORNO.SHEETS_SCRIPT_URL)
    expect(init.redirect).toBe("follow")
    const enviado = JSON.parse(String(init.body))
    expect(enviado.token).toBe("token-hoja")
    expect(enviado.fila).toMatchObject({ evento: "Compra aprobada", email: "ana@mail.com", monto: 79900 })
  })

  it("acepta formularios", async () => {
    const hoja = hojaOk()
    const res = await recibirWebhook(
      peticion("event=cart.abandoned&email=a%40b.co", "application/x-www-form-urlencoded"),
      "codigo-correcto",
      ENTORNO,
      { fetch: hoja, ahora: AHORA },
    )
    expect(res.status).toBe(200)
    const enviado = JSON.parse(String((hoja.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(enviado.fila).toMatchObject({ evento: "Carrito abandonado", email: "a@b.co" })
  })

  it("usa el encabezado como tipo de evento", async () => {
    const hoja = hojaOk()
    await recibirWebhook(peticion(JSON.stringify({ email: "a@b.co" }), "application/json", { "x-wemany-event": "payment.rejected" }), "codigo-correcto", ENTORNO, { fetch: hoja, ahora: AHORA })
    const enviado = JSON.parse(String((hoja.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(enviado.fila.evento).toBe("Pago rechazado")
  })

  it("responde 400 si el cuerpo no es JSON", async () => {
    const res = await recibirWebhook(peticion("{no es json"), "codigo-correcto", ENTORNO, { fetch: hojaOk() })
    expect(res.status).toBe(400)
  })

  it("responde 413 si el cuerpo es enorme", async () => {
    const res = await recibirWebhook(peticion("x".repeat(200_001)), "codigo-correcto", ENTORNO, { fetch: hojaOk() })
    expect(res.status).toBe(413)
  })

  it("responde 503 si la hoja no está configurada o la URL no es de Google", async () => {
    const sinHoja = await recibirWebhook(peticion("{}"), "codigo-correcto", { ...ENTORNO, SHEETS_SCRIPT_URL: "pendiente" })
    expect(sinHoja.status).toBe(503)
    const otraUrl = await recibirWebhook(peticion("{}"), "codigo-correcto", { ...ENTORNO, SHEETS_SCRIPT_URL: "https://malo.example.com/exec" })
    expect(otraUrl.status).toBe(503)
  })

  it("responde 502 para que Wemany reintente si la hoja falla", async () => {
    const cae = vi.fn(async () => {
      throw new Error("red")
    })
    expect((await recibirWebhook(peticion("{}"), "codigo-correcto", ENTORNO, { fetch: cae })).status).toBe(502)
    const rechaza = vi.fn(async () => Response.json({ ok: false }))
    expect((await recibirWebhook(peticion("{}"), "codigo-correcto", ENTORNO, { fetch: rechaza })).status).toBe(502)
  })
})
