import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { Autor } from "./autor"
import { Cierre } from "./cierre"
import { Historia } from "./historia"
import { Mirada } from "./mirada"
import { TresPases } from "./tres-pases"

const book = makeBook()

describe("Historia", () => {
  it("muestra el titular, la bajada y el prólogo, y es el destino de #el-libro", () => {
    const { container } = render(<Historia book={book} />)
    expect(container.querySelector("#el-libro")).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Cumplió su sueño. Pero la historia no terminó ahí." }),
    ).toBeInTheDocument()
    expect(screen.getByText("Una bajada de la historia.")).toBeInTheDocument()
    expect(screen.getByText("Prólogo de Fulano de Tal")).toBeInTheDocument()
    expect(screen.getByAltText("Imagen de tableta")).toBeInTheDocument()
  })
})

describe("TresPases", () => {
  it("es el destino de #capitulos y muestra el titular", () => {
    const { container } = render(<TresPases book={book} />)
    expect(container.querySelector("#capitulos")).not.toBeNull()
    expect(screen.getByRole("heading", { level: 2, name: "Tres pases." })).toBeInTheDocument()
    expect(screen.getByText("Una vida que cambió de dirección.")).toBeInTheDocument()
  })

  it("muestra los tres minutos con dos dígitos, su nombre, su historia y su pregunta", () => {
    render(<TresPases book={book} />)
    expect(screen.getAllByRole("article")).toHaveLength(3)
    expect(screen.getByText("03")).toBeInTheDocument()
    expect(screen.getByText("18")).toBeInTheDocument()
    expect(screen.getByText("31")).toBeInTheDocument()
    expect(screen.getByText("Minuto 03 · Un sueño")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Título dos" })).toBeInTheDocument()
    expect(screen.getByText("Texto tres.")).toBeInTheDocument()
    expect(screen.getByText("¿Pregunta uno?")).toBeInTheDocument()
  })

  it("cada tarjeta lleva su imagen", () => {
    render(<TresPases book={book} />)
    for (const nombre of ["uno", "dos", "tres"]) expect(screen.getByAltText(`Imagen de ${nombre}`)).toBeInTheDocument()
  })

  it("el enlace final lleva al panel de compra", () => {
    render(<TresPases book={book} />)
    expect(screen.getByRole("link", { name: /descubre lo que pasó/i })).toHaveAttribute("href", "#comprar")
  })
})

describe("Autor", () => {
  it("es el destino de #autor y muestra el titular, el nombre y quién lo escribió", () => {
    const { container } = render(<Autor book={book} />)
    expect(container.querySelector("#autor")).not.toBeNull()
    expect(
      screen.getByRole("heading", { level: 2, name: "Antes de ser pastor, también tuvo preguntas." }),
    ).toBeInTheDocument()
    expect(screen.getByText("Nombre del Autor")).toBeInTheDocument()
    expect(screen.getByText("Una descripción del autor.")).toBeInTheDocument()
    expect(screen.getByText("Escrito junto a Otra Persona.")).toBeInTheDocument()
    expect(screen.getByAltText("Imagen de botines")).toBeInTheDocument()
  })
})

describe("Mirada", () => {
  it("muestra el titular, las tres columnas y la caja de los guayos", () => {
    render(<Mirada book={book} />)
    expect(screen.getByRole("heading", { level: 2, name: /Lees su historia/ })).toBeInTheDocument()
    for (const titulo of ["Tus sueños", "Tus procesos", "Tu manera de servir"]) {
      expect(screen.getByRole("heading", { level: 3, name: titulo })).toBeInTheDocument()
    }
    expect(screen.getByText("Texto de procesos.")).toBeInTheDocument()
    expect(screen.getByText("Al final de cada relato: ¡Ponte los guayos!")).toBeInTheDocument()
    expect(screen.getByText("Una invitación de prueba.")).toBeInTheDocument()
  })
})

describe("Cierre", () => {
  it("muestra el titular, la bajada y la nota", () => {
    render(<Cierre book={book} />)
    expect(
      screen.getByRole("heading", { level: 2, name: "Su primer tiempo está escrito. El tuyo sigue en juego." }),
    ).toBeInTheDocument()
    expect(screen.getByText("Una bajada del cierre.")).toBeInTheDocument()
    expect(screen.getByText("Libro digital · 45 relatos")).toBeInTheDocument()
    expect(screen.getByAltText("Imagen de balon")).toBeInTheDocument()
  })

  it("el botón lleva al panel de compra", () => {
    render(<Cierre book={book} />)
    expect(screen.getByRole("link", { name: /quiero leer el libro/i })).toHaveAttribute("href", "#comprar")
  })
})
