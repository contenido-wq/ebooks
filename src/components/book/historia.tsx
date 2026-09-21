import Image from "next/image"
import type { Book } from "@/content/types"

export function Historia({ book }: { book: Book }) {
  const { historia } = book.landing

  return (
    <section id="el-libro" className="relative isolate scroll-mt-4 overflow-hidden bg-papel text-tinta">
      <div className="mx-auto grid w-full max-w-7xl md:min-h-[34rem] md:grid-cols-2">
        <div className="relative z-10 px-5 py-16 sm:px-8 md:py-28">
          <h2 className="font-serif text-[clamp(2.4rem,6vw,4.4rem)] font-extrabold leading-[0.98] tracking-[-0.03em]">
            {historia.tituloClaro} <span className="block text-oro-medio">{historia.tituloDorado}</span>
          </h2>
          <p className="mt-6 max-w-sm text-lg leading-relaxed text-tinta-suave">{historia.bajada}</p>
          <div aria-hidden className="mt-6 h-0.5 w-10 bg-oro" />
          <p className="mt-6 font-semibold">{historia.prologo}</p>
        </div>

        <div className="relative aspect-[10/7] md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[62%]">
          <Image
            src={historia.imagen.src}
            alt={historia.imagen.alt}
            fill
            sizes="(min-width: 768px) 62vw, 100vw"
            className="object-cover object-center"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-papel via-transparent to-transparent md:hidden" />
          <div
            aria-hidden
            className="absolute inset-0 hidden bg-gradient-to-r from-papel from-5% via-papel/10 via-35% to-transparent md:block"
          />
        </div>
      </div>
    </section>
  )
}
