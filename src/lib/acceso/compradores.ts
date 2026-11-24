import type { Almacen } from "./almacen"
import { huellaCorreo } from "./huella"

/** Anota que este correo pagó. Se guarda solo la huella. Devuelve false si el correo no es válido. */
export async function registrarCompra(almacen: Almacen, correo: string): Promise<boolean> {
  const huella = await huellaCorreo(correo)
  if (!huella) return false
  await almacen.put(`pagado:${huella}`, "1")
  return true
}

export async function esComprador(almacen: Almacen, correo: string): Promise<boolean> {
  const huella = await huellaCorreo(correo)
  if (!huella) return false
  return (await almacen.get(`pagado:${huella}`)) !== null
}
