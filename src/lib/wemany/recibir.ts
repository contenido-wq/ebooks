import type { Almacen } from "@/lib/acceso/almacen"
import { registrarCompra } from "@/lib/acceso/compradores"
import { COLUMNAS, construirFila } from "./normalizar"

export type EntornoWebhook = {
  /** KV donde se anota (solo la huella) quién pagó. Sin esto, el webhook solo escribe la hoja. */
  COMPRADORES?: Almacen
  /** Código que va en la dirección del webhook. */
  WEBHOOK_TOKEN?: string
  /** Secreto de firma que muestra Wemany al crear el webhook. Si falta o es "pendiente", solo se exige el código de la dirección. */
  WEBHOOK_SIGNING_SECRET?: string
  SHEETS_SCRIPT_URL?: string
  SHEETS_SCRIPT_TOKEN?: string
}

export type DependenciasWebhook = {
  fetch?: typeof fetch
  ahora?: () => Date
}

const MAX_CUERPO = 200_000
const PREFIJO_SCRIPT = "https://script.google.com/macros/s/"
/** Wemany da 10 s de espera: la hoja tiene 8 s; si se pasa, se responde 502 y Wemany reintenta (sin duplicar por el id). */
const ESPERA_HOJA_MS = 8_000
const TOLERANCIA_SEGUNDOS = 300

/** Comparación que no se corta en la primera diferencia, para no filtrar el código por tiempos. */
export function igualesConstante(a: string, b: string): boolean {
  const largo = Math.max(a.length, b.length)
  let diferencia = a.length ^ b.length
  for (let i = 0; i < largo; i++) {
    diferencia |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diferencia === 0
}

function aHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("")
}

