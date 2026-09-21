import { readFile } from "node:fs/promises"
import path from "node:path"
import { ImageResponse } from "next/og"
import sharp from "sharp"
import { getFeaturedBook } from "@/content/books"
import { formatPrice } from "@/lib/format-price"

export const alt = "Portada y datos del libro"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const ALTO_PORTADA = 450

/** next/og no lee WebP con seguridad: la portada se convierte a PNG y se incrusta como data URL. */
async function portadaComoDataUrl(src: string): Promise<{ url: string; ancho: number } | null> {
  try {
    const archivo = await readFile(path.join(process.cwd(), "public", src))
    const png = await sharp(archivo).resize({ height: ALTO_PORTADA }).png().toBuffer({ resolveWithObject: true })
    return { url: `data:image/png;base64,${png.data.toString("base64")}`, ancho: png.info.width }
  } catch {
    return null
  }
}

export default async function OpengraphImage() {
  const book = getFeaturedBook()
  const portada = book.portada ? await portadaComoDataUrl(book.portada.src) : null

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(120deg, #0b0a08 0%, #15120e 55%, #0e1c15 100%)",
          color: "#f6f0e4",
          padding: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#c9a15a" }}>
            {book.autor}
          </div>
          <div style={{ fontSize: 84, lineHeight: 1.05, marginTop: 24 }}>{book.titulo}</div>
          <div style={{ width: 120, height: 3, background: "#c9a15a", marginTop: 32 }} />
          <div style={{ fontSize: 34, marginTop: 28, color: "#e8cd92" }}>
            {`Libro digital · ${formatPrice(book.precioUsd, "USD")}`}
          </div>
        </div>
        {portada ? (
          <img
            src={portada.url}
            alt=""
            width={portada.ancho}
            height={ALTO_PORTADA}
            style={{ borderRadius: 8, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.8)" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 280,
              height: ALTO_PORTADA,
              padding: 28,
              borderRadius: 8,
              background: "#0e1c15",
              border: "1px solid #c9a15a",
              color: "#f6f0e4",
            }}
          >
            <div style={{ fontSize: 16, letterSpacing: 4, textTransform: "uppercase", color: "#c9a15a" }}>
              {book.autor}
            </div>
            <div style={{ fontSize: 40, lineHeight: 1.1 }}>{book.titulo}</div>
          </div>
        )}
      </div>
    ),
    size,
  )
}
