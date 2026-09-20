import type { Book } from "@/content/types"

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    slug: "libro-de-prueba",
    titulo: "Libro de Prueba",
    subtitulo: "Un subtítulo de prueba",
    autor: "Autora Prueba",
    sinopsis: "Sinopsis de prueba.",
    portada: null,
    precioUsd: 19.99,
    precioCop: 79900,
    paraQuien: ["Quieres leer algo", "Buscas inspiración"],
    encontraras: [
      { titulo: "Capítulo uno", descripcion: "Descripción uno" },
      { titulo: "Capítulo dos", descripcion: "Descripción dos" },
    ],
    sobreLosAutores: "Bio de prueba.",
    garantiaDias: 7,
    anioPublicacion: 2026,
    testimonios: [],
    faq: [{ pregunta: "¿Cómo leo el libro?", respuesta: "En línea." }],
    ...overrides,
  }
}
