import Image from "next/image"
import { ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"

export function Cierre({ book }: { book: Book }) {
  const { cierre } = book.landing

  return (
    <section className="relative isolate overflow-hidden bg-negro text-papel">
      <Image
        src={cierre.imagen.src}
        alt={cierre.imagen.alt}
        fill
        sizes="100vw"
        className="-z-20 object-cover object-[left_30%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-negro/55 md:bg-gradient-to-l md:from-negro/70 md:via-negro/30 md:to-transparent" />

      <div className="relative mx-auto grid w-full max-w-7xl px-5 py-20 sm:px-8 md:min-h-[max(26rem,min(50vw,700px))] md:grid-cols-2 md:items-center md:py-28">
        <div aria-hidden className="hidden w-32 justify-self-end border-l border-oro/70 pl-4 xl:mr-12 xl:block">
          {cierre.lateral.map((linea, i) => (
            <p key={linea} className={`text-[0.65rem] font-medium uppercase leading-relaxed tracking-[0.25em] ${i > 0 ? "mt-3" : ""}`}>
              {linea}
            </p>
          ))}
        </div>

        <div className="md:col-start-2">
          <h2 className="font-serif text-[clamp(2rem,5vw,3.2rem)] font-bold leading-tight tracking-[-0.02em]">
            {cierre.tituloClaro} <span className="texto-oro block">{cierre.tituloDorado}</span>
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-papel/90">{cierre.bajada}</p>
          <div className="mt-7">
            <ButtonLink href="#comprar">
              {cierre.cta} <span aria-hidden>→</span>
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-papel/80">{cierre.nota}</p>
        </div>
      </div>
    </section>
  )
}
