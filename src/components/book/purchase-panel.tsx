import { Button, ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"
import { Cover } from "./cover"

type PurchasePanelProps = { book: Book; whatsappUrl?: string | null }

export function PurchasePanel({ book, whatsappUrl }: PurchasePanelProps) {
  return (
    <section id="comprar" className="scroll-mt-8 bg-negro text-papel">
      <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 md:py-24">
        <div className="grid items-center gap-10 rounded-3xl border border-oro/35 bg-carbon p-6 sm:p-10 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-12">
          <div className="mx-auto w-40 sm:w-48 md:w-full">
            <div className="cover-tilt">
              <Cover titulo={book.titulo} autor={book.autor} portada={book.portada} />
            </div>
          </div>

          <div className="text-center md:text-left">
            <h2 className="font-serif text-3xl font-bold leading-tight tracking-[-0.02em]">Lee {book.titulo} hoy</h2>
            <p className="mt-2 text-papel/80">Acceso inmediato en línea, desde tu celular o tu computador.</p>
            <p className="texto-oro mt-6 font-serif text-6xl font-extrabold leading-none tracking-[-0.03em]">
              {formatPrice(book.precioUsd, "USD")}
            </p>
            <p className="mt-2 text-sm text-papel/75">o {formatPrice(book.precioCop, "COP")} en Colombia</p>
            <div className="mt-8 flex flex-col gap-3">
              <Button disabled>Pagar con tarjeta o Apple Pay</Button>
              <Button variant="secondary" disabled>
                Pagar con PSE o Nequi
              </Button>
            </div>
            <p className="mt-4 text-sm text-papel/75">Los pagos se activan pronto.</p>
            {whatsappUrl ? (
              <ButtonLink
                href={whatsappUrl}
                variant="secondary"
                className="mt-6 w-full"
                target="_blank"
                rel="noopener noreferrer"
              >
                Preguntar por WhatsApp
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
