import { describe, expect, it } from "vitest"
import { formatPrice } from "./format-price"

describe("formatPrice", () => {
  it("formatea dólares con dos decimales cuando hay centavos", () => {
    expect(formatPrice(19.99, "USD")).toBe("US$19.99")
    expect(formatPrice(15.1, "USD")).toBe("US$15.10")
  })

  it("formatea dólares redondos sin decimales", () => {
    expect(formatPrice(15, "USD")).toBe("US$15")
    expect(formatPrice(5, "USD")).toBe("US$5")
  })

  it("formatea pesos con puntos de miles y sin decimales", () => {
    expect(formatPrice(79900, "COP")).toBe("$79.900 COP")
    expect(formatPrice(1234567, "COP")).toBe("$1.234.567 COP")
    expect(formatPrice(900, "COP")).toBe("$900 COP")
  })
})
