import { describe, expect, it } from "vitest"
import { buildWhatsappUrl } from "./whatsapp"

describe("buildWhatsappUrl", () => {
  it("deja solo dígitos y codifica el mensaje", () => {
    expect(buildWhatsappUrl("+57 300 123 4567", "Hola, ¿qué tal?")).toBe(
      "https://wa.me/573001234567?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F",
    )
  })

  it("quita los ceros iniciales", () => {
    expect(buildWhatsappUrl("0057300123", "Hola")).toBe("https://wa.me/57300123?text=Hola")
  })

  it("devuelve null si no hay número", () => {
    expect(buildWhatsappUrl("", "Hola")).toBeNull()
    expect(buildWhatsappUrl("   ", "Hola")).toBeNull()
  })
})
