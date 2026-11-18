import { construirFila } from "./normalizar"

export type EntornoWebhook = {
  WEBHOOK_TOKEN?: string
  SHEETS_SCRIPT_URL?: string
  SHEETS_SCRIPT_TOKEN?: string
}

export type DependenciasWebhook = {
  fetch?: typeof fetch
  ahora?: () => Date
}

const MAX_CUERPO = 200_000
const PREFIJO_SCRIPT = "https://script.google.com/macros/s/"

/** Comparación que no se corta en la primera diferencia, para no filtrar el código por tiempos. */
export function igualesConstante(a: string, b: string): boolean {
  const largo = Math.max(a.length, b.length)
  let diferencia = a.length ^ b.length
  for (let i = 0; i < largo; i++) {
    diferencia |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diferencia === 0
}

function responder(estado: number, cuerpo: Record<string, unknown>): Response {
  return Response.json(cuerpo, { status: estado, headers: { "cache-control": "no-store" } })
}

function leerCuerpo(texto: string, tipo: string): unknown {
  if (tipo.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(texto))
  }
  return JSON.parse(texto)
}

/**
 * Recibe un evento de Wemany. El `token` viene en la dirección: Wemany no permite firmar ni agregar
 * encabezados, así que el código secreto en la URL es lo que impide que cualquiera escriba en la hoja.
 */
export async function recibirWebhook(
  req: Request,
  token: string,
  env: EntornoWebhook,
  deps: DependenciasWebhook = {},
): Promise<Response> {
  const hacerFetch = deps.fetch ?? fetch
  const ahora = deps.ahora ?? (() => new Date())

  // Se responde igual que una página que no existe para no revelar que aquí hay un webhook.
  if (!env.WEBHOOK_TOKEN || !igualesConstante(token, env.WEBHOOK_TOKEN)) {
    return responder(404, { ok: false })
  }

  const declarado = Number(req.headers.get("content-length") ?? 0)
  if (declarado > MAX_CUERPO) return responder(413, { ok: false, error: "demasiado_grande" })

  const texto = await req.text()
  if (texto.length > MAX_CUERPO) return responder(413, { ok: false, error: "demasiado_grande" })

  let payload: unknown
  try {
    payload = leerCuerpo(texto, req.headers.get("content-type") ?? "")
  } catch {
    return responder(400, { ok: false, error: "cuerpo_invalido" })
  }

  if (!env.SHEETS_SCRIPT_URL?.startsWith(PREFIJO_SCRIPT) || !env.SHEETS_SCRIPT_TOKEN) {
    return responder(503, { ok: false, error: "hoja_no_configurada" })
  }

  const eventoEncabezado =
    req.headers.get("x-wemany-event") ?? req.headers.get("x-event-type") ?? req.headers.get("x-webhook-event")
  const fila = construirFila(payload, ahora(), { eventoEncabezado })

  try {
    const res = await hacerFetch(env.SHEETS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: env.SHEETS_SCRIPT_TOKEN, fila }),
      redirect: "follow",
    })
    const resultado = (await res.json()) as { ok?: boolean }
    if (!res.ok || resultado.ok !== true) return responder(502, { ok: false, error: "hoja_rechazo" })
  } catch {
    // Un error 5xx le dice a Wemany que reintente más tarde; no se registra el contenido (datos personales).
    return responder(502, { ok: false, error: "hoja_no_responde" })
  }

  return responder(200, { ok: true })
}
