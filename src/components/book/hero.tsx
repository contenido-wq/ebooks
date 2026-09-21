import { getImageProps } from "next/image"
import { ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { SiteHeader } from "./site-header"

export function Hero({ book }: { book: Book }) {
  const hero = book.landing.hero

  // Dirección de arte: foto horizontal en pantallas anchas y vertical en el celular, sin descargar las dos.
  const { props: escritorio } = getImageProps({
    src: hero.imagenHorizontal.src,
    width: hero.imagenHorizontal.ancho,
    height: hero.imagenHorizontal.alto,
    alt: hero.imagenHorizontal.alt,
    sizes: "100vw",
    quality: 80,
  })
  const {
    props: { srcSet: srcSetMovil, ...imagenMovil },
  } = getImageProps({
    src: hero.imagenMovil.src,
    width: hero.imagenMovil.ancho,
    height: hero.imagenMovil.alto,
    alt: hero.imagenMovil.alt,
    sizes: "100vw",
    quality: 80,
    priority: true,
  })

  return (
    <section id="hero" className="relative isolate overflow-hidden bg-negro text-papel">
      {/* En celular la foto ocupa la parte de arriba y el texto va debajo; en pantallas anchas es el fondo. */}
      <div className="relative h-[68svh] md:absolute md:inset-0 md:-z-10 md:h-auto">
        <picture>
          <source media="(min-width: 768px)" srcSet={escritorio.srcSet} />
          <img
            {...imagenMovil}
            alt={hero.imagenMovil.alt}
            srcSet={srcSetMovil}
            className="absolute inset-0 h-full w-full object-cover object-top md:object-right"
          />
        </picture>
        {/* Degradados: funden la foto con el texto y dejan legible el encabezado. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-negro/70 to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-negro to-transparent md:hidden" />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-gradient-to-r from-negro/95 via-negro/55 to-transparent md:block"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-t from-negro/80 to-transparent md:block" />
      </div>

      <SiteHeader titulo={book.titulo} lateral={hero.lateralSuperior} />

      <div className="relative mx-auto -mt-16 flex w-full max-w-7xl flex-col px-5 pb-14 sm:px-8 md:mt-0 md:min-h-[100svh] md:justify-center md:pb-20 md:pt-32">
        <div className="max-w-xl lg:max-w-2xl">
          <h1 className="font-serif text-[clamp(2.7rem,8.6vw,5.9rem)] font-extrabold leading-[0.95] tracking-[-0.03em]">
            {hero.tituloClaro} <span className="texto-oro">{hero.tituloDorado}</span>
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
          <p className="mt-5 -rotate-3 font-manuscrita text-3xl leading-tight text-oro-claro md:max-w-[12rem]">
            {hero.fraseManuscrita}
          </p>
        </div>

        <div
          aria-hidden
          className="absolute right-8 top-1/2 hidden w-28 -translate-y-1/2 border-l border-oro/70 pl-4 lg:block"
        >
          {hero.lateralDerecha.map((linea, i) => (
            <p key={linea} className={`text-[0.65rem] font-medium uppercase leading-relaxed tracking-[0.25em] ${i > 0 ? "mt-6" : ""}`}>
              {linea}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
