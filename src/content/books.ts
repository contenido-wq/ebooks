import type { Book } from "./types"

export const FEATURED_SLUG = "si-dios-jugara-futbol"

// Los textos salen del propio libro (Si Dios jugara futbol.pdf, primera edición, junio de 2026).
// testimonios va vacío a propósito: el "Camerino" del libro trae comentarios de futbolistas con nombre,
// y usarlos en una página de ventas requiere el visto bueno del dueño. Con la lista vacía la sección no se muestra.
// portada es null hasta que el dueño entregue el archivo de la portada: mientras tanto se genera con texto.
// precioCop es un valor de prueba: el dueño debe fijar el precio real antes de lanzar.
const siDiosJugaraFutbol: Book = {
  slug: FEATURED_SLUG,
  titulo: "Si Dios jugara fútbol",
  subtitulo:
    "45 relatos, uno por cada minuto del primer tiempo, para que te pongas los guayos y juegues el partido de tu vida.",
  autor: "Juan Guillermo Ricaurte y Jeins Durán",
  sinopsis: [
    "Medellín, 2011. Juan Guillermo Ricaurte conduce un viejo Mazda azul cargado de tablones y pide que no se lo encuentre el bus del Atlético Nacional. Hace poco, el estadio entero gritaba su nombre; hoy vive con su esposa y sus dos hijas en una sola pieza. ¿Cómo llegó hasta ahí?",
    "Para responderlo, el libro vuelve a Cisneros, el pueblo del ferrocarril donde un niño vendía avena fría a los pasajeros del tren y soñaba con jugar en el verde. Pasa por la gloria en el Nacional, por las lesiones y las sombras que llegaron con ella, y por el encuentro que lo cambió todo.",
    "Está escrito como el primer tiempo de un partido: 45 relatos breves, uno por minuto. Al final de cada uno, una invitación a ponerte los guayos y jugar en la cancha de tu propia vida. Puedes leer un minuto al día o jugarte todo el tiempo de corrido.",
  ].join("\n\n"),
  portada: null,
  precioUsd: 19.99,
  precioCop: 79900,
  paraQuien: [
    "Amas el fútbol y quieres conocer la historia detrás de la camiseta 14 del Atlético Nacional.",
    "Sientes que tu mejor momento ya pasó y necesitas recordar que el partido no se acaba hasta el pitazo final.",
    "Buscas una lectura para tu fe, en relatos breves que puedes leer un minuto al día.",
    "Te inspiran las historias reales de familia, esfuerzo y segundas oportunidades.",
  ],
  encontraras: [
    {
      titulo: "45 relatos, 45 minutos",
      descripcion:
        "Cada capítulo es un minuto del primer tiempo: una escena real, breve y lista para leer en cualquier momento.",
    },
    {
      titulo: "De la cancha al estadio y al ángel azul",
      descripcion:
        "De Cisneros al Atlético Nacional, del Mazda azul de 2011 y hasta el regreso al estadio Atanasio Girardot ante más de 45.000 personas.",
    },
    {
      titulo: "Ponte los guayos",
      descripcion:
        "Al final de cada relato, una invitación a jugar tu propio partido en la cancha multicolor de tu vida.",
    },
  ],
  sobreLosAutores:
    'Juan Guillermo Ricaurte, "Juanchi", nació en Cisneros, Antioquia, en 1976. Jugó en el Atlético Nacional con la camiseta 14 y hoy es pastor en Medellín, donde acompaña a familias y a deportistas, entre ellos jugadores de la Selección Colombia. Jeins Durán es coautor y editor del libro: dio forma escrita a cada una de las vivencias que lo componen.',
  garantiaDias: 7,
  anioPublicacion: 2026,
  testimonios: [],
  faq: [
    {
      pregunta: "¿Cómo leo el libro?",
      respuesta:
        "Al pagar recibes un email con un enlace de acceso. Lees en línea, desde tu celular o tu computador, sin descargar nada.",
    },
    {
      pregunta: "¿Puedo descargar el PDF?",
      respuesta:
        "No. El libro se lee solo en línea y cada página lleva tu email para cuidar el trabajo de los autores.",
    },
    {
      pregunta: "¿Qué hago si no me llega el email?",
      respuesta:
        "Entra a Mi biblioteca con el email que usaste al comprar y te enviamos un enlace nuevo al instante.",
    },
    {
      pregunta: "¿Y si no es lo que esperaba?",
      respuesta:
        "Tienes 7 días de garantía. Escríbenos dentro de ese plazo y te devolvemos tu dinero.",
    },
  ],
}

export const books: Book[] = [siDiosJugaraFutbol]

export function getBook(slug: string): Book | undefined {
  return books.find((book) => book.slug === slug)
}

export function getFeaturedBook(): Book {
  const book = getBook(FEATURED_SLUG)
  if (!book) throw new Error(`No existe el libro destacado "${FEATURED_SLUG}" en el catálogo`)
  return book
}
