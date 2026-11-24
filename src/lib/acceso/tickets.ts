import type { Almacen } from "./almacen"

/** Un ticket de descarga vale 10 minutos y una sola vez. */
const VIDA_TICKET_SEGUNDOS = 600
const MAX_INTENTOS = 5
const VENTANA_INTENTOS_SEGUNDOS = 600
const FORMATO_TICKET = /^[0-9a-f]{64}$/

/** Crea un ticket aleatorio de 256 bits. Solo existe en el almacén hasta que se canjea o vence. */
export async function crearTicket(almacen: Almacen): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const ticket = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  await almacen.put(`ticket:${ticket}`, "1", { expirationTtl: VIDA_TICKET_SEGUNDOS })
  return ticket
}

/** Canjea el ticket: lo lee y lo borra, así que solo funciona la primera vez. */
export async function canjearTicket(almacen: Almacen, ticket: string): Promise<boolean> {
  if (!FORMATO_TICKET.test(ticket)) return false
  const clave = `ticket:${ticket}`
  if ((await almacen.get(clave)) === null) return false
  await almacen.delete(clave)
  return true
}

/** Limita los intentos por clave (IP o correo): 5 cada 10 minutos. Los intentos rechazados no alargan la espera. */
export async function permitirIntento(almacen: Almacen, clave: string): Promise<boolean> {
  const llave = `intentos:${clave}`
  const hechos = Number(await almacen.get(llave)) || 0
  if (hechos >= MAX_INTENTOS) return false
  await almacen.put(llave, String(hechos + 1), { expirationTtl: VENTANA_INTENTOS_SEGUNDOS })
  return true
}
