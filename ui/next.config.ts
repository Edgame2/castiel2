import path from "path";
import type { NextConfig } from "next";

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // Performance optimizations
  reactStrictMode: true,

  // Enable Turbopack for Next.js 16 (default bundler). Explicit root silences "inferred workspace root" warning when multiple lockfiles exist.
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.castiel.app',
      },
    ],
    unoptimized: false,
  },

  // Compiler options for optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for performance
  experimental: {
    // Limit build workers to avoid manifest race (ENOENT pages-manifest/next-font-manifest during "Collecting page data").
    cpus: 1,
    optimizePackageImports: [
      '@/components/ui',
      'lucide-react',
      'date-fns',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@tanstack/react-table',
    ],
  },

  // Standalone disabled: Dockerfile uses full .next + next start; standalone copy fails in this layout (ENOENT routes-manifest).
  // output: 'standalone',

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // API calls go directly to the gateway via NEXT_PUBLIC_API_BASE_URL (no proxy).
  async rewrites() {
    return { beforeFiles: [], afterFiles: [], fallback: [] };
  },
};

export default withBundleAnalyzer(nextConfig);

