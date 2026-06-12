import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/analytics", "@repo/db"],
  outputFileTracingRoot: require("path").join(__dirname, "../.."),
};

export default nextConfig;
