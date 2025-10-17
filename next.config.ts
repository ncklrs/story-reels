import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors. Fix linting issues in development.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Note: This should be false in production
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
