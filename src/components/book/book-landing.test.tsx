import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { BookLanding } from "./book-landing"

describe("BookLanding", () => {
  it("compone todas las secciones de la página", () => {
    render(<BookLanding book={makeBook()} />)
    expect(screen.getByRole("heading", { level: 1, name: "¿En qué minuto de tu vida estás?" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /Cumplió su sueño/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Tres pases." })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /Antes de ser pastor/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /Lees su historia/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: /Su primer tiempo está escrito/ })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Preguntas frecuentes" })).toBeInTheDocument()
  })

  it("ordena las secciones que sirven de destino a los enlaces", () => {
    const { container } = render(<BookLanding book={makeBook()} />)
    const ids = [...container.querySelectorAll("section[id]")].map((seccion) => seccion.id)
    expect(ids).toEqual(["hero", "el-libro", "capitulos", "autor", "comprar"])
  })

  it("el panel de compra va después del cierre, para que el botón final baje a él", () => {
    const { container } = render(<BookLanding book={makeBook()} />)
    const cierre = screen.getByRole("heading", { level: 2, name: /Su primer tiempo está escrito/ })
    const compra = container.querySelector("#comprar") as Element
    expect(cierre.compareDocumentPosition(compra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("muestra el copyright de los autores y quién distribuye", () => {
    render(<BookLanding book={makeBook()} />)
    expect(screen.getByText(/© 2026 Autora Prueba/)).toBeInTheDocument()
    expect(screen.getByText(/Distribución digital: Ebooks de Jhei Trujillo/)).toBeInTheDocument()
  })

  it("no muestra la sección de testimonios mientras no haya ninguno", () => {
    render(<BookLanding book={makeBook({ testimonios: [] })} />)
    expect(screen.queryByText("Lo que dicen los lectores")).toBeNull()
  })
})
