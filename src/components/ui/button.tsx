import type { ComponentProps } from "react"

type Variant = "primary" | "secondary" | "oscuro"

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro disabled:cursor-not-allowed disabled:opacity-50"

const variants: Record<Variant, string> = {
  // Dorado sólido: el botón principal, sobre fondos oscuros o claros.
  primary: "fondo-oro text-negro shadow-[0_8px_24px_-8px_rgb(201_161_90/0.6)] enabled:hover:brightness-110",
  // Contorno dorado, para fondos oscuros.
  secondary: "border border-oro text-oro-claro enabled:hover:bg-oro/10",
  // Negro sólido, para fondos crema.
  oscuro: "bg-negro text-papel enabled:hover:bg-carbon",
}

function classes(variant: Variant, extra?: string) {
  return `${base} ${variants[variant]}${extra ? ` ${extra}` : ""}`
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={classes(variant, className)} {...props} />
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return <a className={classes(variant, className)} {...props} />
}
