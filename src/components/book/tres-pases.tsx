import Image from "next/image"
import type { Book } from "@/content/types"
import { IconoBalon } from "./iconos"

// Cada foto lleva un corte inclinado distinto en su borde superior, como en el diseño.
const CORTES = [
  "polygon(0 5%, 100% 0, 100% 100%, 0 100%)",
  "polygon(0 0, 100% 5%, 100% 100%, 0 100%)",
  "polygon(0 4%, 100% 0, 100% 100%, 0 96%)",
]

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, "0")
}

export function TresPases({ book }: { book: Book }) {
  const { pases } = book.landing

  return (
    <section id="capitulos" className="scroll-mt-4 bg-papel text-tinta">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24">
        <h2 className="font-serif text-[clamp(3rem,9vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">
          {pases.titulo}
        </h2>
        <p className="mt-2 font-serif text-[clamp(1.5rem,4vw,2.6rem)] font-semibold leading-tight tracking-[-0.02em]">
          {pases.subtitulo}
        </p>

        <div className="relative mt-12 grid gap-12 md:mt-16 md:grid-cols-3 md:gap-6 lg:gap-8">
          {/* Flechas punteadas entre los tres números (solo en pantallas anchas). */}
          <svg
            aria-hidden
            viewBox="0 0 1000 90"
            preserveAspectRatio="none"
            fill="none"
            className="pointer-events-none absolute inset-x-0 -top-2 hidden h-20 w-full text-oro-medio lg:block"
          >
            <defs>
              <marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </marker>
            </defs>
            <path d="M118 47C185 6 262 6 328 50" stroke="currentColor" strokeWidth="2" strokeDasharray="7 7" vectorEffect="non-scaling-stroke" markerEnd="url(#punta)" />
            <path d="M448 47C515 6 595 6 668 50" stroke="currentColor" strokeWidth="2" strokeDasharray="7 7" vectorEffect="non-scaling-stroke" markerEnd="url(#punta)" />
          </svg>

          {pases.tarjetas.map((tarjeta, indice) => (
            <article key={tarjeta.minuto}>
              <div className="flex items-center gap-2">
                <span className="font-serif text-6xl font-extrabold leading-none tracking-[-0.04em] text-oro-medio md:text-7xl">
                  {dosDigitos(tarjeta.minuto)}
                </span>
                <IconoBalon className="h-7 w-7 md:h-8 md:w-8" />
              </div>

              <div className="mt-5 aspect-[4/5] overflow-hidden" style={{ clipPath: CORTES[indice % CORTES.length] }}>
                <Image
                  src={tarjeta.imagen.src}
                  alt={tarjeta.imagen.alt}
                  width={tarjeta.imagen.ancho}
                  height={tarjeta.imagen.alto}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-tinta-suave">
                Minuto {dosDigitos(tarjeta.minuto)} · {tarjeta.nombre}
              </p>
              <h3 className="mt-2 font-serif text-2xl font-bold leading-tight tracking-[-0.02em] md:text-xl lg:text-[1.7rem]">
                {tarjeta.titulo}
              </h3>
              <p className="mt-3 leading-relaxed text-tinta-suave">{tarjeta.texto}</p>
              <p className="mt-4 font-serif text-lg font-semibold italic leading-snug text-oro-medio">{tarjeta.pregunta}</p>
            </article>
          ))}
        </div>

        <a
          href="#comprar"
          className="mt-14 flex items-center gap-5 text-oro-texto transition hover:text-tinta"
        >
          <span aria-hidden className="h-px flex-1 bg-oro" />
          <span className="text-center font-serif text-lg font-semibold italic">
            {pases.enlace} <span aria-hidden>→</span>
          </span>
          <span aria-hidden className="h-px flex-1 bg-oro" />
        </a>
      </div>
    </section>
  )
}
