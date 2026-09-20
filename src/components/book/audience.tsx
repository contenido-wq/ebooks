import type { Book } from "@/content/types"

export function Audience({ book }: { book: Book }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 className="font-serif text-3xl sm:text-4xl">Este libro es para ti si…</h2>
      <ul className="mt-8 space-y-4">
        {book.paraQuien.map((item) => (
          <li key={item} className="flex gap-4 text-lg">
            <span aria-hidden className="mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full bg-cancha" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
