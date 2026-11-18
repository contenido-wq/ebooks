/**
 * Convierte lo que envía el webhook de Wemany en una fila para la hoja de cálculo.
 *
 * No conocemos de antemano el formato exacto de Wemany, así que se buscan los datos por nombre
 * en cualquier parte del JSON (en español o inglés) y se guarda también el JSON completo.
 */

export const COLUMNAS = [
  "fecha_recibida",
  "evento",
  "nombre",
  "email",
  "telefono",
  "pais",
  "producto",
  "monto",
  "moneda",
  "estado",
  "id_evento",
  "evento_original",
  "payload",
] as const

export type Columna = (typeof COLUMNAS)[number]
export type Fila = Record<Columna, string | number>

type Primitivo = string | number | boolean
type Hoja = { ruta: string[]; valor: Primitivo }

const MAX_TEXTO = 500
const MAX_PAYLOAD = 40_000
const MAX_PROFUNDIDAD = 6

/** Claves que nunca deben terminar en la hoja, aunque Wemany las enviara. */
const CLAVE_SENSIBLE = /card|tarjeta|cvv|cvc|password|clave|secret|token|authorization|signature/i

function limpiarClave(clave: string): string {
  return clave
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function aplanar(valor: unknown, ruta: string[] = [], salida: Hoja[] = []): Hoja[] {
  if (ruta.length > MAX_PROFUNDIDAD) return salida
  if (valor === null || valor === undefined) return salida
  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") {
    salida.push({ ruta, valor })
    return salida
  }
  if (Array.isArray(valor)) {
    valor.slice(0, 20).forEach((item, i) => aplanar(item, [...ruta, String(i)], salida))
    return salida
  }
  if (typeof valor === "object") {
    for (const [clave, item] of Object.entries(valor as Record<string, unknown>)) {
      if (CLAVE_SENSIBLE.test(clave)) continue
      aplanar(item, [...ruta, clave], salida)
    }
  }
  return salida
}

/** `evitar`: descarta si alguna carpeta de la ruta lo cumple. `dentro`: exige que alguna carpeta de la ruta lo cumpla. */
type Regla = { claves: string[]; evitar?: RegExp; dentro?: RegExp }

/** Sinónimos por campo, ya normalizados (sin tildes, minúsculas, sin símbolos). */
const REGLAS: Record<"evento" | "nombre" | "email" | "telefono" | "pais" | "producto" | "productoAnidado" | "monto" | "moneda" | "estado" | "id", Regla> = {
  evento: { claves: ["event", "eventtype", "evento", "tipo", "type", "topic", "action", "accion", "evento"] },
  nombre: {
    claves: ["fullname", "nombrecompleto", "name", "nombre", "customername", "buyername", "clientname"],
    evitar: /product|producto|plan|offer|oferta|course|curso|community|comunidad|webhook/i,
  },
  email: { claves: ["email", "correo", "correoelectronico", "mail", "buyeremail", "customeremail"] },
  telefono: { claves: ["phone", "telefono", "celular", "whatsapp", "mobile", "movil", "phonenumber", "tel"] },
  pais: { claves: ["country", "pais", "countrycode", "codigopais"] },
  producto: {
    claves: ["productname", "producto", "nombreproducto", "product", "offername", "oferta", "title", "titulo", "planname", "plan"],
  },
  /** El producto a veces viene como { product: { name: "..." } }. */
  productoAnidado: { claves: ["name", "nombre", "title", "titulo"], dentro: /product|producto|offer|oferta|plan|course|curso/i },
  monto: { claves: ["amount", "monto", "total", "price", "precio", "value", "valor", "amountpaid"] },
  moneda: { claves: ["currency", "moneda", "currencycode"] },
  estado: { claves: ["status", "estado", "state", "paymentstatus"] },
  id: {
    claves: ["eventid", "idevento", "transactionid", "idtransaccion", "orderid", "paymentid", "purchaseid", "id", "uuid"],
  },
}

