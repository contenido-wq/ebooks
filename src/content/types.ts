export type Testimonial = { nombre: string; texto: string; detalle?: string }

export type FaqItem = { pregunta: string; respuesta: string }

export type Book = {
  slug: string
  titulo: string
  subtitulo: string
  autor: string
  /** Uno o varios párrafos separados por una línea en blanco. */
  sinopsis: string
  /** Ruta dentro de /public (por ejemplo "/portada.webp"). Con null se genera una portada de texto. */
  portada: string | null
  /** Precio en dólares. */
  precioUsd: number
  /** Precio en pesos colombianos, fijado a mano (no se convierte del dólar). */
  precioCop: number
  paraQuien: string[]
  encontraras: { titulo: string; descripcion: string }[]
  sobreLosAutores: string
  garantiaDias: number
  /** Año de la edición impresa: es el año del copyright que se muestra en el pie de página. */
  anioPublicacion: number
  testimonios: Testimonial[]
  faq: FaqItem[]
}
