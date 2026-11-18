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
  "telefono_facturacion",
  "pais",
  "producto",
  "monto",
  "valor_neto",
  "moneda",
  "metodo_pago",
  "estado",
  "reactivacion",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "origen",
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
type Regla = {
  claves: string[]
  evitar?: RegExp
  dentro?: RegExp
  /** Si se indica, solo estas claves exigen `dentro`; las demás valen en cualquier lugar. */
  soloDentro?: string[]
}

/** Sinónimos por campo, ya normalizados (sin tildes, minúsculas, sin símbolos). */
const REGLAS: Record<
  | "evento" | "nombre" | "email" | "telefono" | "telefonoFacturacion" | "pais" | "producto" | "productoAnidado"
  | "monto" | "valorNeto" | "moneda" | "metodoPago" | "estado" | "reactivacion"
  | "utmSource" | "utmMedium" | "utmCampaign" | "utmContent" | "origen" | "id",
  Regla
> = {
  evento: { claves: ["type", "event", "eventtype", "evento", "tipo", "topic", "action", "accion"] },
  nombre: {
    claves: ["fullname", "nombrecompleto", "name", "nombre", "customername", "buyername", "clientname"],
    evitar: /product|producto|plan|offer|oferta|course|curso|community|comunidad|webhook/i,
  },
  email: { claves: ["email", "correo", "correoelectronico", "mail", "buyeremail", "customeremail"] },
  // phone = teléfono del perfil; billingPhone = el que escribió al pagar (pueden ser distintos).
  telefono: { claves: ["phone", "telefono", "celular", "whatsapp", "mobile", "movil", "phonenumber", "tel"] },
  telefonoFacturacion: { claves: ["billingphone", "telefonofacturacion"] },
  pais: { claves: ["country", "pais", "countrycode", "codigopais"] },
  producto: {
    claves: ["productname", "producto", "nombreproducto", "product", "offername", "oferta", "title", "titulo", "planname", "plan"],
  },
  /** El producto o el plan a veces vienen como { plan: { name: "..." } }. */
  productoAnidado: { claves: ["name", "nombre", "title", "titulo"], dentro: /product|producto|offer|oferta|plan|course|curso/i },
  // Lo cobrado de verdad. No se usa el precio del plan: un alta gratis tiene plan con precio pero cobro nulo.
  monto: {
    claves: ["amountpaid", "montopagado", "amount", "monto", "total", "price", "precio", "value", "valor"],
    evitar: /plan|subscription|suscripcion/i,
  },
  valorNeto: { claves: ["netvalue", "valorneto"] },
  moneda: { claves: ["currency", "moneda", "currencycode"] },
  metodoPago: { claves: ["paymentmethod", "metodopago", "metodo"] },
  estado: { claves: ["status", "estado", "state", "paymentstatus"] },
  reactivacion: { claves: ["isreactivation", "reactivacion"] },
  // Las UTM del propio evento. Se excluye el historial del cliente (customerAttribution): no es de esta compra.
  utmSource: { claves: ["utmsource", "source"], soloDentro: ["source"], evitar: /customerattribution/i, dentro: /utm|queryparams/i },
  utmMedium: { claves: ["utmmedium", "medium"], soloDentro: ["medium"], evitar: /customerattribution/i, dentro: /utm|queryparams/i },
  utmCampaign: { claves: ["utmcampaign", "campaign"], soloDentro: ["campaign"], evitar: /customerattribution/i, dentro: /utm|queryparams/i },
  utmContent: { claves: ["utmcontent", "content"], soloDentro: ["content"], evitar: /customerattribution/i, dentro: /utm|queryparams/i },
  origen: { claves: ["customorigin", "origen"], evitar: /customerattribution/i },
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
    const exigeCarpeta = regla.dentro && (!regla.soloDentro || regla.soloDentro.includes(ultima))
    if (exigeCarpeta && !carpetas.some((p) => regla.dentro!.test(p))) continue
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

/**
 * Inyección de fórmulas: Google Sheets evalúa como fórmula cualquier texto que empiece por "=" aunque la celda tenga
 * formato de texto (comprobado en la hoja real: =HYPERLINK(...) se convertía en enlace y =1+1 en 2). Como el comprador
 * escribe su propio nombre, correo y UTM, esos campos pueden traer fórmulas. Se les antepone un apóstrofo, que
 * las vuelve texto literal; así también quedan inofensivas si la hoja se exporta a CSV y se abre en Excel.
 * Los teléfonos y números sueltos (+57 300..., -5) se dejan tal cual.
 */
const PARECE_NUMERO_O_TELEFONO = /^[+-]?[\d\s().-]+$/

export function neutralizarFormula(texto: string): string {
  if (/^[=@]/.test(texto)) return `'${texto}`
  if (/^[+-]/.test(texto) && !PARECE_NUMERO_O_TELEFONO.test(texto)) return `'${texto}`
  return texto
}

function texto(valor: unknown, max = MAX_TEXTO): string {
  if (valor === undefined || valor === null) return ""
  // eslint-disable-next-line no-control-regex
  const limpio = String(valor).replace(/[\u0000-\u001f\u007f]/g, " ").trim()
  // Primero se neutraliza y luego se recorta, para que el apóstrofo no haga pasar el tope de largo.
  return neutralizarFormula(limpio).slice(0, max)
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

const MAX_PROFUNDIDAD_PAYLOAD = 12
const MAX_ELEMENTOS = 300

/**
 * Copia el JSON con tope de profundidad y de elementos, y sin claves sensibles.
 * Sin este tope, un JSON anidado miles de niveles hacía que JSON.stringify agotara la pila.
 */
function limitar(valor: unknown, profundidad = 0): unknown {
  if (valor === null || typeof valor !== "object") return typeof valor === "string" ? valor.slice(0, 2000) : valor
  if (profundidad >= MAX_PROFUNDIDAD_PAYLOAD) return "[muy anidado]"
  if (Array.isArray(valor)) return valor.slice(0, MAX_ELEMENTOS).map((v) => limitar(v, profundidad + 1))
  const salida: Record<string, unknown> = {}
  let n = 0
  for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
    if (n++ >= MAX_ELEMENTOS) break
    salida[clave] = CLAVE_SENSIBLE.test(clave) ? "[oculto]" : limitar(v, profundidad + 1)
  }
  return salida
}

function payloadSeguro(payload: unknown): string {
  try {
    return (JSON.stringify(limitar(payload)) ?? "").slice(0, MAX_PAYLOAD)
  } catch {
    return "[payload no se pudo copiar]"
  }
}

/** Datos que no vienen en el cuerpo pero sí en los encabezados de la petición. */
export type Extras = { eventoEncabezado?: string | null; idEventoEncabezado?: string | null }

/** Lo que escribe el comprador (UTM, origen) se recorta más: no es información confiable. */
const MAX_ATRIBUCION = 200

export function construirFila(payload: unknown, ahora: Date, extras: Extras = {}): Fila {
  const hojas = aplanar(payload)
  const eventoOriginal = texto(buscar(hojas, REGLAS.evento)) || texto(extras.eventoEncabezado)
  const nombre = buscar(hojas, REGLAS.nombre) ?? juntarNombre(hojas)
  // El id del cuerpo va dentro de lo firmado por Wemany; el encabezado no. Se prefiere el del cuerpo para que
  // reenviar una petición firmada cambiando el encabezado no genere una fila nueva.
  const idEvento = texto(buscar(hojas, REGLAS.id)) || texto(extras.idEventoEncabezado)

  return {
    fecha_recibida: fechaColombia(ahora),
    evento: etiquetaEvento(eventoOriginal),
    nombre: texto(nombre),
    email: texto(buscar(hojas, REGLAS.email)).toLowerCase(),
    telefono: texto(buscar(hojas, REGLAS.telefono)),
    telefono_facturacion: texto(buscar(hojas, REGLAS.telefonoFacturacion)),
    pais: texto(buscar(hojas, REGLAS.pais)),
    producto: texto(buscar(hojas, REGLAS.producto) ?? buscar(hojas, REGLAS.productoAnidado)),
    monto: numeroSiEsNumero(buscar(hojas, REGLAS.monto)),
    valor_neto: numeroSiEsNumero(buscar(hojas, REGLAS.valorNeto)),
    moneda: texto(buscar(hojas, REGLAS.moneda)).toUpperCase(),
    metodo_pago: texto(buscar(hojas, REGLAS.metodoPago)),
    estado: texto(buscar(hojas, REGLAS.estado)),
    reactivacion: texto(buscar(hojas, REGLAS.reactivacion)),
    utm_source: texto(buscar(hojas, REGLAS.utmSource), MAX_ATRIBUCION),
    utm_medium: texto(buscar(hojas, REGLAS.utmMedium), MAX_ATRIBUCION),
    utm_campaign: texto(buscar(hojas, REGLAS.utmCampaign), MAX_ATRIBUCION),
    utm_content: texto(buscar(hojas, REGLAS.utmContent), MAX_ATRIBUCION),
    origen: texto(buscar(hojas, REGLAS.origen), MAX_ATRIBUCION),
    id_evento: idEvento,
    evento_original: eventoOriginal,
    payload: payloadSeguro(payload),
  }
}
