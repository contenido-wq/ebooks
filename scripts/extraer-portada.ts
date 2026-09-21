import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import sharp from "sharp"
import { cajaAPixeles } from "../src/lib/libro/recorte"

// El archivo de imprenta es un pliego de 51,2 × 24 cm: solapa, contraportada, lomo, portada y solapa.
// El panel frontal (150 × 240 mm) se midió sobre "Portada si Dios jugara curvas.pdf" y se comprobó que sus
// bordes izquierdo, derecho y superior quedan en blanco puro (sin lomo ni solapa). Puntos, origen arriba a la izquierda.
const FRENTE = { x: 864.0, y: 178.6, ancho: 422.0, alto: 680.3 }
const DPI = 150

async function main() {
  const [entrada, salida = "public/portada.webp"] = process.argv.slice(2)
  if (!entrada) {
    console.error('Uso: npm run portada -- "/ruta/Portada.pdf" [public/portada.webp]')
    process.exit(1)
  }

  const caja = cajaAPixeles(FRENTE, DPI)
  const carpeta = mkdtempSync(path.join(tmpdir(), "portada-"))
  try {
    execFileSync("pdftoppm", [
      "-r", String(DPI),
      "-x", String(caja.x),
      "-y", String(caja.y),
      "-W", String(caja.ancho),
      "-H", String(caja.alto),
      "-png",
      "-singlefile",
      entrada,
      path.join(carpeta, "frente"),
    ])
    const info = await sharp(path.join(carpeta, "frente.png")).webp({ quality: 88 }).toFile(salida)
    console.log(`Portada guardada en ${salida}: ${info.width} × ${info.height} px, ${Math.round(info.size / 1024)} KB`)
  } finally {
    rmSync(carpeta, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
