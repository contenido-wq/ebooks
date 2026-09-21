import type { Metadata } from "next"
import { Caveat, Montserrat, Playfair_Display } from "next/font/google"
import { getSiteUrl } from "@/lib/site"
import "./globals.css"

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" })
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" })
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Ebooks de Jhei Trujillo",
  description: "Libros digitales para leer en línea.",
  openGraph: { siteName: "Ebooks de Jhei Trujillo", locale: "es_LA", type: "website" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${montserrat.variable} ${caveat.variable}`}>
      <body className="bg-negro font-sans text-papel antialiased">{children}</body>
    </html>
  )
}
