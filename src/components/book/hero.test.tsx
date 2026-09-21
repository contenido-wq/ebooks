import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { Hero } from "./hero"

const book = makeBook()

describe("Hero", () => {
  it("el titular junta la parte clara y la dorada", () => {
    render(<Hero book={book} />)
    expect(
      screen.getByRole("heading", { level: 1, name: "¿En qué minuto de tu vida estás?" }),
    ).toBeInTheDocument()
  })

  it("el botón principal lleva al panel de compra", () => {
    render(<Hero book={book} />)
    expect(screen.getByRole("link", { name: /quiero leer su historia/i })).toHaveAttribute("href", "#comprar")
  })

  it("muestra la bajada, la etiqueta, los autores y la frase manuscrita", () => {
    render(<Hero book={book} />)
    expect(screen.getByText("Una bajada de prueba.")).toBeInTheDocument()
    expect(screen.getByText("Libro digital · 45 relatos")).toBeInTheDocument()
    expect(screen.getByText("Autora Prueba")).toBeInTheDocument()
    expect(screen.getByText("Una frase manuscrita")).toBeInTheDocument()
  })

  it("trae la foto con su texto alternativo", () => {
    render(<Hero book={book} />)
    expect(screen.getByAltText("Imagen de hero-movil")).toBeInTheDocument()
  })

  it("es el destino de #hero y trae el menú con los enlaces a las secciones", () => {
    const { container } = render(<Hero book={book} />)
    expect(container.querySelector("#hero")).not.toBeNull()

    const menu = within(screen.getByRole("navigation", { name: "Principal" }))
    expect(menu.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "#hero")
    expect(menu.getByRole("link", { name: "El libro" })).toHaveAttribute("href", "#el-libro")
    expect(menu.getByRole("link", { name: "El autor" })).toHaveAttribute("href", "#autor")
    expect(menu.getByRole("link", { name: "Capítulos" })).toHaveAttribute("href", "#capitulos")
  })

  it("parte el nombre del libro en dos líneas en el encabezado", () => {
    render(<Hero book={makeBook({ titulo: "Si Dios jugara fútbol" })} />)
    const enlace = screen.getAllByRole("link").find((a) => a.textContent === "Si Diosjugara fútbol")
    expect(enlace).toBeDefined()
  })
})
