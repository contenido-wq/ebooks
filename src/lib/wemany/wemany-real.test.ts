import { createHmac } from "node:crypto"
import { describe, expect, it, vi } from "vitest"
import { construirFila } from "./normalizar"
import { recibirWebhook, verificarFirma } from "./recibir"

const AHORA = new Date("2026-09-15T20:01:00Z")

// Ejemplo de la documentación de Wemany (member.joined), con los valores de muestra.
const MIEMBRO = {
  id: "0b4d5e6f-7a8b-5c9d-ae1f-2a3b4c5d6e7f",
  type: "member.joined",
  createdAt: "2026-09-15T20:00:01.000Z",
  communityId: "c0ffee11-2233-4455-6677-8899aabbccdd",
  data: {
    occurredAt: "2026-09-15T20:00:00.000Z",
    isReactivation: false,
    customer: { userId: "a1b2", fullName: "Ana Torres", username: "anatorres", email: "ana@example.com", phone: null, country: "CO" },
    community: { id: "c0ffee11", name: "Club de Producto" },
    subscription: { id: "5e6f", startDate: "2026-09-15T20:00:00.000Z", isTrial: false, provider: "stripe" },
    plan: { id: "9a8b", name: "Plan mensual", price: 29.99, currency: "USD", isRecurring: true, duration: "1 months" },
    payment: { status: "paid", amountPaid: 29.99, netValue: 26.99, currency: "USD", paymentMethod: "card" },
    form: null,
    attributionOrigin: "buyer_supplied",
    customerAttribution: {
      first: { queryParams: { utm_source: "facebook", utm_campaign: "lanzamiento", fbclid: "IwAR0primero" }, capturedAt: "x", source: "join" },
      last: { queryParams: { utm_source: "instagram", utm_campaign: "otono", ref: "juan" }, capturedAt: "y", source: "purchase" },
    },
  },
}

describe("member.joined real de Wemany", () => {
  const fila = construirFila(MIEMBRO, AHORA)

  it("llena los campos del comprador y del pago", () => {
    expect(fila).toMatchObject({
      evento: "Nuevo miembro",
      nombre: "Ana Torres",
      email: "ana@example.com",
      telefono: "", // phone: null -> vacío
      pais: "CO",
      producto: "Plan mensual",
      monto: 29.99,
      valor_neto: 26.99,
      moneda: "USD",
      metodo_pago: "card",
      estado: "paid",
      reactivacion: "false",
      id_evento: "0b4d5e6f-7a8b-5c9d-ae1f-2a3b4c5d6e7f",
      evento_original: "member.joined",
    })
  })

  it("no toma el historial del cliente (customerAttribution) como UTM de esta compra", () => {
    expect(fila.utm_source).toBe("")
    expect(fila.utm_campaign).toBe("")
  })

  it("guarda el JSON completo, historial incluido, para consulta", () => {
    expect(fila.payload).toContain("lanzamiento")
  })
})

describe("importes: vacío no es cero", () => {
  it("un alta gratis con cobro desconocido deja el monto vacío y no usa el precio del plan", () => {
    const gratis = structuredClone(MIEMBRO)
    gratis.data.payment = { status: "unavailable", amountPaid: null, netValue: null, currency: null, paymentMethod: null } as never
    const fila = construirFila(gratis, AHORA)
    expect(fila.monto).toBe("")
    expect(fila.valor_neto).toBe("")
    expect(fila.estado).toBe("unavailable")
  })
})

