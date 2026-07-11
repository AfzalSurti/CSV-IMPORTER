import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables a minimal, self-contained server.js build for Docker deployments.
  output: "standalone",
};

export default nextConfig;
