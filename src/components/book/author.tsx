import type { Book } from "@/content/types"

export function Author({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Sobre los autores</h2>
      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-dorado">
        {book.autor}
      </p>
      <p className="mt-6 text-lg leading-relaxed">{book.sobreLosAutores}</p>
    </section>
  )
}
