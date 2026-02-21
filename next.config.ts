import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep sharp as external so Vercel uses the full native binary
  // with all codecs (HEIC, AVIF, etc.) instead of a stripped bundle
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
