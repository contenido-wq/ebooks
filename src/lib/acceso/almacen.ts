/** Lo mínimo que se usa de Cloudflare KV. En las pruebas se reemplaza por uno en memoria. */
export type Almacen = {
  get(clave: string): Promise<string | null>
  put(clave: string, valor: string, opciones?: { expirationTtl?: number }): Promise<void>
  delete(clave: string): Promise<void>
}
