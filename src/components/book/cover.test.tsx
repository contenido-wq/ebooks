import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Cover } from "./cover"

describe("Cover", () => {
  it("genera una portada de texto cuando no hay imagen", () => {
    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" src={null} />)
    const portada = screen.getByRole("img", { name: "Portada de Libro de Prueba" })
    expect(portada).toHaveTextContent("Libro de Prueba")
    expect(portada).toHaveTextContent("Autora Prueba")
  })

  it("muestra la imagen cuando hay portada", () => {
    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" src="/portada.webp" />)
    expect(screen.getByAltText("Portada de Libro de Prueba")).toBeInTheDocument()
  })
})
