"use client"

import { type FormEvent, useId, useState } from "react"
import { Button, ButtonLink } from "@/components/ui/button"

type Estado =
  | { tipo: "reposo" }
  | { tipo: "enviando" }
  | { tipo: "listo"; url: string }
  | { tipo: "error"; mensaje: string }

const SIN_CONEXION = "No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo."
/** Solo se aceptan enlaces de nuestra propia ruta de descarga, pase lo que pase con la respuesta. */
const RUTA_DESCARGA = /^\/descarga\?t=[0-9a-f]{64}$/

type Respuesta = { ok?: boolean; url?: string; mensaje?: string }

/** Pide el correo con el que se pagó y, si hay una compra, muestra el botón con un enlace de descarga de un solo uso. */
export function FormularioDescarga() {
  const idCorreo = useId()
  const [correo, setCorreo] = useState("")
  const [estado, setEstado] = useState<Estado>({ tipo: "reposo" })

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!correo.trim()) {
      setEstado({ tipo: "error", mensaje: "Escribe tu correo para continuar." })
      return
    }
    setEstado({ tipo: "enviando" })
    try {
      const res = await fetch("/api/gracias", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correo }),
      })
      const datos = (await res.json().catch(() => ({}))) as Respuesta
      if (res.ok && datos.ok && typeof datos.url === "string" && RUTA_DESCARGA.test(datos.url)) {
        setEstado({ tipo: "listo", url: datos.url })
      } else {
        setEstado({ tipo: "error", mensaje: datos.mensaje ?? "No pudimos verificar tu compra. Inténtalo de nuevo." })
      }
    } catch {
      setEstado({ tipo: "error", mensaje: SIN_CONEXION })
    }
  }

  if (estado.tipo === "listo") {
    return (
      <div className="mt-6 text-left">
        <ButtonLink href={estado.url} className="w-full">
          Descargar mi libro (PDF) <span aria-hidden>↓</span>
        </ButtonLink>
        <p className="mt-3 text-sm leading-relaxed text-papel/75">
          Este enlace funciona una sola vez y vence en 10 minutos. Si necesitas otro, recarga la página y escribe tu correo de nuevo.
        </p>
      </div>
    )
  }

  const enviando = estado.tipo === "enviando"
  return (
    <form onSubmit={enviar} noValidate className="mt-6 text-left">
      <label htmlFor={idCorreo} className="block text-sm font-semibold text-oro-claro">
        Correo con el que pagaste
      </label>
      <input
        id={idCorreo}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-oro/40 bg-negro/60 px-4 py-3 text-base text-papel placeholder:text-papel/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
      />
      {estado.tipo === "error" ? (
        <p role="alert" className="mt-3 text-sm leading-relaxed text-red-300">
          {estado.mensaje}
        </p>
      ) : null}
      <Button type="submit" disabled={enviando} className="mt-4 w-full">
        {enviando ? "Verificando…" : "Continuar"}
      </Button>
    </form>
  )
}
