import type { NextConfig } from 'next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let withBundleAnalyzer: (cfg: NextConfig) => NextConfig = (cfg) => cfg;
try {
  const analyzer = require('@next/bundle-analyzer');
  withBundleAnalyzer = analyzer({ enabled: process.env.ANALYZE === 'true' });
} catch {
  // @next/bundle-analyzer not installed — run `npm install @next/bundle-analyzer` to enable
}

const isDev = process.env.NODE_ENV !== 'production';

const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://vercel.live https://static.tpstreams.com https://checkout.razorpay.com https://cdn.razorpay.com https://checkout-static-next.razorpay.com${isDev ? " 'unsafe-eval'" : ''}`,
    `script-src-elem 'self' 'unsafe-inline' https://vercel.live https://static.tpstreams.com https://checkout.razorpay.com https://cdn.razorpay.com https://checkout-static-next.razorpay.com`,
    "style-src 'self' 'unsafe-inline' https://static.tpstreams.com",
    "img-src 'self' blob: data: https://i.postimg.cc https://d3tjsvjjvv1f4h.cloudfront.net https://*.cloudfront.net https://static.tpstreams.com https://*.wasabisys.com https://*.amazonaws.com",
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' https://app.tpstreams.com https://api.razorpay.com https://checkout.razorpay.com",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.tpstreams.com https://*.tpstreams.com https://*.cloudfront.net https://*.wasabisys.com https://*.amazonaws.com https://api.razorpay.com https://checkout.razorpay.com https://cdn.razorpay.com https://checkout-static-next.razorpay.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
    "media-src 'self' blob: https://*.cloudfront.net https://*.tpstreams.com https://*.wasabisys.com https://*.amazonaws.com",
].join('; ');

const nextConfig: NextConfig = withBundleAnalyzer({
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'd3tjsvjjvv1f4h.cloudfront.net',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  cacheComponents: true,
  cacheLife: {
    halfMinute: { stale: 15, revalidate: 30, expire: 60 },
    minutes: { stale: 30, revalidate: 60, expire: 300 },
    analytics5m: { stale: 300, revalidate: 300, expire: 600 },
    hours: { stale: 300, revalidate: 3600, expire: 86400 },
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'radix-ui', 'recharts', 'sonner'],
    staleTimes: {
      dynamic: 120,
      static: 180,
    },
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), fullscreen=(), payment=(), browsing-topics=(), web-share=()' },
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' }
    ];

    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'private, no-store, must-revalidate' },
        ],
      },
      {
        source: '/((?!api/).*)',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/c/:slug/admin/dashboard/:path+',
        destination: '/c/:slug/admin/:path*',
        permanent: true,
      },
    ];
  },
});

export default nextConfig;