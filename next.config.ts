import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading Leaflet tile images from OpenStreetMap
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
