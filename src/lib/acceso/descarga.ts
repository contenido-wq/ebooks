import type { Almacen } from "./almacen"
import { esComprador } from "./compradores"
import { huellaCorreo, normalizarCorreo } from "./huella"
import { canjearTicket, crearTicket, permitirIntento } from "./tickets"

/** Lo mínimo que se usa de un bucket de R2. En las pruebas se reemplaza por uno falso. */
export type BucketPdf = {
  get(clave: string): Promise<{ body: ReadableStream; size: number } | null>
}

export type EntornoDescarga = { COMPRADORES?: Almacen; LIBRO_PDF?: BucketPdf }

/** Clave del PDF dentro del bucket privado y nombre con el que lo recibe el comprador. */
export const CLAVE_PDF = "si-dios-jugara-futbol.pdf"
export const NOMBRE_DESCARGA = "Si Dios jugara futbol.pdf"

type Resultado = { estado: number; cuerpo: Record<string, unknown> }

const NO_DISPONIBLE: Resultado = {
  estado: 503,
  cuerpo: { ok: false, mensaje: "La descarga no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos." },
}

/**
 * Comprueba si el correo pagó y, si es así, entrega un enlace de descarga de un solo uso (10 minutos).
 * Nunca devuelve ni registra el correo. Si algo falla por dentro, responde 503 sin detalles.
 */
export async function verificarCorreo(env: EntornoDescarga, correo: unknown, ip: string): Promise<Resultado> {
  const kv = env.COMPRADORES
  if (!kv || !env.LIBRO_PDF) return NO_DISPONIBLE

  const limpio = typeof correo === "string" ? normalizarCorreo(correo) : null
  if (!limpio) return { estado: 400, cuerpo: { ok: false, mensaje: "Escribe un correo válido." } }

  try {
    const huella = await huellaCorreo(limpio)
    const demasiados: Resultado = {
      estado: 429,
      cuerpo: { ok: false, mensaje: "Hiciste demasiados intentos. Espera 10 minutos o escríbenos por WhatsApp." },
    }
    if (!(await permitirIntento(kv, `ip:${ip}`))) return demasiados
    if (!(await permitirIntento(kv, `correo:${huella}`))) return demasiados

    if (!(await esComprador(kv, limpio))) {
      return {
        estado: 404,
        cuerpo: { ok: false, mensaje: "No encontramos una compra con ese correo. Escribe el mismo con el que pagaste." },
      }
    }
    const ticket = await crearTicket(kv)
    return { estado: 200, cuerpo: { ok: true, url: `/descarga?t=${ticket}` } }
  } catch {
    return NO_DISPONIBLE
  }
}

function texto(estado: number, mensaje: string): Response {
  return new Response(mensaje, {
    status: estado,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  })
}

/** Canjea el ticket (solo vale una vez) y entrega el PDF desde el bucket privado. */
export async function entregarPdf(env: EntornoDescarga, ticket: string | null): Promise<Response> {
  const kv = env.COMPRADORES
  const bucket = env.LIBRO_PDF
  if (!kv || !bucket) return texto(503, "La descarga no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos.")

  try {
    if (!ticket || !(await canjearTicket(kv, ticket))) {
      return texto(
        410,
        "Este enlace ya se usó o venció. Vuelve a la página de gracias, escribe tu correo y pide uno nuevo.",
      )
    }
    const objeto = await bucket.get(CLAVE_PDF)
    if (!objeto) return texto(404, "El libro todavía no está disponible. Escríbenos por WhatsApp y te ayudamos.")

    return new Response(objeto.body, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(objeto.size),
        "content-disposition": `attachment; filename="${NOMBRE_DESCARGA}"; filename*=UTF-8''${encodeURIComponent(NOMBRE_DESCARGA)}`,
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex",
        "x-content-type-options": "nosniff",
      },
    })
  } catch {
    return texto(503, "La descarga no está disponible en este momento. Escríbenos por WhatsApp y te ayudamos.")
  }
}
