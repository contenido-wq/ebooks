import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FormularioDescarga } from "./formulario-descarga"

afterEach(() => vi.unstubAllGlobals())

/** Un ticket con el formato real (64 caracteres hexadecimales): el formulario rechaza cualquier otro. */
const RUTA = `/descarga?t=${"a1".repeat(32)}`

function responde(estado: number, cuerpo: Record<string, unknown>) {
  const fetchFalso = vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado }))
  vi.stubGlobal("fetch", fetchFalso)
  return fetchFalso
}

function escribirYEnviar(correo: string) {
  fireEvent.change(screen.getByLabelText(/correo con el que pagaste/i), { target: { value: correo } })
  fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
}

describe("FormularioDescarga", () => {
  it("pide el correo con el que se pagó", () => {
    render(<FormularioDescarga />)
    expect(screen.getByLabelText(/correo con el que pagaste/i)).toHaveAttribute("type", "email")
    expect(screen.getByRole("button", { name: /continuar/i })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /descargar/i })).not.toBeInTheDocument()
  })

  it("si hay compra, muestra el botón de descarga con el enlace de un solo uso", async () => {
    const fetchFalso = responde(200, { ok: true, url: RUTA })
    render(<FormularioDescarga />)
    escribirYEnviar("ana@mail.com")

    const enlace = await screen.findByRole("link", { name: /descargar mi libro/i })
    expect(enlace).toHaveAttribute("href", RUTA)
    expect(screen.getByText(/una sola vez/i)).toBeInTheDocument()
    expect(screen.getByText(/10 minutos/i)).toBeInTheDocument()

    expect(fetchFalso).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/gracias")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ correo: "ana@mail.com" })
  })

  it("si no hay compra, muestra el mensaje del servidor y no ofrece descarga", async () => {
    responde(404, { ok: false, mensaje: "No encontramos una compra con ese correo." })
    render(<FormularioDescarga />)
    escribirYEnviar("otra@mail.com")

    expect(await screen.findByRole("alert")).toHaveTextContent("No encontramos una compra con ese correo.")
    expect(screen.queryByRole("link", { name: /descargar/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/correo con el que pagaste/i)).toBeEnabled()
  })

  it("si falla la conexión, avisa en español", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network") }))
    render(<FormularioDescarga />)
    escribirYEnviar("ana@mail.com")
    expect(await screen.findByRole("alert")).toHaveTextContent(/conexión/i)
  })

  it("sin escribir nada no consulta al servidor y pide el correo", async () => {
    const fetchFalso = responde(200, { ok: true, url: RUTA })
    render(<FormularioDescarga />)
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/escribe tu correo/i)
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it("mientras consulta, el botón queda deshabilitado", async () => {
    let terminar: (r: Response) => void = () => {}
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolver) => { terminar = resolver })))
    render(<FormularioDescarga />)
    escribirYEnviar("ana@mail.com")

    await waitFor(() => expect(screen.getByRole("button", { name: /verificando/i })).toBeDisabled())
    terminar(new Response(JSON.stringify({ ok: true, url: RUTA }), { status: 200 }))
    expect(await screen.findByRole("link", { name: /descargar mi libro/i })).toBeInTheDocument()
  })

  it("un enlace que no sea de nuestra ruta de descarga se ignora", async () => {
    responde(200, { ok: true, url: "https://sitio-malo.example.com/virus.pdf" })
    render(<FormularioDescarga />)
    escribirYEnviar("ana@mail.com")
    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /descargar/i })).not.toBeInTheDocument()
  })
})
