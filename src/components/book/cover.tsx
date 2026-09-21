import Image from "next/image"
import type { Portada } from "@/content/types"

type CoverProps = { titulo: string; autor: string; portada: Portada | null }

export function Cover({ titulo, autor, portada }: CoverProps) {
  if (portada) {
    return (
      <Image
        src={portada.src}
        alt={`Portada de ${titulo}`}
        width={portada.ancho}
        height={portada.alto}
        sizes="(min-width: 768px) 260px, 60vw"
        className="h-auto w-full rounded-md shadow-portada"
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={`Portada de ${titulo}`}
      className="flex aspect-[5/8] w-full flex-col justify-between rounded-md border border-oro/40 bg-verde-profundo p-6 text-papel shadow-portada"
    >
      <span className="text-balance text-xs font-semibold uppercase tracking-[0.25em] text-oro">{autor}</span>
      <span className="text-balance font-serif text-3xl font-bold leading-tight">{titulo}</span>
      <span aria-hidden className="h-px w-12 bg-oro" />
    </div>
  )
}
