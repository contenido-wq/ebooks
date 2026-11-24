import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { getFeaturedBook } from "@/content/books"
import { Gracias } from "./gracias"

const libro = getFeaturedBook()

describe("Gracias", () => {
  it("agradece la compra y muestra la portada del libro", () => {
    render(<Gracias book={libro} />)
    expect(screen.getByRole("heading", { level: 1, name: /gracias/i })).toBeInTheDocument()
    expect(screen.getByAltText(`Portada de ${libro.titulo}`)).toBeInTheDocument()
    expect(screen.getByText(/tu compra quedó confirmada/i)).toBeInTheDocument()
  })

  it("pide el correo con el que se pagó para dar la descarga", () => {
    render(<Gracias book={libro} />)
    expect(screen.getByLabelText(/correo con el que pagaste/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /continuar/i })).toBeInTheDocument()
  })

  it("al abrirla no contiene ningún enlace al libro: ni Drive, ni PDF, ni la ruta de descarga", () => {
    const { container } = render(<Gracias book={libro} whatsappUrl="https://wa.me/573001112233?text=Hola" />)
    expect(screen.queryByRole("link", { name: /descargar/i })).not.toBeInTheDocument()
    expect(container.querySelector('a[href*="drive.google.com"]')).toBeNull()
    expect(container.querySelector('a[href*=".pdf"]')).toBeNull()
    expect(container.querySelector('a[href*="/descarga"]')).toBeNull()
    expect(container.innerHTML).not.toMatch(/drive\.google\.com|\/descarga\?t=/)
  })

  it("recuerda que el libro es de uso personal", () => {
    render(<Gracias book={libro} />)
    expect(screen.getByText(/uso personal/i)).toBeInTheDocument()
  })

  it("con WhatsApp ofrece ayuda si no encuentra su compra, y sin WhatsApp no", () => {
    const { unmount } = render(<Gracias book={libro} whatsappUrl="https://wa.me/573001112233?text=Hola" />)
    const enlace = screen.getByRole("link", { name: /whatsapp/i })
    expect(enlace).toHaveAttribute("href", "https://wa.me/573001112233?text=Hola")
    expect(enlace).toHaveAttribute("target", "_blank")
    expect(enlace.getAttribute("rel")).toContain("noopener")
    unmount()

    render(<Gracias book={libro} />)
    expect(screen.queryByRole("link", { name: /whatsapp/i })).not.toBeInTheDocument()
  })
})
