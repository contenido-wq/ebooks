import { BookLanding } from "@/components/book/book-landing"
import { getFeaturedBook } from "@/content/books"
import { bookMetadata } from "@/lib/book-metadata"

export function generateMetadata() {
  return bookMetadata(getFeaturedBook())
}

export default function Home() {
  return <BookLanding book={getFeaturedBook()} />
}
