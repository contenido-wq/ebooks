import { ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"
import { Cover } from "./cover"

export function Hero({ book }: { book: Book }) {
  return (
    <section
      id="hero"
      className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-2 md:gap-16 md:pt-20"
    >
      <div className="mx-auto w-3/4 max-w-xs md:order-2 md:w-full md:max-w-sm">
        <div className="cover-tilt">
          <Cover titulo={book.titulo} autor={book.autor} src={book.portada} />
        </div>
      </div>
      <div className="text-center md:text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dorado">{book.autor}</p>
        <h1 className="mt-4 text-balance font-serif text-4xl leading-tight sm:text-5xl md:text-6xl">
          {book.titulo}
        </h1>
        <p className="mt-4 text-pretty text-lg text-tinta-suave">{book.subtitulo}</p>
        <div className="mt-8 flex flex-col items-center gap-3 md:items-start">
          <ButtonLink href="#comprar">
            Comprar ahora · {formatPrice(book.precioUsd, "USD")}
          </ButtonLink>
          <p className="text-sm text-tinta-suave">
            Lectura en línea · Garantía de {book.garantiaDias} días
          </p>
        </div>
      </div>
    </section>
  )
}
