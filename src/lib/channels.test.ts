import { describe, expect, it } from "vitest"
import { channelUrl } from "./channels"

describe("channelUrl", () => {
  it("arma la URL de Instagram con sus UTM", () => {
    expect(channelUrl("ig", "http://localhost:3000")).toBe(
      "http://localhost:3000/?utm_source=instagram&utm_medium=bio&utm_campaign=tienda",
    )
  })

  it("arma la URL de cada canal con su fuente y medio", () => {
    expect(channelUrl("tiktok", "https://t.ejemplo.com")).toBe(
      "https://t.ejemplo.com/?utm_source=tiktok&utm_medium=bio&utm_campaign=tienda",
    )
    expect(channelUrl("wa", "https://t.ejemplo.com")).toBe(
      "https://t.ejemplo.com/?utm_source=whatsapp&utm_medium=chat&utm_campaign=tienda",
    )
    expect(channelUrl("qr", "https://t.ejemplo.com")).toBe(
      "https://t.ejemplo.com/?utm_source=qr&utm_medium=offline&utm_campaign=tienda",
    )
  })
})
