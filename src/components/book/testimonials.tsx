import type { Book } from "@/content/types"

export function Testimonials({ book }: { book: Book }) {
  if (book.testimonios.length === 0) return null

  return (
    <section className="bg-papel-oscuro text-tinta">
      <div className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 md:py-20">
        <h2 className="font-serif text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Lo que dicen los lectores</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {book.testimonios.map((t) => (
            <figure key={t.nombre} className="rounded-2xl border border-linea bg-papel p-6">
              <blockquote className="text-lg leading-relaxed">“{t.texto}”</blockquote>
              <figcaption className="mt-4 text-sm font-semibold">
                {t.nombre}
                {t.detalle ? <span className="font-normal text-tinta-suave"> · {t.detalle}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
