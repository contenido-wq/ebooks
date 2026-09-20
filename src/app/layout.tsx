import type { Metadata } from "next"
import { Fraunces, Inter } from "next/font/google"
import { getSiteUrl } from "@/lib/site"
import "./globals.css"

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Ebooks de Jhei Trujillo",
  description: "Libros digitales para leer en línea.",
  openGraph: { siteName: "Ebooks de Jhei Trujillo", locale: "es_LA", type: "website" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-papel font-sans text-tinta antialiased">{children}</body>
    </html>
  )
}
