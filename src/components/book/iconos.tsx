import type { ComponentProps } from "react"

type Icono = ComponentProps<"svg">

const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

/** Botín de fútbol de perfil, en línea dorada. */
export function IconoBotin(props: Icono) {
  return (
    <svg viewBox="0 0 48 32" aria-hidden {...trazo} {...props}>
      <path d="M4 22c0-3 1.5-4.6 4.5-5.4l9-2.4 5-7.2 6.2 3.6c3.2 1.8 6.8 3.6 9.6 6.4 1.6 1.6 2.2 3.4 2.2 6v1.2H4z" />
      <path d="M15 14.4l4 3.4M20.4 12l4 3.4" />
      <path d="M9 25v3.2M17 25v3.2M28 25v3.2M38 25v3.2" />
    </svg>
  )
}

/** Jugada táctica: un círculo, una equis y la trayectoria entre ambos. */
export function IconoJugada(props: Icono) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden {...trazo} {...props}>
      <circle cx="9" cy="30" r="4" />
      <path d="M32 6l8 8M40 6l-8 8" />
      <path d="M14 27c9-2 15-9 17-14" strokeDasharray="3 3" />
      <path d="M27.5 13.5l3.5-.8-.8 3.6" />
      <circle cx="10" cy="9" r="2.4" />
      <path d="M38 34l-6-6M32 34l6-6" opacity=".55" />
    </svg>
  )
}

/** Tres personas: comunidad. */
export function IconoGrupo(props: Icono) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden {...trazo} {...props}>
      <circle cx="24" cy="12" r="5.2" />
      <path d="M14 34c0-6 4.4-10 10-10s10 4 10 10" />
      <circle cx="9.5" cy="16" r="3.8" />
      <path d="M2.5 32c0-4.4 3-7.4 7-7.4 1.4 0 2.6.3 3.6.9" />
      <circle cx="38.5" cy="16" r="3.8" />
      <path d="M45.5 32c0-4.4-3-7.4-7-7.4-1.4 0-2.6.3-3.6.9" />
    </svg>
  )
}

/** Balón pequeño, para acompañar los números de los tres pases. */
export function IconoBalon(props: Icono) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...props}>
      <circle cx="16" cy="16" r="14.5" fill="#f6f0e4" stroke="#0b0a08" strokeWidth="1.4" />
      <path d="M16 9.6l5 3.6-1.9 5.8h-6.2L11 13.2z" fill="#0b0a08" />
      <path
        d="M16 9.6V4.6M21 13.2l4.6-1.6M19.1 19l3 4.3M12.9 19l-3 4.3M11 13.2L6.4 11.6"
        fill="none"
        stroke="#0b0a08"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const ICONOS = { botin: IconoBotin, jugada: IconoJugada, grupo: IconoGrupo } as const
