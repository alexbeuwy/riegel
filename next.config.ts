import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "riegel.b-cdn.net" },
      { protocol: "https", hostname: "beuwy.com" },
    ],
  },
};

export default nextConfig;
