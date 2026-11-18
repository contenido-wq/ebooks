export type Testimonial = { nombre: string; texto: string; detalle?: string }

export type FaqItem = { pregunta: string; respuesta: string }

/** Imagen de la portada dentro de /public, con sus dimensiones reales. */
export type Portada = { src: string; ancho: number; alto: number }

/** Escena fotográfica de la landing, con sus dimensiones reales y su texto alternativo. */
export type ImagenLanding = { src: string; ancho: number; alto: number; alt: string }

export type Pase = {
  minuto: number
  nombre: string
  titulo: string
  texto: string
  pregunta: string
  imagen: ImagenLanding
}

export type Columna = { icono: "botin" | "jugada" | "grupo"; titulo: string; texto: string }

export type LandingContent = {
  hero: {
    tituloClaro: string
    tituloDorado: string
    bajada: string
    etiqueta: string
    cta: string
    fraseManuscrita: string
    lateralSuperior: string
    imagen: ImagenLanding
  }
  historia: {
    tituloClaro: string
    tituloDorado: string
    bajada: string
    prologo: string
    imagen: ImagenLanding
  }
  pases: { titulo: string; subtitulo: string; tarjetas: Pase[]; enlace: string }
  autor: {
    lateral: string
    titulo: string
    nombre: string
    descripcion: string
    escritoPor: string
    imagen: ImagenLanding
  }
  mirada: {
    titulo: string
    subtitulo: string
    columnas: Columna[]
    cajaTitulo: string
    cajaTexto: string
    lateral: string
  }
  cierre: {
    lateral: string[]
    tituloClaro: string
    tituloDorado: string
    bajada: string
    cta: string
    nota: string
    imagen: ImagenLanding
  }
  pie: { lema: string }
}

export type Book = {
  slug: string
  titulo: string
  subtitulo: string
  autor: string
  /** Portada real del libro, que se muestra en el panel de compra. Con null se genera una portada de texto. */
  portada: Portada | null
  /** Precio en dólares. */
  precioUsd: number
  /** Precio en pesos colombianos, fijado a mano (no se convierte del dólar). */
  precioCop: number
  /** Enlace de pago (checkout) del libro en Wemany. Los botones de compra llevan aquí. */
  urlCompra: string
  /** Año de la edición impresa: es el año del copyright que se muestra en el pie de página. */
  anioPublicacion: number
  testimonios: Testimonial[]
  faq: FaqItem[]
  landing: LandingContent
}
