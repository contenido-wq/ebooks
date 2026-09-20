import type { Book } from "@/content/types"

export function Faq({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Preguntas frecuentes</h2>
      <div className="mt-8 divide-y divide-linea border-y border-linea">
        {book.faq.map((item) => (
          <details key={item.pregunta} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {item.pregunta}
              <span aria-hidden className="text-2xl text-dorado transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-tinta-suave">{item.respuesta}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
