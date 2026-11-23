import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getFeaturedBook } from "@/content/books"
import type { Book } from "@/content/types"
import { Gracias } from "./gracias"

const URL_PDF = "https://drive.google.com/file/d/ID/view?usp=sharing"
const URL_WEMANY = "https://app.wemany.com/mi-cuenta"

function libro(urlCuentaWemany: string | null = URL_WEMANY): Book {
  return { ...getFeaturedBook(), postCompra: { urlDescarga: URL_PDF, urlCuentaWemany } }
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

  it("el botón de Wemany lleva a la cuenta del dueño en una pestaña nueva y segura", () => {
    render(<Gracias book={libro()} />)
    const enlace = screen.getByRole("link", { name: /entrar a mi cuenta en wemany/i })
    expect(enlace).toHaveAttribute("href", URL_WEMANY)
    expect(enlace).toHaveAttribute("target", "_blank")
    expect(enlace.getAttribute("rel")).toContain("noopener")
  })

  it("sin enlace de Wemany no muestra el botón (no deja un enlace roto)", () => {
    render(<Gracias book={libro(null)} />)
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
