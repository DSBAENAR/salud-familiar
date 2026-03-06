import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["child_process"],
  output: "standalone",
};

export default nextConfig;
