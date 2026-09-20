export function buildWhatsappUrl(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "").replace(/^0+/, "")
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
