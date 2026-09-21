// @vitest-environment node
import jsQR from "jsqr"
import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { STORY_SIZE, escapeXml, generateQrAssets, wrapText } from "./qr"

const URL_QR = "https://tienda.ejemplo.com/qr"
const meta = { titulo: "Si Dios jugara fútbol", autor: "Juan Guillermo Ricaurte y Jeins Durán" }

async function decodificar(imagen: Buffer): Promise<string | null> {
  const { data, info } = await sharp(imagen).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null
}

describe("escapeXml", () => {
  it("escapa los caracteres especiales de XML", () => {
    expect(escapeXml(`A & B <c> "d" 'e'`)).toBe("A &amp; B &lt;c&gt; &quot;d&quot; &apos;e&apos;")
  })
})

describe("wrapText", () => {
  it("parte el texto en líneas sin pasar del máximo", () => {
    expect(wrapText("Si Dios jugara fútbol", 16)).toEqual(["Si Dios jugara", "fútbol"])
  })

  it("deja una palabra larga en su propia línea", () => {
    expect(wrapText("Extraordinariamente bueno", 10)).toEqual(["Extraordinariamente", "bueno"])
  })

  it("devuelve una lista vacía con texto vacío", () => {
    expect(wrapText("   ", 10)).toEqual([])
  })
})

describe("generateQrAssets", () => {
  it("genera un PNG válido que al escanearlo devuelve la URL", async () => {
    const { png } = await generateQrAssets(URL_QR, meta)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    expect(await decodificar(png)).toBe(URL_QR)
  })

  it("genera un SVG", async () => {
    const { svg } = await generateQrAssets(URL_QR, meta)
    expect(svg).toContain("<svg")
  })

  it("genera la tarjeta 9:16 de 1080×1920 con un QR que también escanea", async () => {
    const { story } = await generateQrAssets(URL_QR, meta)
    const info = await sharp(story).metadata()
    expect(info.width).toBe(STORY_SIZE.width)
    expect(info.height).toBe(STORY_SIZE.height)
    expect(await decodificar(story)).toBe(URL_QR)
  })

  it("tolera textos con caracteres especiales sin romper el SVG de la tarjeta", async () => {
    const { story } = await generateQrAssets(URL_QR, { titulo: `Rock & "Roll" <3`, autor: "A & B" })
    const info = await sharp(story).metadata()
    expect(info.width).toBe(STORY_SIZE.width)
  })
})
