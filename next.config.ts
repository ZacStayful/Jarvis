import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["jarvis.stayful.co.uk"],
    },
  },
};

export default nextConfig;
