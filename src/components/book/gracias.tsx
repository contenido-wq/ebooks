import { ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { Cover } from "./cover"

type GraciasProps = { book: Book; whatsappUrl?: string | null }

/** Página que ve quien acaba de comprar: confirmación, portada, descarga del PDF y acceso a Wemany. */
export function Gracias({ book, whatsappUrl }: GraciasProps) {
  const { postCompra } = book
  if (!postCompra) return null

  return (
    <main className="min-h-screen bg-negro text-papel">
      <section className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8 md:py-24">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.3em] text-oro-claro md:mb-8">
          {book.titulo}
        </p>

        <div className="grid items-center gap-10 rounded-3xl border border-oro/35 bg-carbon p-6 sm:p-10 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-12">
          <div className="mx-auto w-40 sm:w-48 md:w-full">
            <div className="cover-tilt">
              <Cover titulo={book.titulo} autor={book.autor} portada={book.portada} />
            </div>
          </div>

          <div className="text-center md:text-left">
            <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] font-bold leading-tight tracking-[-0.02em]">
              <span className="texto-oro">¡Gracias, ya eres parte!</span>
            </h1>
            <p className="mt-4 leading-relaxed text-papel/85">
              Tu compra quedó confirmada. Descarga tu copia y guárdala en tu celular o en tu computador para tenerla
              siempre a la mano.
            </p>
            <p className="mt-3 text-sm text-papel/75">
              Es de uso personal: por favor no la compartas, así cuidas el trabajo de quienes escribimos este libro.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <ButtonLink href={postCompra.urlDescarga} target="_blank" rel="noopener noreferrer">
                Descargar mi libro (PDF) <span aria-hidden>↓</span>
              </ButtonLink>
              {postCompra.urlCuentaWemany ? (
                <ButtonLink
                  href={postCompra.urlCuentaWemany}
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Entrar a mi cuenta en Wemany <span aria-hidden>→</span>
                </ButtonLink>
              ) : null}
            </div>

            {whatsappUrl ? (
              <p className="mt-6 text-sm text-papel/75">
                ¿Tienes algún problema con la descarga?{" "}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-oro-claro underline underline-offset-4 hover:text-oro"
                >
                  Escríbenos por WhatsApp
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  )
}