function buscar(hojas: Hoja[], regla: Regla): Primitivo | undefined {
  let mejor: { valor: Primitivo; profundidad: number; prioridad: number } | undefined
  for (const hoja of hojas) {
    const ultima = limpiarClave(hoja.ruta[hoja.ruta.length - 1] ?? "")
    const prioridad = regla.claves.indexOf(ultima)
    if (prioridad === -1) continue
    const carpetas = hoja.ruta.slice(0, -1)
    if (regla.evitar && carpetas.some((p) => regla.evitar!.test(p))) continue
    if (regla.dentro && !carpetas.some((p) => regla.dentro!.test(p))) continue
    if (typeof hoja.valor === "string" && hoja.valor.trim() === "") continue
    const profundidad = hoja.ruta.length
    if (
      !mejor ||
      profundidad < mejor.profundidad ||
      (profundidad === mejor.profundidad && prioridad < mejor.prioridad)
    ) {
      mejor = { valor: hoja.valor, profundidad, prioridad }
    }
  }
  return mejor?.valor
}

function juntarNombre(hojas: Hoja[]): string | undefined {
  const nombre = buscar(hojas, { claves: ["firstname", "nombres", "primernombre"] })
  const apellido = buscar(hojas, { claves: ["lastname", "apellido", "apellidos"] })
  if (nombre === undefined) return undefined
  return [nombre, apellido].filter((x) => x !== undefined).join(" ")
}

function texto(valor: unknown, max = MAX_TEXTO): string {
  if (valor === undefined || valor === null) return ""
  // eslint-disable-next-line no-control-regex
  return String(valor).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max)
}

function numeroSiEsNumero(valor: Primitivo | undefined): string | number {
  if (valor === undefined) return ""
  if (typeof valor === "number" && Number.isFinite(valor)) return valor
  const t = texto(valor)
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : t
}

/** Etiqueta en español para los cuatro eventos del webhook; si no se reconoce, se deja tal cual. */
export function etiquetaEvento(original: string): string {
  const e = limpiarClave(original)
  if (!e) return "Sin evento"
  if (/abandon|carrito|cart/.test(e)) return "Carrito abandonado"
  if (/rechaz|declin|reject|fail|denied|refus/.test(e)) return "Pago rechazado"
  if (/miembro|member|joined|subscri/.test(e)) return "Nuevo miembro"
  if (/aprob|approv|paid|pagad|complet|purchase|compra|success/.test(e)) return "Compra aprobada"
  return texto(original)
}

/** Fecha y hora de Colombia, en texto: 2026-11-17 23:15:02. */
export function fechaColombia(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(fecha)
  return partes.replace("T", " ")
}

function payloadSeguro(payload: unknown): string {
  const limpio = JSON.stringify(payload, (clave, valor) => (CLAVE_SENSIBLE.test(clave) ? "[oculto]" : valor))
  return (limpio ?? "").slice(0, MAX_PAYLOAD)
}

/** Datos que no vienen en el cuerpo pero pueden decir el tipo de evento (por ejemplo, un encabezado). */
export type Extras = { eventoEncabezado?: string | null }

export function construirFila(payload: unknown, ahora: Date, extras: Extras = {}): Fila {
  const hojas = aplanar(payload)
  const eventoOriginal = texto(extras.eventoEncabezado) || texto(buscar(hojas, REGLAS.evento))
  const nombre = buscar(hojas, REGLAS.nombre) ?? juntarNombre(hojas)

  return {
    fecha_recibida: fechaColombia(ahora),
    evento: etiquetaEvento(eventoOriginal),
    nombre: texto(nombre),
    email: texto(buscar(hojas, REGLAS.email)).toLowerCase(),
    telefono: texto(buscar(hojas, REGLAS.telefono)),
    pais: texto(buscar(hojas, REGLAS.pais)),
    producto: texto(buscar(hojas, REGLAS.producto) ?? buscar(hojas, REGLAS.productoAnidado)),
    monto: numeroSiEsNumero(buscar(hojas, REGLAS.monto)),
    moneda: texto(buscar(hojas, REGLAS.moneda)).toUpperCase(),
    estado: texto(buscar(hojas, REGLAS.estado)),
    id_evento: texto(buscar(hojas, REGLAS.id)),
    evento_original: eventoOriginal,
    payload: payloadSeguro(payload),
  }
}