describe("compra, carrito y rechazo (estructura supuesta de la documentación)", () => {
  it("lee los dos teléfonos, las UTM del evento y el origen", () => {
    const fila = construirFila(
      {
        id: "evt_1",
        type: "purchase.approved",
        data: {
          customer: { fullName: "Luis Gómez", email: "LUIS@mail.com", phone: "+573001111111", country: "CO" },
          billingPhone: "+573002222222",
          payment: { status: "paid", amountPaid: 79900, netValue: 74000, currency: "COP", paymentMethod: "pse" },
          utm: { utm_source: "instagram", utm_medium: "bio", utm_campaign: "libro", utm_content: "reel1" },
          customOrigin: "landing",
          attributionOrigin: "buyer_supplied",
        },
      },
      AHORA,
    )
    expect(fila).toMatchObject({
      evento: "Compra aprobada",
      email: "luis@mail.com",
      telefono: "+573001111111",
      telefono_facturacion: "+573002222222",
      monto: 79900,
      valor_neto: 74000,
      utm_source: "instagram",
      utm_medium: "bio",
      utm_campaign: "libro",
      utm_content: "reel1",
      origen: "landing",
    })
  })

  it("reconoce UTM dentro de queryParams y utm.source", () => {
    const a = construirFila({ type: "cart.abandoned", data: { queryParams: { utm_source: "tiktok", fbclid: "x" } } }, AHORA)
    expect(a.utm_source).toBe("tiktok")
    expect(a.evento).toBe("Carrito abandonado")
    const b = construirFila({ type: "payment.rejected", data: { utm: { source: "wa", medium: "chat" } } }, AHORA)
    expect(b.utm_source).toBe("wa")
    expect(b.utm_medium).toBe("chat")
    expect(b.evento).toBe("Pago rechazado")
  })

  it("trata las UTM como texto: recorta y no deja pasar caracteres de control ni fórmulas ejecutables", () => {
    const fila = construirFila({ type: "x", data: { utm: { utm_source: "=HYPERLINK(\"http://malo\")\n" + "a".repeat(500) } } }, AHORA)
    expect(String(fila.utm_source).length).toBeLessThanOrEqual(200)
    expect(String(fila.utm_source)).not.toMatch(/\n/)
  })

  it("el id del encabezado X-Wemany-Event-Id manda sobre el del cuerpo", () => {
    const fila = construirFila({ id: "del-cuerpo" }, AHORA, { idEventoEncabezado: "del-encabezado" })
    expect(fila.id_evento).toBe("del-encabezado")
  })
})

// --- Firma ---------------------------------------------------------------------------------------------------

const SECRETO = "whsec_prueba_secreto_123"
const CUERPO = JSON.stringify(MIEMBRO)

function firmar(cuerpo: string, t: number, secreto = SECRETO): string {
  return createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest("hex")
}
const bytes = (s: string) => new TextEncoder().encode(s)
const AHORA_MS = Date.UTC(2026, 8, 15, 20, 1, 0)
const T = Math.floor(AHORA_MS / 1000)

