export type Currency = "USD" | "COP"

export function formatPrice(amount: number, currency: Currency): string {
  // Los dólares redondos van sin decimales ("US$15"); con centavos, con dos ("US$19.99").
  if (currency === "USD") return `US$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`
  const entero = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `$${entero} COP`
}
