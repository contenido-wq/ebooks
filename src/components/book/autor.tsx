import Image from "next/image"
import type { Book } from "@/content/types"

export function Autor({ book }: { book: Book }) {
  const { autor } = book.landing

  return (
    <section id="autor" className="relative isolate scroll-mt-4 overflow-hidden bg-verde-profundo text-papel">
      <div className="relative aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto">
        <Image
          src={autor.imagen.src}
          alt={autor.imagen.alt}
          fill
          sizes="100vw"
          className="object-cover object-left"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-verde-profundo to-transparent lg:hidden" />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-gradient-to-r from-transparent via-verde-profundo/35 to-verde-profundo/90 lg:block"
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl px-5 pb-16 pt-2 sm:px-8 lg:min-h-[26rem] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center lg:py-24">
        <p
          aria-hidden
          className="absolute right-8 top-1/2 hidden w-28 -translate-y-1/2 border-l border-oro/70 pl-4 text-[0.65rem] font-medium uppercase leading-relaxed tracking-[0.25em] xl:block"
        >
          {autor.lateral}
        </p>
        <div className="lg:col-start-2">
          <h2 className="font-serif text-3xl font-bold leading-tight tracking-[-0.02em] lg:text-4xl xl:text-[2.4rem]">{autor.titulo}</h2>
          <div aria-hidden className="mt-5 h-px w-16 bg-oro" />
          <p className="mt-5 text-lg font-semibold">{autor.nombre}</p>
          <p className="mt-2 max-w-md leading-relaxed text-papel/85">{autor.descripcion}</p>
          <p className="mt-4 text-sm text-papel/85">{autor.escritoPor}</p>
        </div>
      </div>
    </section>
  )
}
