import { mkdirSync } from "node:fs"
import path from "node:path"
import sharp from "sharp"

// Convierte las escenas de la landing a WebP optimizado dentro de public/imagenes/.
// Next.js las sirve luego en el tamaño que pida cada pantalla, así que aquí se guardan a tamaño completo.
//
// Uso:
//   python3 scripts/imagenes/componer-tableta.py "<carpeta>/02-tableta.png" public/portada.webp /tmp/tableta-real.png
//   npm run imagenes -- "<carpeta de las escenas>" /tmp/tableta-real.png "<Portada.png>"

const SALIDA = path.join("public", "imagenes")
const CALIDAD = 80

// [archivo de origen, nombre de salida]. La tableta viene de la composición con la portada real
// y la foto de la portada de la página (hero) se entrega como un archivo aparte.
const ESCENAS: [string, string][] = [
  ["03-televisor.jpg", "pase-03-televisor.webp"],
  ["04-puerta.png", "pase-18-puerta.webp"],
  ["05-sala.png", "pase-31-sala.webp"],
  ["06-botines-cuaderno.jpg", "botines-cuaderno.webp"],
  ["07-balon.png", "balon.webp"],
]

async function convertir(origen: string, destino: string, sinPerdida = false) {
  const opciones = sinPerdida ? { lossless: true, effort: 6 } : { quality: CALIDAD, effort: 5 }
  const info = await sharp(origen).webp(opciones).toFile(destino)
  console.log(`${path.basename(destino).padEnd(26)} ${info.width} × ${info.height}  ${Math.round(info.size / 1024)} KB`)
}

async function main() {
  const [carpeta, tableta, hero] = process.argv.slice(2)
  if (!carpeta || !tableta || !hero) {
    console.error('Uso: npm run imagenes -- "<carpeta de las escenas>" <tableta-real.png> "<Portada.png>"')
    process.exit(1)
  }
  mkdirSync(SALIDA, { recursive: true })

  for (const [origen, salida] of ESCENAS) await convertir(path.join(carpeta, origen), path.join(SALIDA, salida))
  await convertir(tableta, path.join(SALIDA, "tableta.webp"))
  // La foto de la portada se guarda sin pérdida: Next la comprime una sola vez (calidad 92) al servirla.
  // Comprimirla dos veces borra la textura de la piel y la deja "de cera".
  await convertir(hero, path.join(SALIDA, "hero.webp"), true)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
