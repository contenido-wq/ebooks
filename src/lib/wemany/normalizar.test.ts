import { describe, expect, it } from "vitest"
import { construirFila, etiquetaEvento, fechaColombia, neutralizarFormula } from "./normalizar"

const AHORA = new Date("2026-11-18T04:15:02Z") // 23:15:02 en Colombia

describe("etiquetaEvento", () => {
  it.each([
    ["purchase.approved", "Compra aprobada"],
    ["compra_aprobada", "Compra aprobada"],
    ["cart.abandoned", "Carrito abandonado"],
    ["carrito_abandonado", "Carrito abandonado"],
    ["payment.declined", "Pago rechazado"],
    ["pago_rechazado", "Pago rechazado"],
    ["member.joined", "Nuevo miembro"],
    ["nuevo_miembro", "Nuevo miembro"],
    ["", "Sin evento"],
    ["algo_raro", "algo_raro"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(etiquetaEvento(entrada)).toBe(esperado)
  })
})

describe("fechaColombia", () => {
  it("usa la hora de Colombia", () => {
    expect(fechaColombia(AHORA)).toBe("2026-11-17 23:15:02")
  })
})

describe("construirFila", () => {
  it("lee un payload plano en español", () => {
    const fila = construirFila(
      { evento: "compra_aprobada", nombre: "Ana Gómez", correo: "ANA@Mail.com", telefono: "+573001112233", monto: "79900", moneda: "cop", id: "tx_1" },
      AHORA,
    )
    expect(fila).toMatchObject({
      fecha_recibida: "2026-11-17 23:15:02",
      evento: "Compra aprobada",
      nombre: "Ana Gómez",
      email: "ana@mail.com",
      telefono: "+573001112233",
      monto: 79900,
      moneda: "COP",
      id_evento: "tx_1",
    })
  })

  it("lee un payload anidado en inglés y prefiere el dato más superficial", () => {
    const fila = construirFila(
      {
        type: "cart.abandoned",
        data: {
          id: "evt_9",
          customer: { first_name: "Luis", last_name: "Pérez", email: "luis@mail.com", phone: "3001234567" },
          product: { name: "Si Dios jugara fútbol", price: 19.99 },
          currency: "USD",
        },
      },
      AHORA,
    )
    expect(fila.evento).toBe("Carrito abandonado")
    expect(fila.nombre).toBe("Luis Pérez")
    expect(fila.email).toBe("luis@mail.com")
    expect(fila.producto).toBe("Si Dios jugara fútbol")
    expect(fila.monto).toBe(19.99)
    expect(fila.id_evento).toBe("evt_9")
  })

  it("no confunde el nombre del producto con el del comprador", () => {
    const fila = construirFila({ product: { name: "Libro" }, buyer: { name: "Marta" } }, AHORA)
    expect(fila.nombre).toBe("Marta")
    expect(fila.producto).toBe("Libro")
  })

  it("usa el encabezado como evento si el cuerpo no lo trae", () => {
    const fila = construirFila({ email: "a@b.co" }, AHORA, { eventoEncabezado: "payment.rejected" })
    expect(fila.evento).toBe("Pago rechazado")
  })

  it("guarda el JSON completo pero oculta claves sensibles", () => {
    const fila = construirFila({ email: "a@b.co", card_number: "4111111111111111", api_token: "xyz" }, AHORA)
    expect(fila.payload).toContain("a@b.co")
    expect(fila.payload).not.toContain("4111111111111111")
    expect(fila.payload).not.toContain("xyz")
  })

  it("no deja pasar caracteres de control y recorta textos largos", () => {
    const fila = construirFila({ name: "Ana\n\tPérez" + "x".repeat(2000) }, AHORA)
    expect(String(fila.nombre)).not.toMatch(/[\n\t]/)
    expect(String(fila.nombre).length).toBeLessThanOrEqual(500)
  })

  it("devuelve campos vacíos sin fallar si no entiende el payload", () => {
    const fila = construirFila({ x: 1 }, AHORA)
    expect(fila.evento).toBe("Sin evento")
    expect(fila.email).toBe("")
    expect(fila.monto).toBe("")
  })

  it("no falla con valores que no son objetos", () => {
    expect(construirFila("hola", AHORA).evento).toBe("Sin evento")
    expect(construirFila(null, AHORA).evento).toBe("Sin evento")
  })
})

describe("JSON hostil", () => {
  it("un JSON anidado decenas de miles de niveles no agota la pila", () => {
    const profundo = JSON.parse("[".repeat(50_000) + "]".repeat(50_000))
    expect(() => construirFila(profundo, new Date())).not.toThrow()
    expect(construirFila(profundo, new Date()).evento).toBe("Sin evento")
  })

  it("el payload guardado tiene tope de elementos y de largo", () => {
    const ancho: Record<string, string> = {}
    for (let i = 0; i < 5000; i++) ancho[`k${i}`] = "v".repeat(100)
    expect(String(construirFila(ancho, new Date()).payload).length).toBeLessThanOrEqual(40_000)
  })

  it("no contamina Object.prototype con __proto__", () => {
    construirFila(JSON.parse('{"__proto__":{"contaminado":true}}'), new Date())
    expect(({} as Record<string, unknown>).contaminado).toBeUndefined()
  })
})

describe("inyección de fórmulas en la hoja", () => {
  it.each([
    ['=HYPERLINK("http://evil.example","clic")', `'=HYPERLINK("http://evil.example","clic")`],
    ["=IMPORTXML(\"http://evil\",\"//a\")", `'=IMPORTXML("http://evil","//a")`],
    ["=1+1", "'=1+1"],
    ["@SUM(1+1)", "'@SUM(1+1)"],
    ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
    ["-2+3", "'-2+3"],
    ["  =1+1", "'=1+1"],
    ["\t=1+1", "'=1+1"],
  ])("neutraliza %s", (entrada, esperado) => {
    expect(neutralizarFormula(entrada.replace(/^[\t ]+/, ""))).toBe(esperado)
  })

  it.each(["+573001112233", "+57 300 111 2233", "-5", "(300) 111-2233", "Ana Gómez", "hola=mundo", "a@b.co"])(
    "no toca %s",
    (entrada) => {
      expect(neutralizarFormula(entrada)).toBe(entrada)
    },
  )

  it("se aplica a nombre, correo, producto, UTM y origen que escribe el comprador", () => {
    const fila = construirFila(
      {
        type: "purchase.approved",
        data: {
          customer: { fullName: '=HYPERLINK("http://evil","x")', email: "=cmd@x.co", phone: "+573001112233" },
          plan: { name: "-2+3" },
          utm: { utm_source: "=1+1", utm_campaign: "@x" },
          customOrigin: "=2+2",
        },
      },
      new Date(),
    )
    for (const campo of ["nombre", "email", "producto", "utm_source", "utm_campaign", "origen"] as const) {
      expect(String(fila[campo]).startsWith("'"), `${campo}: ${fila[campo]}`).toBe(true)
    }
    expect(fila.telefono).toBe("+573001112233") // un teléfono legítimo no se altera
  })
})
