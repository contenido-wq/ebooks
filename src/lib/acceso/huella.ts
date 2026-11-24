const MAX_CORREO = 254

/** Recorta, pasa a minúsculas y comprueba la forma básica de un correo. Devuelve null si no parece uno. */
export function normalizarCorreo(correo: string): string | null {
  const limpio = correo.trim().toLowerCase()
  if (limpio.length === 0 || limpio.length > MAX_CORREO) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio) ? limpio : null
}

/**
 * SHA-256 (hexadecimal) del correo normalizado. En el almacén solo se guardan huellas, nunca correos en claro.
 * Devuelve null si el correo no es válido.
 */
export async function huellaCorreo(correo: string): Promise<string | null> {
  const limpio = normalizarCorreo(correo)
  if (!limpio) return null
  const resumen = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(limpio))
  return Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, "0")).join("")
}
