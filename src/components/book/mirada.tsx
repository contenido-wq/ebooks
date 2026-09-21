import type { Book } from "@/content/types"
import { ICONOS, IconoBotin } from "./iconos"

export function Mirada({ book }: { book: Book }) {
  const { mirada } = book.landing

  return (
    <section className="relative bg-papel text-tinta">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 md:py-24">
        <h2 className="font-serif text-[clamp(2.3rem,6vw,4.2rem)] font-extrabold leading-[1] tracking-[-0.03em]">
          {mirada.titulo}
          <br />
          {mirada.subtitulo}
        </h2>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-oro/50">
          {mirada.columnas.map((columna) => {
            const Icono = ICONOS[columna.icono]
            return (
              <div key={columna.titulo} className="flex flex-col items-center px-4 text-center">
                <Icono className="h-12 w-16 text-oro-medio" />
                <h3 className="mt-4 font-serif text-xl font-bold">{columna.titulo}</h3>
                <p className="mt-2 max-w-[16rem] leading-relaxed text-tinta-suave">{columna.texto}</p>
              </div>
            )
          })}
        </div>

        <div className="mx-auto mt-14 flex max-w-2xl items-center gap-5 rounded-2xl border border-oro-medio/70 px-6 py-5">
          <IconoBotin className="h-10 w-14 shrink-0 text-oro-medio" />
          <div>
            <p className="font-serif text-lg font-bold leading-snug md:text-xl">{mirada.cajaTitulo}</p>
            <p className="mt-1 text-sm text-tinta-suave">{mirada.cajaTexto}</p>
          </div>
        </div>
      </div>

      <p
        aria-hidden
        className="absolute bottom-24 right-8 hidden w-24 border-l border-oro/70 pl-4 text-[0.65rem] font-medium uppercase leading-relaxed tracking-[0.25em] text-tinta-suave xl:block"
      >
        {mirada.lateral}
      </p>
    </section>
  )
}
