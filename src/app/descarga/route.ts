import { entregarPdf } from "@/lib/acceso/descarga"
import { leerEntornoSitio } from "@/lib/cloudflare-env"

export const dynamic = "force-dynamic"

/** Entrega el PDF a quien trae un ticket válido. Cada ticket sirve una sola vez y vence a los 10 minutos. */
export async function GET(req: Request) {
  const ticket = new URL(req.url).searchParams.get("t")
  return entregarPdf(await leerEntornoSitio(), ticket)
}