describe("verificarFirma", () => {
  it("acepta una firma válida", async () => {
    const cab = `t=${T},v1=${firmar(CUERPO, T)}`
    expect(await verificarFirma(cab, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("ok")
  })

  it("acepta si hay varias v1 y una es válida (rotación de secreto)", async () => {
    const cab = `t=${T},v1=${"0".repeat(64)},v1=${firmar(CUERPO, T)}`
    expect(await verificarFirma(cab, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("ok")
  })

  it("rechaza si cambia un solo carácter del cuerpo", async () => {
    const cab = `t=${T},v1=${firmar(CUERPO, T)}`
    expect(await verificarFirma(cab, bytes(CUERPO.replace("Ana", "Anb")), SECRETO, AHORA_MS)).toBe("invalida")
  })

  it("rechaza con otro secreto", async () => {
    const cab = `t=${T},v1=${firmar(CUERPO, T, "otro")}`
    expect(await verificarFirma(cab, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("invalida")
  })

  it("rechaza si la marca de tiempo está fuera de 300 s, pero acepta justo en el límite", async () => {
    const vieja = T - 301
    expect(await verificarFirma(`t=${vieja},v1=${firmar(CUERPO, vieja)}`, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("vencida")
    const futura = T + 301
    expect(await verificarFirma(`t=${futura},v1=${firmar(CUERPO, futura)}`, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("vencida")
    const limite = T - 300
    expect(await verificarFirma(`t=${limite},v1=${firmar(CUERPO, limite)}`, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("ok")
  })

  it("una firma capturada no sirve con otra marca de tiempo", async () => {
    const cab = `t=${T + 10},v1=${firmar(CUERPO, T)}`
    expect(await verificarFirma(cab, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("invalida")
  })

  it("distingue cabecera ausente o mal formada", async () => {
    expect(await verificarFirma(null, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("sin_firma")
    expect(await verificarFirma("basura", bytes(CUERPO), SECRETO, AHORA_MS)).toBe("formato")
    expect(await verificarFirma(`t=abc,v1=1`, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("formato")
    expect(await verificarFirma(`t=${T}`, bytes(CUERPO), SECRETO, AHORA_MS)).toBe("formato")
  })

  it("firma sobre los bytes exactos: espacios y tildes del cuerpo crudo cuentan", async () => {
    const crudo = '{ "nombre" :  "José Ñandú" }\n'
    expect(await verificarFirma(`t=${T},v1=${firmar(crudo, T)}`, bytes(crudo), SECRETO, AHORA_MS)).toBe("ok")
    const compacto = JSON.stringify(JSON.parse(crudo))
    expect(await verificarFirma(`t=${T},v1=${firmar(crudo, T)}`, bytes(compacto), SECRETO, AHORA_MS)).toBe("invalida")
  })

  it("también acepta secretos whsec_ usados como base64", async () => {
    const secretoB64 = "whsec_" + Buffer.from("clave-binaria-1234567890").toString("base64")
    const firma = createHmac("sha256", Buffer.from("clave-binaria-1234567890")).update(`${T}.${CUERPO}`).digest("hex")
    expect(await verificarFirma(`t=${T},v1=${firma}`, bytes(CUERPO), secretoB64, AHORA_MS)).toBe("ok")
  })
})

describe("recibirWebhook con firma", () => {
  const ENTORNO = {
    WEBHOOK_TOKEN: "codigo",
    WEBHOOK_SIGNING_SECRET: SECRETO,
    SHEETS_SCRIPT_URL: "https://script.google.com/macros/s/ABC/exec",
    SHEETS_SCRIPT_TOKEN: "hoja",
  }
  const hojaOk = () => vi.fn(async () => Response.json({ ok: true }))
  const peticion = (cabeceras: Record<string, string>, cuerpo = CUERPO) =>
    new Request("https://sidiosjugarafutbol.com/api/wemany/codigo", {
      method: "POST",
      headers: { "content-type": "application/json", ...cabeceras },
      body: cuerpo,
    })

  it("con secreto: acepta un evento bien firmado y usa el id del encabezado", async () => {
    const hoja = hojaOk()
    const res = await recibirWebhook(
      peticion({ "x-wemany-signature": `t=${T},v1=${firmar(CUERPO, T)}`, "x-wemany-event-id": "EVT-9" }),
      "codigo",
      ENTORNO,
      { fetch: hoja, ahora: () => new Date(AHORA_MS) },
    )
    expect(res.status).toBe(200)
    const enviado = JSON.parse(String((hoja.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(enviado.fila.id_evento).toBe("EVT-9")
    expect(enviado.columnas).toContain("valor_neto")
  })

  it("con secreto: rechaza con 401 un evento sin firma o con firma falsa, y no toca la hoja", async () => {
    const hoja = hojaOk()
    const sin = await recibirWebhook(peticion({}), "codigo", ENTORNO, { fetch: hoja, ahora: () => new Date(AHORA_MS) })
    expect(sin.status).toBe(401)
    const falsa = await recibirWebhook(peticion({ "x-wemany-signature": `t=${T},v1=${"a".repeat(64)}` }), "codigo", ENTORNO, {
      fetch: hoja,
      ahora: () => new Date(AHORA_MS),
    })
    expect(falsa.status).toBe(401)
    expect(hoja).not.toHaveBeenCalled()
  })

  it("sin secreto configurado (o 'pendiente'): basta el código de la dirección", async () => {
    for (const secreto of [undefined, "pendiente", ""]) {
      const hoja = hojaOk()
      const res = await recibirWebhook(peticion({}), "codigo", { ...ENTORNO, WEBHOOK_SIGNING_SECRET: secreto }, { fetch: hoja })
      expect(res.status).toBe(200)
    }
  })

  it("el código de la dirección sigue siendo obligatorio aunque la firma sea válida", async () => {
    const res = await recibirWebhook(peticion({ "x-wemany-signature": `t=${T},v1=${firmar(CUERPO, T)}` }), "otro", ENTORNO, {
      fetch: hojaOk(),
      ahora: () => new Date(AHORA_MS),
    })
    expect(res.status).toBe(404)
  })
})
