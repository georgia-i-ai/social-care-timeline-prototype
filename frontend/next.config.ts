import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The kit's React wrappers ship as raw TypeScript source.
  transpilePackages: ["@i-dot-ai-npm/component-library-react"],
};

export default nextConfig;
