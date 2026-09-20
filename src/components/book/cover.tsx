import Image from "next/image"

type CoverProps = { titulo: string; autor: string; src: string | null }

export function Cover({ titulo, autor, src }: CoverProps) {
  if (src) {
    return (
      <Image
        src={src}
        alt={`Portada de ${titulo}`}
        width={800}
        height={1200}
        priority
        className="h-auto w-full rounded-md shadow-portada"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`Portada de ${titulo}`}
      className="flex aspect-[2/3] w-full flex-col justify-between rounded-md bg-cancha-oscuro p-6 text-papel shadow-portada"
    >
      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-dorado-claro">
        {autor}
      </span>
      <span className="font-serif text-3xl leading-tight text-balance">{titulo}</span>
      <span aria-hidden className="h-px w-12 bg-dorado-claro" />
    </div>
  )
}
