import { ImageResponse } from "next/og"
import { getFeaturedBook } from "@/content/books"
import { formatPrice } from "@/lib/format-price"

export const alt = "Portada y datos del libro"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  const book = getFeaturedBook()

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#f6f0e4",
          color: "#1d1a16",
          padding: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: "#8a6420" }}>
            {book.autor}
          </div>
          <div style={{ fontSize: 84, lineHeight: 1.05, marginTop: 24 }}>{book.titulo}</div>
          <div style={{ fontSize: 34, marginTop: 32, color: "#5b5347" }}>
            {`Ebook · ${formatPrice(book.precioUsd, "USD")}`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 300,
            height: 450,
            padding: 28,
            borderRadius: 8,
            background: "#163f2b",
            color: "#f6f0e4",
            boxShadow: "0 30px 60px -20px rgba(29,26,22,0.45)",
          }}
        >
          <div style={{ fontSize: 16, letterSpacing: 4, textTransform: "uppercase", color: "#b8893a" }}>
            {book.autor}
          </div>
          <div style={{ fontSize: 40, lineHeight: 1.1 }}>{book.titulo}</div>
        </div>
      </div>
    ),
    size,
  )
}
