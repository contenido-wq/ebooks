export type Currency = "USD" | "COP"

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === "USD") return `US$${amount.toFixed(2)}`
  const entero = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `$${entero} COP`
}
