import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BookLanding } from "@/components/book/book-landing"
import { books, getBook } from "@/content/books"
import { bookMetadata } from "@/lib/book-metadata"

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return books.map((book) => ({ slug: book.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const book = getBook(slug)
  return book ? bookMetadata(book) : {}
}

export default async function LibroPage({ params }: Props) {
  const { slug } = await params
  const book = getBook(slug)
  if (!book) notFound()
  return <BookLanding book={book} />
}
