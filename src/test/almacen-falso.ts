import type { Almacen } from "@/lib/acceso/almacen"

/** Almacén en memoria que imita KV, con reloj controlable para probar vencimientos. */
export function almacenFalso() {
  const datos = new Map<string, { valor: string; vence: number | null; ttl: number | null }>()
  let ahora = 0

  const almacen: Almacen & {
    avanzar(segundos: number): void
    claves(): string[]
    valores(): string[]
    ttlDe(clave: string): number | null | undefined
  } = {
    async get(clave) {
      const e = datos.get(clave)
      if (!e) return null
      if (e.vence !== null && ahora >= e.vence) {
        datos.delete(clave)
        return null
      }
      return e.valor
    },
    async put(clave, valor, opciones) {
      const ttl = opciones?.expirationTtl ?? null
      datos.set(clave, { valor, vence: ttl === null ? null : ahora + ttl, ttl })
    },
    async delete(clave) {
      datos.delete(clave)
    },
    avanzar(segundos) {
      ahora += segundos
    },
    claves: () => [...datos.keys()],
    valores: () => [...datos.values()].map((e) => e.valor),
    ttlDe: (clave) => datos.get(clave)?.ttl,
  }
  return almacen
}
