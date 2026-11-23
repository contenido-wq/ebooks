import type { Book } from "./types"

export const FEATURED_SLUG = "si-dios-jugara-futbol"

// Los textos salen del propio libro (Si Dios jugara futbol.pdf, primera edición, junio de 2026).
// Las tarjetas de los tres pases se verificaron contra los minutos 03 (p. 29 a 31), 18 (p. 99 a 101) y 31 (p. 173 a 175).
// El minuto 18 trata un tema muy delicado en el libro: la tarjeta lo menciona solo como "una herida de su pasado".
// testimonios va vacío a propósito: el "Camerino" del libro trae comentarios de futbolistas con nombre,
// y usarlos en una página de ventas requiere el visto bueno del dueño. Con la lista vacía la sección no se muestra.
// precioCop es un valor de prueba: el dueño debe fijar el precio real antes de lanzar.

// El enlace del PDF NO se guarda en el código: el repositorio es público. Sale de la variable de entorno
// NEXT_PUBLIC_DESCARGA_URL, que se fija al compilar (ver README) y en .env.local para desarrollo.
const enlaceDescarga = process.env.NEXT_PUBLIC_DESCARGA_URL?.trim()
const urlDescarga = enlaceDescarga?.startsWith("https://") ? enlaceDescarga : null

