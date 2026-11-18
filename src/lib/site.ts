const DEFAULT_SITE_URL = "http://localhost:3000"

// La referencia literal a process.env.NEXT_PUBLIC_SITE_URL es necesaria: en la construcción
// solo se reemplazan las referencias escritas así, y en Cloudflare Workers no existe process.env completo.
export function getSiteUrl(
  env: Record<string, string | undefined> = { NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL },
): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}
