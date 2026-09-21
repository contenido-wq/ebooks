import Image from "next/image"
import { ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { SiteHeader } from "./site-header"

export function Hero({ book }: { book: Book }) {
  const hero = book.landing.hero

  return (
    <section id="hero" className="relative isolate overflow-hidden bg-negro text-papel">
      {/*
        En celular la foto ocupa la parte de arriba y el texto va debajo; en pantallas anchas es el fondo.
        La altura nunca baja de 56,25 % del ancho (la proporción 16:9 de la foto): así el recorte es solo por los
        lados y jamás se corta la cabeza, ni en monitores muy anchos ni con el celular de lado.
      */}
      <div className="relative h-[max(68svh,56.25vw)] lg:absolute lg:inset-0 lg:-z-10 lg:h-auto">
        {/* Con poco ancho se enfoca la parte de la foto donde están él y el libro. */}
        <Image
          src={hero.imagen.src}
          alt={hero.imagen.alt}
          fill
          priority
          quality={92}
          sizes="100vw"
          className="object-cover object-[74%_center] lg:object-right"
        />
        {/* Degradados: oscurecen la foto, funden con el texto y dejan legible el encabezado. */}
        <div aria-hidden className="absolute inset-0 bg-negro/10" />
        <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-negro/75 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-negro to-transparent lg:hidden" />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-gradient-to-r from-negro/95 from-0% via-negro/50 via-38% to-transparent to-68% lg:block"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-t from-negro/80 to-transparent lg:block" />
      </div>

      <SiteHeader titulo={book.titulo} lateral={hero.lateralSuperior} />

      <div className="relative mx-auto -mt-16 flex w-full max-w-7xl flex-col px-5 pb-14 sm:px-8 lg:mt-0 lg:min-h-[max(100svh,56.25vw)] lg:justify-center lg:pb-20 lg:pt-32">
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="font-serif text-[clamp(2.7rem,8.6vw,5.9rem)] font-extrabold leading-[0.95] tracking-[-0.03em] lg:text-[clamp(2.6rem,5.4vw,5.9rem)]">
            <span className="block">{hero.tituloClaro}</span> <span className="texto-oro block">{hero.tituloDorado}</span>
          </h1>
          <div aria-hidden className="mt-5 h-px w-4/5 max-w-sm bg-oro" />
          <p className="mt-6 max-w-md text-lg leading-relaxed text-papel/90">{hero.bajada}</p>
          <p className="mt-6 inline-block border border-oro px-4 py-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-oro-claro">
            {hero.etiqueta}
          </p>
          <div className="mt-6">
            <ButtonLink href="#comprar">
              {hero.cta} <span aria-hidden>→</span>
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-papel/85">{book.autor}</p>
          <p className="mt-5 -rotate-3 font-manuscrita text-3xl leading-tight text-oro-claro lg:max-w-[12rem]">
            {hero.fraseManuscrita}
          </p>
        </div>
      </div>
    </section>
  )
}
