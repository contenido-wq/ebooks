import type { Book } from "@/content/types"

export function Guarantee({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-dorado-claro bg-papel-oscuro p-8 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl">Garantía de {book.garantiaDias} días</h2>
        <p className="mt-3 text-tinta-suave">
          Si el libro no es lo que esperabas, te devolvemos tu dinero. Escríbenos dentro de los
          primeros {book.garantiaDias} días.
        </p>
      </div>
    </section>
  )
}
