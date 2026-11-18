import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"
import { buildWhatsappUrl } from "@/lib/whatsapp"
import { Autor } from "./autor"
import { Cierre } from "./cierre"
import { Faq } from "./faq"
import { Hero } from "./hero"
import { Historia } from "./historia"
import { Mirada } from "./mirada"
import { PurchasePanel } from "./purchase-panel"
import { StickyBuyBar } from "./sticky-buy-bar"
import { Testimonials } from "./testimonials"
import { TresPases } from "./tres-pases"

export function BookLanding({ book }: { book: Book }) {
  const whatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
    `Hola, tengo una pregunta sobre "${book.titulo}"`,
  )

  return (
    <>
      <main>
        <Hero book={book} />
        <Historia book={book} />
        <TresPases book={book} />
        <Autor book={book} />
        <Mirada book={book} />
        <Cierre book={book} />
        <Testimonials book={book} />
        <PurchasePanel book={book} whatsappUrl={whatsappUrl} />
        <Faq book={book} />
      </main>
      <footer className="border-t border-oro/30 bg-negro pb-24 pt-10 text-papel md:pb-10">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-4 px-5 text-center sm:px-8 md:grid-cols-3 md:text-left">
          <p className="font-serif text-2xl font-bold tracking-tight">{book.titulo}</p>
          <p className="text-sm text-papel/85 md:text-center">{book.autor}</p>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.25em] text-oro-claro md:text-right">
            {book.landing.pie.lema}
          </p>
        </div>
        <p className="mx-auto mt-8 max-w-7xl px-5 text-center text-xs text-papel/65 sm:px-8">
          © {book.anioPublicacion} {book.autor}. Distribución digital: Ebooks de Jhei Trujillo.
        </p>
      </footer>
      <StickyBuyBar precio={formatPrice(book.precioUsd, "USD")} />
    </>
  )
}
