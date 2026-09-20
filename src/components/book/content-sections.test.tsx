import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { Audience } from "./audience"
import { Author } from "./author"
import { Contents } from "./contents"
import { Hero } from "./hero"

const book = makeBook()

describe("Hero", () => {
  it("muestra el título como encabezado principal", () => {
    render(<Hero book={book} />)
    expect(screen.getByRole("heading", { level: 1, name: "Libro de Prueba" })).toBeInTheDocument()
    expect(screen.getByText("Un subtítulo de prueba")).toBeInTheDocument()
  })

  it("enlaza a la sección de compra con el precio", () => {
    render(<Hero book={book} />)
    const enlace = screen.getByRole("link", { name: /comprar ahora/i })
    expect(enlace).toHaveAttribute("href", "#comprar")
    expect(enlace).toHaveTextContent("US$19.99")
  })

  it("muestra la portada y la garantía", () => {
    render(<Hero book={book} />)
    expect(screen.getByRole("img", { name: "Portada de Libro de Prueba" })).toBeInTheDocument()
    expect(screen.getByText(/garantía de 7 días/i)).toBeInTheDocument()
  })
})

describe("Audience", () => {
  it("lista cada situación", () => {
    render(<Audience book={book} />)
    expect(screen.getByText("Quieres leer algo")).toBeInTheDocument()
    expect(screen.getByText("Buscas inspiración")).toBeInTheDocument()
  })
})

describe("Contents", () => {
  it("muestra la sinopsis y cada aprendizaje", () => {
    render(<Contents book={book} />)
    expect(screen.getByText("Sinopsis de prueba.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 4, name: "Capítulo uno" })).toBeInTheDocument()
    expect(screen.getByText("Descripción dos")).toBeInTheDocument()
  })

  it("separa la sinopsis en un párrafo por cada línea en blanco", () => {
    render(<Contents book={makeBook({ sinopsis: "Primer párrafo.\n\nSegundo párrafo." })} />)
    expect(screen.getByText("Primer párrafo.")).toBeInTheDocument()
    expect(screen.getByText("Segundo párrafo.")).toBeInTheDocument()
  })
})

describe("Author", () => {
  it("muestra los autores y su biografía", () => {
    render(<Author book={book} />)
    expect(screen.getByRole("heading", { name: "Sobre los autores" })).toBeInTheDocument()
    expect(screen.getByText("Autora Prueba")).toBeInTheDocument()
    expect(screen.getByText("Bio de prueba.")).toBeInTheDocument()
  })
})
