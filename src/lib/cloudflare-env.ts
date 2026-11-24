import type { EntornoDescarga } from "@/lib/acceso/descarga"

export type EntornoSitio = EntornoDescarga

/**
 * Lee los bindings del Worker (KV `COMPRADORES`, R2 `LIBRO_PDF`). En desarrollo local o en pruebas no existen:
 * devuelve un objeto vacío y las rutas responden 503 en español en vez de fallar.
 */
export async function leerEntornoSitio(): Promise<EntornoSitio> {
  try {
    const modulo = "cloudflare:workers"
    const { env } = (await import(/* @vite-ignore */ /* webpackIgnore: true */ modulo)) as { env?: EntornoSitio }
    return env ?? {}
  } catch {
    return {}
  }
}
