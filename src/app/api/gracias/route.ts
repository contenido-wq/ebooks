import { verificarCorreo } from "@/lib/acceso/descarga"
import { leerEntornoSitio } from "@/lib/cloudflare-env"

export const dynamic = "force-dynamic"

/** Un correo cabe de sobra en 2 KB: todo lo más grande se descarta sin leerlo entero. */
const MAX_CUERPO = 2000

function responder(estado: number, cuerpo: Record<string, unknown>): Response {
  return Response.json(cuerpo, { status: estado, headers: { "cache-control": "no-store" } })
}

/** Recibe el correo con el que se pagó y, si hay una compra, responde con un enlace de descarga de un solo uso. */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_CUERPO) {
    return responder(413, { ok: false, mensaje: "La solicitud es demasiado grande." })
  }
  const texto = await req.text()
  if (texto.length > MAX_CUERPO) return responder(413, { ok: false, mensaje: "La solicitud es demasiado grande." })

  let cuerpo: unknown
  try {
    cuerpo = JSON.parse(texto)
  } catch {
    return responder(400, { ok: false, mensaje: "No pudimos leer tu solicitud. Inténtalo de nuevo." })
  }
  const correo = typeof cuerpo === "object" && cuerpo !== null ? (cuerpo as { correo?: unknown }).correo : undefined

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida"
  const resultado = await verificarCorreo(await leerEntornoSitio(), correo, ip)
  return responder(resultado.estado, resultado.cuerpo)
}
