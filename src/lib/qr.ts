import QRCode from "qrcode"
import sharp from "sharp"

export const STORY_SIZE = { width: 1080, height: 1920 } as const

const INK = "#1d1a16"
const INK_SOFT = "#5b5347"
const PAPER = "#f6f0e4"
const GOLD = "#8a6420"

// El QR de la tarjeta mide 640 px y va sobre una caja blanca de 760 px, centrada.
const CARD_QR = { size: 640, left: 220, top: 860 }
const CARD_BOX = { size: 760, left: 160, top: 800 }

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const word of text.trim().split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function storySvg({ titulo, autor }: { titulo: string; autor: string }): string {
  const { width, height } = STORY_SIZE
  const autores = wrapText(autor.toUpperCase(), 24)
    .map(
      (linea, i) =>
        `<text x="${width / 2}" y="${220 + i * 52}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" letter-spacing="6" fill="${GOLD}">${escapeXml(linea)}</text>`,
    )
    .join("")
  const lineas = wrapText(titulo, 16)
    .map(
      (linea, i) =>
        `<text x="${width / 2}" y="${430 + i * 112}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="96" fill="${INK}">${escapeXml(linea)}</text>`,
    )
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${PAPER}"/>
  ${autores}
  ${lineas}
  <rect x="${CARD_BOX.left}" y="${CARD_BOX.top}" width="${CARD_BOX.size}" height="${CARD_BOX.size}" rx="40" fill="#ffffff"/>
  <text x="${width / 2}" y="1690" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="52" fill="${INK}">Escanea para leerlo</text>
  <text x="${width / 2}" y="1758" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${INK_SOFT}">Lectura en línea</text>
  <rect x="${width / 2 - 60}" y="1810" width="120" height="4" fill="${GOLD}"/>
</svg>`
}

export type QrAssets = { png: Buffer; svg: string; story: Buffer }

export async function generateQrAssets(
  url: string,
  meta: { titulo: string; autor: string },
): Promise<QrAssets> {
  const options = { errorCorrectionLevel: "M" as const, color: { dark: INK, light: "#ffffff" } }

  const [svg, png, storyQr] = await Promise.all([
    QRCode.toString(url, { ...options, type: "svg", margin: 1 }),
    QRCode.toBuffer(url, { ...options, type: "png", width: 1024, margin: 2 }),
    QRCode.toBuffer(url, { ...options, type: "png", width: CARD_QR.size, margin: 1 }),
  ])

  const story = await sharp(Buffer.from(storySvg(meta)))
    .composite([{ input: storyQr, left: CARD_QR.left, top: CARD_QR.top }])
    .png()
    .toBuffer()

  return { png, svg, story }
}
