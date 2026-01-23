import type { NextConfig } from "next";

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  // Performance optimizations
  reactStrictMode: true,

  // Enable Turbopack for Next.js 16 (default bundler)
  turbopack: {},

  // Reduce file watching to prevent ENOSPC errors (Turbopack respects these)
  webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.pnpm/**',
          '**/dist/**',
          '**/.turbo/**',
          '**/.next/**',
          '**/coverage/**',
        ],
        aggregateTimeout: 300,
        poll: false,
      };
    }
    return config;
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'], // Modern formats for better compression
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year - images are immutable
    dangerouslyAllowSVG: true, // Allow SVG optimization
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.castiel.app',
      },
      {
        protocol: 'https',
        hostname: 'api.castiel.app',
      },
    ],
    // Optimize image loading
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

  // Output configuration for better caching
  output: 'standalone',

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
        // Next.js static assets (_next/static)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Next.js image optimization (_next/image)
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Static files in public folder
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Font files
        source: '/:path*\\.(woff|woff2|ttf|otf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Image files
        source: '/:path*\\.(jpg|jpeg|png|gif|webp|avif|svg|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },

  // Proxy API requests to backend
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `http://localhost:${process.env.API_PORT || 3001}/api/v1/:path*`,
      },
      {
        source: '/api/profile/:path*',
        destination: `http://localhost:${process.env.API_PORT || 3001}/api/profile/:path*`,
      },
      {
        source: '/api/auth/:path*',
        destination: `http://localhost:${process.env.API_PORT || 3001}/api/auth/:path*`,
      },
    ]
  },

  // Webpack configuration for bundle optimization
  // Note: Commented out for Turbopack compatibility in Next.js 16
  // TODO: Migrate to Turbopack configuration when available
  // webpack: (config, { isServer }) => {
  //   // Optimize bundle size
  //   if (!isServer) {
  //     config.optimization = {
  //       ...config.optimization,
  //       splitChunks: {
  //         chunks: 'all',
  //         cacheGroups: {
  //           default: false,
  //           vendors: false,
  //           // Vendor chunk for react/react-dom
  //           framework: {
  //             name: 'framework',
  //             test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
  //             priority: 40,
  //             enforce: true,
  //           },
  //           // Commons chunk for shared code
  //           commons: {
  //             name: 'commons',
  //             minChunks: 2,
  //             priority: 20,
  //           },
  //           // UI component library chunk
  //           lib: {
  //             test: /[\\/]node_modules[\\/]/,
  //             name(module: any) {
  //               const packageName = module.context.match(
  //                 /[\\/]node_modules[\\/](.*?)([\\/]|$)/
  //               )?.[1]
  //               return `npm.${packageName?.replace('@', '')}`
  //             },
  //             priority: 30,
  //           },
  //         },
  //       },
  //     }
  //   }

  //   return config
  // },
};

export default withBundleAnalyzer(nextConfig);
