import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StickyBuyBar } from "./sticky-buy-bar"

class FakeObserver {
  static instances: FakeObserver[] = []
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = () => []
  constructor(public callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this)
  }
}

function avisar(hero: Element, compra: Element, heroVisible: boolean, compraVisible: boolean) {
  const observer = FakeObserver.instances[0]
  act(() => {
    observer.callback(
      [
        { target: hero, isIntersecting: heroVisible },
        { target: compra, isIntersecting: compraVisible },
      ] as IntersectionObserverEntry[],
      observer as unknown as IntersectionObserver,
    )
  })
}

describe("StickyBuyBar", () => {
  beforeEach(() => {
    FakeObserver.instances = []
    vi.stubGlobal("IntersectionObserver", FakeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function montar() {
    render(
      <>
        <div id="hero" />
        <div id="comprar" />
        <StickyBuyBar precio="US$19.99" />
      </>,
    )
    return {
      hero: document.getElementById("hero") as Element,
      compra: document.getElementById("comprar") as Element,
    }
  }

  it("está oculta mientras se ve el hero", () => {
    montar()
    expect(screen.queryByRole("link", { name: /comprar/i })).toBeNull()
  })

  it("aparece al salir del hero y enlaza a #comprar", () => {
    const { hero, compra } = montar()
    avisar(hero, compra, false, false)
    const enlace = screen.getByRole("link", { name: /comprar/i })
    expect(enlace).toHaveAttribute("href", "#comprar")
    expect(enlace).toHaveTextContent("US$19.99")
  })

  it("se oculta cuando el panel de compra ya está a la vista", () => {
    const { hero, compra } = montar()
    avisar(hero, compra, false, false)
    avisar(hero, compra, false, true)
    expect(screen.queryByRole("link", { name: /comprar/i })).toBeNull()
  })

  it("no falla si el navegador no soporta IntersectionObserver", () => {
    vi.unstubAllGlobals()
    montar()
    expect(screen.queryByRole("link", { name: /comprar/i })).toBeNull()
  })
})
