import type { ComponentProps } from "react"

type Variant = "primary" | "secondary"

const base =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cancha disabled:cursor-not-allowed disabled:opacity-50"

const variants: Record<Variant, string> = {
  primary: "bg-cancha text-white enabled:hover:bg-cancha-oscuro",
  secondary: "border border-cancha text-cancha enabled:hover:bg-cancha/10",
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
