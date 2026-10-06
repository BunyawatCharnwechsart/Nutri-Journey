import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker image (standalone server.js).
  // Vercel ignores this and uses its own build output.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "profile.line-scdn.net" },
      { protocol: "https", hostname: "sprofile.line-scdn.net" },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
