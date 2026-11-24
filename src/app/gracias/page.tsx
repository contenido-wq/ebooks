import type { Metadata } from "next"
import { Gracias } from "@/components/book/gracias"
import { getFeaturedBook } from "@/content/books"
import { buildWhatsappUrl } from "@/lib/whatsapp"

// Página para quien ya compró: no debe aparecer en Google.
export const metadata: Metadata = {
  title: "¡Gracias por tu compra!",
  robots: { index: false, follow: false },
}

export default function GraciasPage() {
  const book = getFeaturedBook()

  const whatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    `Hola, compré "${book.titulo}" y no encuentro mi descarga`,
  )

  return <Gracias book={book} whatsappUrl={whatsappUrl} />
}
