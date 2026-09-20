export const CHANNELS = {
  ig: { source: "instagram", medium: "bio" },
  tiktok: { source: "tiktok", medium: "bio" },
  wa: { source: "whatsapp", medium: "chat" },
  qr: { source: "qr", medium: "offline" },
} as const satisfies Record<string, { source: string; medium: string }>

export type ChannelKey = keyof typeof CHANNELS

const CAMPAIGN = "tienda"

export function channelUrl(channel: ChannelKey, origin: string): string {
  const { source, medium } = CHANNELS[channel]
  const url = new URL("/", origin)
  url.searchParams.set("utm_source", source)
  url.searchParams.set("utm_medium", medium)
  url.searchParams.set("utm_campaign", CAMPAIGN)
  return url.toString()
}
