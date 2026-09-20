const DEFAULT_SITE_URL = "http://localhost:3000"

export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) return DEFAULT_SITE_URL
  return raw.replace(/\/+$/, "")
}
