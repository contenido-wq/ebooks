import { recibirWebhook, type EntornoWebhook } from "@/lib/wemany/recibir"

export const dynamic = "force-dynamic"

async function leerEntorno(): Promise<EntornoWebhook> {
  // En Cloudflare los secretos están en el Worker; en desarrollo local salen de process.env.
  const origen = process.env
  const desdeProcess: EntornoWebhook = {
    WEBHOOK_TOKEN: origen.WEBHOOK_TOKEN,
    SHEETS_SCRIPT_URL: origen.SHEETS_SCRIPT_URL,
    SHEETS_SCRIPT_TOKEN: origen.SHEETS_SCRIPT_TOKEN,
  }
  if (desdeProcess.WEBHOOK_TOKEN) return desdeProcess
  try {
    const modulo = "cloudflare:workers"
    const { env } = (await import(/* @vite-ignore */ /* webpackIgnore: true */ modulo)) as { env: EntornoWebhook }
    return env
  } catch {
    return desdeProcess
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return recibirWebhook(req, token, await leerEntorno())
}
