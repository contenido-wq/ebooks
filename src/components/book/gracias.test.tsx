import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getFeaturedBook } from "@/content/books"
import type { Book } from "@/content/types"
import { Gracias } from "./gracias"

const URL_PDF = "https://drive.google.com/file/d/ID/view?usp=sharing"

function libro(): Book {
  return { ...getFeaturedBook(), postCompra: { urlDescarga: URL_PDF } }
}

describe("Gracias", () => {
  it("agradece la compra y muestra la portada del libro", () => {
    render(<Gracias book={libro()} />)
    expect(screen.getByRole("heading", { level: 1, name: /gracias/i })).toBeInTheDocument()
    expect(screen.getByAltText(`Portada de ${getFeaturedBook().titulo}`)).toBeInTheDocument()
  })

  it("el botón de descarga abre el PDF en una pestaña nueva y segura", () => {
    render(<Gracias book={libro()} />)
    const enlace = screen.getByRole("link", { name: /descargar mi libro/i })
    expect(enlace).toHaveAttribute("href", URL_PDF)
    expect(enlace).toHaveAttribute("target", "_blank")
    expect(enlace.getAttribute("rel")).toContain("noopener")
  })

  it("avisa que el PDF se abre en Google Drive y que allí se toca descargar", () => {
    render(<Gracias book={libro()} />)
    expect(screen.getByText(/se abre en google drive/i)).toBeInTheDocument()
  })

  it("avisa que el acceso a Wemany llega por correo", () => {
    render(<Gracias book={libro()} />)
    expect(screen.getByText(/revisa tu correo/i)).toBeInTheDocument()
  })

  it("no ofrece ningún botón hacia Wemany: el enlace de acceso llega por correo", () => {
    render(<Gracias book={libro()} />)
    expect(screen.queryByRole("link", { name: /wemany/i })).not.toBeInTheDocument()
  })

  it("con WhatsApp muestra la ayuda y sin WhatsApp no", () => {
    const { unmount } = render(<Gracias book={libro()} whatsappUrl="https://wa.me/573001112233?text=Hola" />)
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute("href", "https://wa.me/573001112233?text=Hola")
    unmount()

    render(<Gracias book={libro()} />)
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument()
  })

  it("un libro sin datos de post-compra no pinta nada", () => {
    const { container } = render(<Gracias book={{ ...getFeaturedBook(), postCompra: undefined }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
