import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { getFeaturedBook } from "../src/content/books"
import { channelUrl } from "../src/lib/channels"
import { generateQrAssets } from "../src/lib/qr"

async function main() {
  const entrada = process.argv[2] ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!entrada) {
    console.error("Falta la URL pública de la tienda.")
    console.error("Uso: npm run qr -- https://tu-dominio.com")
    process.exit(1)
  }

  let origen: string
  try {
    origen = new URL(entrada).origin
  } catch {
    console.error(`"${entrada}" no es una URL válida (incluye https://).`)
    process.exit(1)
  }

  if (new URL(origen).hostname === "localhost") {
    console.warn("Aviso: el QR apunta a localhost y solo funcionará en este computador.")
  }

  // El QR apunta a /qr (redirección propia): así el destino puede cambiar sin reimprimir.
  const destino = new URL("/qr", origen).toString()
  const libro = getFeaturedBook()
  const { png, svg, story } = await generateQrAssets(destino, {
    titulo: libro.titulo,
    autor: libro.autor,
  })

  const carpeta = path.resolve("out", "qr")
  await mkdir(carpeta, { recursive: true })
  await Promise.all([
    writeFile(path.join(carpeta, "qr-tienda.png"), png),
    writeFile(path.join(carpeta, "qr-tienda.svg"), svg),
    writeFile(path.join(carpeta, "tarjeta-historia-9x16.png"), story),
  ])

  console.log(`QR generado para ${destino}`)
  console.log(`Ejemplo de la tienda con UTM de QR: ${channelUrl("qr", origen)}`)
  console.log(`Archivos en ${carpeta}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
