import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "riegel.b-cdn.net" },
      { protocol: "https", hostname: "beuwy.com" },
    ],
  },
};

export default nextConfig;
