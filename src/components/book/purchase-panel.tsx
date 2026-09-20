import { Button, ButtonLink } from "@/components/ui/button"
import type { Book } from "@/content/types"
import { formatPrice } from "@/lib/format-price"

type PurchasePanelProps = { book: Book; whatsappUrl?: string | null }

export function PurchasePanel({ book, whatsappUrl }: PurchasePanelProps) {
  return (
    <section id="comprar" className="mx-auto w-full max-w-xl scroll-mt-8 px-4 py-16 sm:px-6 sm:py-24">
      <div className="rounded-3xl border border-linea bg-white/60 p-8 text-center shadow-sm">
        <h2 className="font-serif text-3xl">Lee {book.titulo} hoy</h2>
        <p className="mt-2 text-tinta-suave">
          Acceso inmediato en línea, desde tu celular o tu computador.
        </p>
        <p className="mt-6 font-serif text-5xl">{formatPrice(book.precioUsd, "USD")}</p>
        <p className="mt-1 text-sm text-tinta-suave">
          o {formatPrice(book.precioCop, "COP")} en Colombia
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button disabled>Pagar con tarjeta o Apple Pay</Button>
          <Button variant="secondary" disabled>
            Pagar con PSE o Nequi
          </Button>
        </div>
        <p className="mt-4 text-sm text-tinta-suave">Los pagos se activan pronto.</p>
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
    </section>
  )
}
