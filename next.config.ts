import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],

  images: {
    // ✅ FIX: Re-enabled. All images are same-origin via /api/photos/thumbnail,
    // which already handles resizing server-side with sharp — but Next's
    // optimizer still adds responsive srcset, AVIF/WebP negotiation, and
    // browser-level lazy loading on top of that for free.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000, // 30 days — matches thumbnail route Cache-Control
  },
};

export default nextConfig;
