import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Cover } from "./cover"

describe("Cover", () => {
  it("genera una portada de texto cuando no hay imagen", () => {
    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" portada={null} />)
    const portada = screen.getByRole("img", { name: "Portada de Libro de Prueba" })
    expect(portada).toHaveTextContent("Libro de Prueba")
    expect(portada).toHaveTextContent("Autora Prueba")
  })

  it("muestra la imagen con sus dimensiones reales cuando hay portada", () => {
    render(
      <Cover
        titulo="Libro de Prueba"
        autor="Autora Prueba"
        portada={{ src: "/portada.webp", ancho: 879, alto: 1417 }}
      />,
    )
    const imagen = screen.getByAltText("Portada de Libro de Prueba")
    expect(imagen).toHaveAttribute("width", "879")
    expect(imagen).toHaveAttribute("height", "1417")
  })

  it("carga la imagen de inmediato cuando está arriba del pliegue (eager) y en diferido si no", () => {
    const portada = { src: "/portada.webp", ancho: 879, alto: 1417 }
    const { unmount } = render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" portada={portada} eager />)
    expect(screen.getByAltText("Portada de Libro de Prueba")).toHaveAttribute("loading", "eager")
    unmount()

    render(<Cover titulo="Libro de Prueba" autor="Autora Prueba" portada={portada} />)
    expect(screen.getByAltText("Portada de Libro de Prueba")).toHaveAttribute("loading", "lazy")
  })
})
