import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeBook } from "@/test/fixtures"
import { Faq } from "./faq"
import { PurchasePanel } from "./purchase-panel"
import { Testimonials } from "./testimonials"

describe("Testimonials", () => {
  it("no renderiza nada si no hay testimonios", () => {
    const { container } = render(<Testimonials book={makeBook({ testimonios: [] })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("muestra cada testimonio con su autor", () => {
    const book = makeBook({
      testimonios: [{ nombre: "Ana", texto: "Me cambió la mirada", detalle: "Medellín" }],
    })
    render(<Testimonials book={book} />)
    expect(screen.getByText(/Me cambió la mirada/)).toBeInTheDocument()
    expect(screen.getByText("Ana")).toBeInTheDocument()
    expect(screen.getByText(/Medellín/)).toBeInTheDocument()
  })
})

describe("Faq", () => {
  it("muestra cada pregunta y su respuesta", () => {
    render(<Faq book={makeBook()} />)
    expect(screen.getByText("¿Cómo leo el libro?")).toBeInTheDocument()
    expect(screen.getByText("En línea.")).toBeInTheDocument()
  })
})

describe("PurchasePanel", () => {
  it("es el destino de #comprar y muestra ambos precios", () => {
    const { container } = render(<PurchasePanel book={makeBook()} />)
    expect(container.querySelector("#comprar")).not.toBeNull()
    expect(screen.getByText("US$19.99")).toBeInTheDocument()
    expect(screen.getByText(/\$79\.900 COP/)).toBeInTheDocument()
  })

  it("el botón de compra lleva al enlace de pago", () => {
    render(<PurchasePanel book={makeBook({ urlCompra: "https://pagos.example.com/x" })} />)
    expect(screen.getByRole("link", { name: /comprar ahora/i })).toHaveAttribute("href", "https://pagos.example.com/x")
  })

  it("deshabilita la compra si no hay enlace de pago", () => {
    render(<PurchasePanel book={makeBook({ urlCompra: "" })} />)
    expect(screen.getByRole("button", { name: /comprar ahora/i })).toBeDisabled()
  })

  it("muestra el botón de WhatsApp solo si hay enlace", () => {
    const { rerender } = render(<PurchasePanel book={makeBook()} whatsappUrl={null} />)
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull()

    rerender(<PurchasePanel book={makeBook()} whatsappUrl="https://wa.me/573001234567?text=Hola" />)
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/573001234567?text=Hola",
    )
  })
})
