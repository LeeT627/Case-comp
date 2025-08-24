import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // output: 'standalone', // Removed - not needed for Vercel
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Force cache invalidation on deployment
  generateBuildId: async () => {
    return Date.now().toString();
  },
};

export default nextConfig;
