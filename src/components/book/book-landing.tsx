import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"
import { buildWhatsappUrl } from "@/lib/whatsapp"
import { Audience } from "./audience"
import { Author } from "./author"
import { Contents } from "./contents"
import { Faq } from "./faq"
import { Guarantee } from "./guarantee"
import { Hero } from "./hero"
import { PurchasePanel } from "./purchase-panel"
import { StickyBuyBar } from "./sticky-buy-bar"
import { Testimonials } from "./testimonials"

export function BookLanding({ book }: { book: Book }) {
  const whatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    `Hola, tengo una pregunta sobre "${book.titulo}"`,
  )

  return (
    <>
      <main>
        <Hero book={book} />
        <Audience book={book} />
        <Contents book={book} />
        <Author book={book} />
        <Testimonials book={book} />
        <Guarantee book={book} />
        <Faq book={book} />
        <PurchasePanel book={book} whatsappUrl={whatsappUrl} />
      </main>
      <footer className="px-4 pb-24 pt-8 text-center text-sm text-tinta-suave md:pb-10">
        © {book.anioPublicacion} {book.autor}. Distribución digital: Ebooks de Jhei Trujillo.
      </footer>
      <StickyBuyBar precio={formatPrice(book.precioUsd, "USD")} />
    </>
  )
}
