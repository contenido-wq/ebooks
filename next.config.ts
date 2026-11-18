import type { NextConfig } from "next";

/**
 * Política de contenido: solo se carga lo propio. 'unsafe-inline' es necesario porque el arranque de la página
 * (vinext / React) inyecta scripts y estilos en línea. Los enlaces a Wemany son navegación, no carga de recursos.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const CABECERAS_SEGURIDAD = [
  { key: "Content-Security-Policy", value: CSP },
  // 6 meses; sin includeSubDomains ni preload hasta confirmar que todos los subdominios usan HTTPS.
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }]
  },
  images: {
    // Las imágenes ya vienen preparadas en WebP de alta calidad (scripts/imagenes). Recomprimirlas en Cloudflare
    // les quitaba la textura de la piel, así que se sirven tal cual.
    unoptimized: true,
    // Next 16 solo permite las calidades declaradas. 80 es la de las escenas y 92 la de la foto de la portada,
    // que es lo primero que se ve y donde más se nota la piel lisa de una compresión fuerte.
    qualities: [75, 80, 92],
  },
};

export default nextConfig;
