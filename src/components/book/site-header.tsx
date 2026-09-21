const ENLACES = [
  { etiqueta: "Inicio", href: "#hero" },
  { etiqueta: "El libro", href: "#el-libro" },
  { etiqueta: "El autor", href: "#autor" },
  { etiqueta: "Capítulos", href: "#capitulos" },
]

type Props = { titulo: string; lateral: string }

/** Encabezado que flota sobre la portada: nombre del libro, menú y una etiqueta a la derecha. */
export function SiteHeader({ titulo, lateral }: Props) {
  // El nombre se parte en dos líneas por la mitad de sus palabras: "Si Dios" / "jugara fútbol".
  const palabras = titulo.split(" ")
  const mitad = Math.ceil(palabras.length / 2)
  const lineas = [palabras.slice(0, mitad).join(" "), palabras.slice(mitad).join(" ")]

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-6 px-5 pt-6 sm:px-8">
        <a href="#hero" className="font-serif text-2xl font-bold leading-[0.95] tracking-tight text-papel md:text-3xl">
          {lineas[0]}
          <br />
          {lineas[1]}
        </a>

        <nav aria-label="Principal" className="hidden items-center gap-8 pt-2 md:flex">
          {ENLACES.map((enlace) => (
            <a
              key={enlace.href}
              href={enlace.href}
              className="border-b border-transparent pb-1 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-papel/90 transition hover:border-oro hover:text-oro-claro"
            >
              {enlace.etiqueta}
            </a>
          ))}
        </nav>

        <p className="hidden border-b border-oro pb-1 pt-2 text-right text-[0.65rem] font-medium uppercase tracking-[0.22em] text-papel/90 lg:block">
          {lateral}
        </p>

        <details className="group relative md:hidden">
          <summary className="cursor-pointer list-none rounded-full border border-oro px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-oro-claro [&::-webkit-details-marker]:hidden">
            Menú
          </summary>
          <nav
            aria-label="Menú móvil"
            className="absolute right-0 mt-3 w-52 rounded-2xl border border-oro/40 bg-negro/95 p-3 backdrop-blur"
          >
            {ENLACES.map((enlace) => (
              <a
                key={enlace.href}
                href={enlace.href}
                className="block rounded-lg px-3 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-papel hover:bg-oro/10"
              >
                {enlace.etiqueta}
              </a>
            ))}
          </nav>
        </details>
      </div>
    </header>
  )
}
