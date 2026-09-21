/** Caja en puntos PDF (1 pt = 1/72 in), con el origen arriba a la izquierda de la página. */
export type CajaPt = { x: number; y: number; ancho: number; alto: number }

export type CajaPx = { x: number; y: number; ancho: number; alto: number }

export function cajaAPixeles(caja: CajaPt, dpi: number): CajaPx {
  const k = dpi / 72
  return {
    x: Math.round(caja.x * k),
    y: Math.round(caja.y * k),
    ancho: Math.round(caja.ancho * k),
    alto: Math.round(caja.alto * k),
  }
}
