import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["esgreportaibrainlab.blob.core.windows.net"],
  },
};

export default nextConfig;
