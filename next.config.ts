import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp as external so Vercel uses the full native binary
  // with all codecs (HEIC, AVIF, etc.) instead of a stripped bundle
  serverExternalPackages: ["sharp"],

  images: {
    // Cover images come from /api/photos/thumbnail (same origin)
    // No remotePatterns needed — just enabling the loader
    unoptimized: true,
  },
};

export default nextConfig;
