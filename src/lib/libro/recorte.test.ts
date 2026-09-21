import { describe, expect, it } from "vitest"
import { cajaAPixeles } from "./recorte"

describe("cajaAPixeles", () => {
  it("convierte puntos a píxeles según los dpi y redondea", () => {
    expect(cajaAPixeles({ x: 21, y: 21, ancho: 425.2, alto: 680.32 }, 200)).toEqual({
      x: 58,
      y: 58,
      ancho: 1181,
      alto: 1890,
    })
  })

  it("con 72 dpi los puntos son píxeles", () => {
    expect(cajaAPixeles({ x: 10, y: 20, ancho: 100, alto: 200 }, 72)).toEqual({
      x: 10,
      y: 20,
      ancho: 100,
      alto: 200,
    })
  })
})
