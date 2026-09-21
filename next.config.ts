import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 solo permite las calidades declaradas. 80 es la de las escenas y 92 la de la foto de la portada,
    // que es lo primero que se ve y donde más se nota la piel lisa de una compresión fuerte.
    qualities: [75, 80, 92],
  },
};

export default nextConfig;
