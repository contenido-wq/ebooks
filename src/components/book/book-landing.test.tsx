import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { BookLanding } from "./book-landing"

describe("BookLanding", () => {
  it("compone todas las secciones de la página", () => {
    const { container } = render(<BookLanding book={makeBook()} />)
    expect(screen.getByRole("heading", { level: 1, name: "Libro de Prueba" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "De qué trata" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Sobre los autores" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /garantía de 7 días/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Preguntas frecuentes" })).toBeInTheDocument()
    expect(container.querySelector("#hero")).not.toBeNull()
    expect(container.querySelector("#comprar")).not.toBeNull()
  })

  it("muestra el copyright de los autores y quién distribuye", () => {
    render(<BookLanding book={makeBook()} />)
    expect(screen.getByText(/© 2026 Autora Prueba/)).toBeInTheDocument()
    expect(screen.getByText(/Distribución digital: Ebooks de Jhei Trujillo/)).toBeInTheDocument()
  })
})
