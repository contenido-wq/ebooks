"use client"

import { useEffect, useState } from "react"
import { ButtonLink } from "@/components/ui/button"

export function StickyBuyBar({ precio }: { precio: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hero = document.getElementById("hero")
    const compra = document.getElementById("comprar")
    if (!hero || !compra || typeof IntersectionObserver === "undefined") return

    let heroVisible = true
    let compraVisible = false

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroVisible = entry.isIntersecting
        if (entry.target === compra) compraVisible = entry.isIntersecting
      }
      setVisible(!heroVisible && !compraVisible)
    })

    observer.observe(hero)
    observer.observe(compra)
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-papel/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">
      <ButtonLink href="#comprar" className="w-full">
        Comprar · {precio}
      </ButtonLink>
    </div>
  )
}
