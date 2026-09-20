import type { Metadata } from "next"
import type { Book } from "@/content/types"

export function bookMetadata(book: Book): Metadata {
  const title = `${book.titulo} — ${book.autor}`
  const description = book.subtitulo
  return {
    title,
    description,
    alternates: { canonical: `/libro/${book.slug}` },
    openGraph: { title, description, type: "website", locale: "es_LA" },
    twitter: { card: "summary_large_image", title, description },
  }
}
