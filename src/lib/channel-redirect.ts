import { NextResponse } from "next/server"
import { type ChannelKey, channelUrl } from "./channels"

/**
 * Redirección temporal (307) y sin caché: así el destino de un QR impreso puede cambiar sin reimprimir.
 */
export function channelRedirect(channel: ChannelKey) {
  return function GET(request: Request): Response {
    const response = NextResponse.redirect(channelUrl(channel, new URL(request.url).origin), 307)
    response.headers.set("Cache-Control", "no-store")
    return response
  }
}
