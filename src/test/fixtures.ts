import type { Book, ImagenLanding } from "@/content/types"

function imagen(nombre: string): ImagenLanding {
  return { src: `/imagenes/${nombre}.webp`, ancho: 1200, alto: 800, alt: `Imagen de ${nombre}` }
}

export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    slug: "libro-de-prueba",
    titulo: "Libro de Prueba",
    subtitulo: "Un subtítulo de prueba",
    autor: "Autora Prueba",
    portada: null,
    precioUsd: 19.99,
    precioCop: 79900,
    garantiaDias: 7,
    anioPublicacion: 2026,
    testimonios: [],
    faq: [{ pregunta: "¿Cómo leo el libro?", respuesta: "En línea." }],
    landing: {
      hero: {
        tituloClaro: "¿En qué minuto",
        tituloDorado: "de tu vida estás?",
        bajada: "Una bajada de prueba.",
        etiqueta: "Libro digital · 45 relatos",
        cta: "Quiero leer su historia",
        fraseManuscrita: "Una frase manuscrita",
        lateralSuperior: "Historias que juegan",
        lateralDerecha: ["Más que fútbol", "Historias que cambian vidas"],
        imagen: imagen("hero"),
      },
      historia: {
        tituloClaro: "Cumplió su sueño. Pero la historia",
        tituloDorado: "no terminó ahí.",
        bajada: "Una bajada de la historia.",
        prologo: "Prólogo de Fulano de Tal",
        imagen: imagen("tableta"),
      },
      pases: {
        titulo: "Tres pases.",
        subtitulo: "Una vida que cambió de dirección.",
        tarjetas: [
          { minuto: 3, nombre: "Un sueño", titulo: "Título uno", texto: "Texto uno.", pregunta: "¿Pregunta uno?", imagen: imagen("uno") },
          { minuto: 18, nombre: "Luz", titulo: "Título dos", texto: "Texto dos.", pregunta: "¿Pregunta dos?", imagen: imagen("dos") },
          { minuto: 31, nombre: "Llamado", titulo: "Título tres", texto: "Texto tres.", pregunta: "¿Pregunta tres?", imagen: imagen("tres") },
        ],
        enlace: "Descubre lo que pasó",
      },
      autor: {
        lateral: "Disciplina también es fe",
        titulo: "Antes de ser pastor, también tuvo preguntas.",
        nombre: "Nombre del Autor",
        descripcion: "Una descripción del autor.",
        escritoPor: "Escrito junto a Otra Persona.",
        imagen: imagen("botines"),
      },
      mirada: {
        titulo: "Lees su historia.",
        subtitulo: "Empiezas a mirar la tuya.",
        columnas: [
          { icono: "botin", titulo: "Tus sueños", texto: "Texto de sueños." },
          { icono: "jugada", titulo: "Tus procesos", texto: "Texto de procesos." },
          { icono: "grupo", titulo: "Tu manera de servir", texto: "Texto de servir." },
        ],
        cajaTitulo: "Al final de cada relato: ¡Ponte los guayos!",
        cajaTexto: "Una invitación de prueba.",
        lateral: "La fe también entrena",
      },
      cierre: {
        lateral: ["Historias reales", "Personas reales", "Un Dios real"],
        tituloClaro: "Su primer tiempo está escrito.",
        tituloDorado: "El tuyo sigue en juego.",
        bajada: "Una bajada del cierre.",
        cta: "Quiero leer el libro",
        nota: "Libro digital · 45 relatos",
        imagen: imagen("balon"),
      },
      pie: { lema: "La vida también juega" },
    },
    ...overrides,
  }
}