const siDiosJugaraFutbol: Book = {
  slug: FEATURED_SLUG,
  titulo: "Si Dios jugara fútbol",
  subtitulo:
    "45 relatos, uno por cada minuto del primer tiempo, para que te pongas los guayos y juegues el partido de tu vida.",
  autor: "Juan Guillermo Ricaurte y Jeins Durán",
  portada: { src: "/portada.webp", ancho: 879, alto: 1417 },
  precioUsd: 19.99,
  precioCop: 79900,
  urlCompra: "https://app.wemany.com/p/si_dios_jugara_futbol/f2cde169-df23-42ce-917c-a44757e7225d",
  // Sin NEXT_PUBLIC_DESCARGA_URL (o si no es https) no hay datos de post-compra y /gracias responde 404.
  postCompra: urlDescarga
    ? {
        urlDescarga,
        // Pendiente del dueño: enlace de su cuenta de Wemany. Con null el botón no aparece en /gracias.
        urlCuentaWemany: null,
      }
    : undefined,
  anioPublicacion: 2026,
  testimonios: [],
  faq: [
    {
      pregunta: "¿Cómo leo el libro?",
      respuesta:
        "Al pagar descargas tu libro en PDF y lo lees donde quieras: celular, tableta o computador.",
    },
    {
      pregunta: "¿Puedo descargar el PDF?",
      respuesta:
        "Sí. Apenas completas tu compra puedes descargar tu copia del libro en PDF, para tenerla siempre en tu celular o tu computador. Es de uso personal: por favor no la compartas.",
    },
    {
      pregunta: "¿Qué hago si tengo problemas con la descarga?",
      respuesta: "Escríbenos por WhatsApp y te ayudamos.",
    },
  ],
  landing: {
    hero: {
      tituloClaro: "¿En qué minuto",
      tituloDorado: "de tu vida estás?",
      bajada: "Él soñaba con jugar en Nacional. Dios lo llevó a una historia que nunca imaginó.",
      etiqueta: "Libro digital · 45 relatos",
      cta: "Quiero leer su historia",
      fraseManuscrita: "La vida también se juega en equipo",
      lateralSuperior: "Historias que también juegan",
      imagen: {
        src: "/imagenes/hero.webp",
        ancho: 1672,
        alto: 941,
        alt: "Juan Guillermo Ricaurte leyendo Si Dios jugara fútbol en las gradas de un estadio",
      },
    },
    historia: {
      tituloClaro: "Cumplió su sueño. Pero la historia",
      tituloDorado: "no terminó ahí.",
      bajada: "Del fútbol profesional a las preguntas que cambian una vida.",
      prologo: "Prólogo de Juan Guillermo Cuadrado",
      imagen: {
        src: "/imagenes/tableta.webp",
        ancho: 2000,
        alto: 1400,
        alt: "Una tableta con la portada del libro sobre una mesa, junto a una taza y una planta",
      },
    },
    pases: {
      titulo: "Tres pases.",
      subtitulo: "Una vida que cambió de dirección.",
      tarjetas: [
        {
          minuto: 3,
          nombre: "Cuando nace un sueño",
          titulo: "Todo empezó frente a un televisor.",
          texto: "A los 12 años, una final encendió su sueño de jugar en Nacional.",
          pregunta: "¿Qué sueño sigue vivo en ti?",
          imagen: {
            src: "/imagenes/pase-03-televisor.webp",
            ancho: 1200,
            alto: 1500,
            alt: "Un televisor antiguo mostrando un partido de fútbol, con un balón y una bufanda verde",
          },
        },
        {
          minuto: 18,
          nombre: "Luz",
          titulo: "Dios tocó lo que nadie veía.",
          texto: "Un encuentro lo llevó a mirar de frente una herida de su pasado.",
          pregunta: "¿Qué parte de tu historia necesita luz?",
          imagen: {
            src: "/imagenes/pase-18-puerta.webp",
            ancho: 1200,
            alto: 1500,
            alt: "Una puerta abierta por la que entra la luz dorada del atardecer",
          },
        },
        {
          minuto: 31,
          nombre: "Llamado",
          titulo: "No quería ser pastor. Ya estaba cuidando de otros.",
          texto: "Mientras se resistía al llamado, sus grupos en casas se llenaban de personas.",
          pregunta: "¿Y si lo que has vivido también puede ayudar a alguien?",
          imagen: {
            src: "/imagenes/pase-31-sala.webp",
            ancho: 1200,
            alto: 1500,
            alt: "Una sala con sillas en círculo y una cruz de madera en la pared",
          },
        },
      ],
      enlace: "Descubre lo que pasó entre un minuto y otro",
    },
    autor: {
      lateral: "Disciplina también es una forma de fe",
      titulo: "Antes de ser pastor, también tuvo preguntas.",
      nombre: "Juan Guillermo Ricaurte",
      descripcion:
        "Futbolista profesional, esposo y pastor. Comparte los sueños, las crisis y la fe que han marcado su vida.",
      escritoPor: "Escrito junto a Jeins Durán.",
      imagen: {
        src: "/imagenes/botines-cuaderno.webp",
        ancho: 2400,
        alto: 1000,
        alt: "Botines de fútbol gastados junto a un cuaderno abierto y una pluma",
      },
    },
    mirada: {
      titulo: "Lees su historia.",
      subtitulo: "Empiezas a mirar la tuya.",
      columnas: [
        { icono: "botin", titulo: "Tus sueños", texto: "Recuerda lo que mueve tu corazón." },
        { icono: "jugada", titulo: "Tus procesos", texto: "Mira tu camino desde la fe." },
        { icono: "grupo", titulo: "Tu manera de servir", texto: "Piensa en lo que puedes aportar a otros." },
      ],
      cajaTitulo: "Al final de cada relato: ¡Ponte los guayos!",
      cajaTexto: "Una invitación a llevar la reflexión a tu propia vida.",
      lateral: "La fe también entrena todos los días",
    },
    cierre: {
      lateral: ["Historias reales", "Personas reales", "Un Dios real"],
      tituloClaro: "Su primer tiempo está escrito.",
      tituloDorado: "El tuyo sigue en juego.",
      bajada: "Conoce la historia completa y date un espacio para pensar en la tuya.",
      cta: "Quiero leer el libro",
      nota: "Libro digital · 45 relatos",
      imagen: {
        src: "/imagenes/balon.webp",
        ancho: 2400,
        alto: 1200,
        alt: "Un balón desgastado sobre el césped, junto a la línea de cal",
      },
    },
    pie: { lema: "La vida también juega" },
  },
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
