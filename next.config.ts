import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 solo permite las calidades declaradas. 80 es la de las fotos de la portada y las escenas.
    qualities: [75, 80],
  },
};

export default nextConfig;
