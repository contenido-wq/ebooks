import type { Book } from "@/content/types"

export function Guarantee({ book }: { book: Book }) {
  return (
    <section className="bg-negro pb-16 text-papel md:pb-24">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        <div className="rounded-3xl border border-oro/35 p-8 text-center">
          <h2 className="font-serif text-2xl font-bold sm:text-3xl">Garantía de {book.garantiaDias} días</h2>
          <p className="mx-auto mt-3 max-w-xl text-papel/80">
            Si el libro no es lo que esperabas, te devolvemos tu dinero. Escríbenos dentro de los primeros{" "}
            {book.garantiaDias} días.
          </p>
        </div>
      </div>
    </section>
  )
}
