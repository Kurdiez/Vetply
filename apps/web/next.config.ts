import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@vetply/shared'],
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid stale webpack cache vs `.next` (missing chunks / manifests after HMR).
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
