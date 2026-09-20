import type { Book } from "@/content/types"

export function Contents({ book }: { book: Book }) {
  return (
    <section className="bg-papel-oscuro">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-serif text-3xl sm:text-4xl">De qué trata</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-tinta-suave">
          {book.sinopsis.split(/\n\s*\n/).map((parrafo) => (
            <p key={parrafo}>{parrafo}</p>
          ))}
        </div>
        <h3 className="mt-14 text-sm font-semibold uppercase tracking-[0.2em] text-dorado">
          Lo que vas a encontrar
        </h3>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {book.encontraras.map((item) => (
            <li key={item.titulo} className="rounded-2xl border border-linea bg-papel p-6">
              <h4 className="font-serif text-xl">{item.titulo}</h4>
              <p className="mt-2 text-tinta-suave">{item.descripcion}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
