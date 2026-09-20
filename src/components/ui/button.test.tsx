import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button, ButtonLink } from "./button"

describe("Button", () => {
  it("renderiza un botón con su texto", () => {
    render(<Button>Pagar</Button>)
    expect(screen.getByRole("button", { name: "Pagar" })).toBeEnabled()
  })

  it("respeta disabled", () => {
    render(<Button disabled>Pagar</Button>)
    expect(screen.getByRole("button", { name: "Pagar" })).toBeDisabled()
  })
})

describe("ButtonLink", () => {
  it("renderiza un enlace con su href", () => {
    render(<ButtonLink href="#comprar">Comprar</ButtonLink>)
    expect(screen.getByRole("link", { name: "Comprar" })).toHaveAttribute("href", "#comprar")
  })
})