async function hmacHex(clave: Uint8Array<ArrayBuffer>, mensaje: Uint8Array<ArrayBuffer>): Promise<string> {
  const llave = await crypto.subtle.importKey("raw", clave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return aHex(await crypto.subtle.sign("HMAC", llave, mensaje))
}

function desdeBase64(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binario = atob(texto)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

export type ResultadoFirma = "ok" | "sin_firma" | "formato" | "vencida" | "invalida"

/**
 * Valida `X-Wemany-Signature: t=<segundos>,v1=<firma>` (mismo esquema que Stripe):
 * firma = HMAC_SHA256(secreto, `${t}.${cuerpoCrudo}`), comparada en tiempo constante, con 300 s de margen.
 * Se firma sobre los bytes exactos recibidos, no sobre un JSON reconstruido.
 */
export async function verificarFirma(
  cabecera: string | null,
  cuerpo: Uint8Array<ArrayBuffer>,
  secreto: string,
  ahoraMs: number,
): Promise<ResultadoFirma> {
  if (!cabecera) return "sin_firma"

  let t: string | undefined
  const firmas: string[] = []
  for (const parte of cabecera.split(",")) {
    const i = parte.indexOf("=")
    if (i === -1) continue
    const clave = parte.slice(0, i).trim()
    const valor = parte.slice(i + 1).trim()
    if (clave === "t") t = valor
    if (clave === "v1") firmas.push(valor.toLowerCase())
  }
  if (!t || !/^\d+$/.test(t) || firmas.length === 0) return "formato"

  const marca = Number(t)
  const marcaSegundos = marca > 1e11 ? marca / 1000 : marca // por si llegara en milisegundos
  if (Math.abs(ahoraMs / 1000 - marcaSegundos) > TOLERANCIA_SEGUNDOS) return "vencida"

  const codificador = new TextEncoder()
  const prefijo = codificador.encode(`${t}.`)
  const mensaje = new Uint8Array(prefijo.length + cuerpo.length)
  mensaje.set(prefijo, 0)
  mensaje.set(cuerpo, prefijo.length)

  // Como Stripe, la clave es el texto del secreto tal cual. Por compatibilidad también se prueba la versión
  // en base64 cuando el secreto empieza por "whsec_" (otros proveedores lo usan así).
  const claves = [codificador.encode(secreto)]
  if (secreto.startsWith("whsec_")) {
    const decodificada = desdeBase64(secreto.slice(6))
    if (decodificada && decodificada.length > 0) claves.push(decodificada)
  }

  for (const clave of claves) {
    const esperada = await hmacHex(clave, mensaje)
    if (firmas.some((f) => igualesConstante(f, esperada))) return "ok"
  }
  return "invalida"
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
 * Solo una compra aprobada concede acceso al libro. Más estricto que la etiqueta de la hoja ("Compra aprobada" también
 * incluiría un reembolso, porque contiene "purchase"): aquí un reembolso, rechazo, cancelación o carrito nunca cuenta.
 */
export function esCompraAprobada(evento: string): boolean {
  const e = evento.toLowerCase()
  if (/refund|reembols|chargeback|contracargo|declin|reject|rechaz|cancel|abandon/.test(e)) return false
  return /approv|aprobad/.test(e)
}

/** Wemany marca sus eventos de prueba con `"test": true` y datos de muestra: no deben dar acceso. */
function esEventoDePrueba(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null) return false
  const marca = (payload as Record<string, unknown>).test
  return marca === true || marca === "true"
}

function secretoDeFirma(env: EntornoWebhook): string | null {
  const s = env.WEBHOOK_SIGNING_SECRET?.trim()
  return s && s !== "pendiente" ? s : null
}

/**
 * Recibe un evento de Wemany.
 * 1) El `token` de la dirección filtra el tráfico que no es nuestro.
 * 2) Si hay secreto de firma, la firma de Wemany es obligatoria: es lo que prueba que el evento es de Wemany.
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

  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length > MAX_CUERPO) return responder(413, { ok: false, error: "demasiado_grande" })

  const secreto = secretoDeFirma(env)
  if (secreto) {
    const firma = await verificarFirma(req.headers.get("x-wemany-signature"), bytes, secreto, ahora().getTime())
    if (firma !== "ok") return responder(401, { ok: false, error: `firma_${firma}` })
  }

  let payload: unknown
  try {
    payload = leerCuerpo(new TextDecoder().decode(bytes), req.headers.get("content-type") ?? "")
  } catch {
    return responder(400, { ok: false, error: "cuerpo_invalido" })
  }

  const fila = construirFila(payload, ahora(), {
    eventoEncabezado: req.headers.get("x-wemany-event") ?? req.headers.get("x-event-type"),
    idEventoEncabezado: req.headers.get("x-wemany-event-id"),
  })

  // El acceso al libro va primero y no depende de la hoja. Si falla, se responde 502 y Wemany reintenta (es idempotente).
  const correo = String(fila.email)
  if (env.COMPRADORES && correo && !esEventoDePrueba(payload) && esCompraAprobada(String(fila.evento_original))) {
    try {
      await registrarCompra(env.COMPRADORES, correo)
    } catch {
      return responder(502, { ok: false, error: "acceso_no_guardado" })
    }
  }

  if (!env.SHEETS_SCRIPT_URL?.startsWith(PREFIJO_SCRIPT) || !env.SHEETS_SCRIPT_TOKEN) {
    return responder(503, { ok: false, error: "hoja_no_configurada" })
  }

  try {
    const res = await hacerFetch(env.SHEETS_SCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: env.SHEETS_SCRIPT_TOKEN, columnas: COLUMNAS, fila }),
      redirect: "follow",
      signal: AbortSignal.timeout(ESPERA_HOJA_MS),
    })
    const resultado = (await res.json()) as { ok?: boolean }
    if (!res.ok || resultado.ok !== true) return responder(502, { ok: false, error: "hoja_rechazo" })
  } catch {
    // Un 5xx le dice a Wemany que reintente (al momento, 1 min, 5 min, 30 min, 2 h). No se registra el contenido: son datos personales.
    return responder(502, { ok: false, error: "hoja_no_responde" })
  }

  return responder(200, { ok: true })
}
