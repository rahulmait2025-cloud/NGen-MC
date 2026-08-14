import type { NextConfig } from "next";
let withBundleAnalyzer: (cfg: NextConfig) => NextConfig = (cfg) => cfg;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analyzer = require('@next/bundle-analyzer');
  withBundleAnalyzer = analyzer({ enabled: process.env.ANALYZE === 'true' });
} catch {
  // @next/bundle-analyzer not installed - run `npm install @next/bundle-analyzer` to enable
}

const isDev = process.env.NODE_ENV !== "production";

// Dev-only allowance so impeccable live mode can load. Guarded by NODE_ENV.
const __impeccableLiveDev = isDev ? " http://localhost:8400" : "";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${__impeccableLiveDev} https://vercel.live https://checkout.razorpay.com https://cdn.razorpay.com https://checkout-static-next.razorpay.com https://*.tpstreams.com https://static.tpstreams.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tpstreams.com https://static.tpstreams.com",
  "img-src 'self' blob: data: https://img.youtube.com https://i.ytimg.com https://i.postimg.cc https://i.pravatar.cc https://d3tjsvjjvv1f4h.cloudfront.net https://*.cloudfront.net https://static.tpstreams.com https://*.wasabisys.com https://*.amazonaws.com https://*.supabase.co https://lh3.googleusercontent.com https://raw.githubusercontent.com",
  "font-src 'self' https://fonts.gstatic.com https://esm.sh",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://api.razorpay.com https://checkout.razorpay.com https://cdn.razorpay.com https://vercel.live https://app.tpstreams.com https://link.excalidraw.com https://excalidraw.com https://www.excalidraw.com",
  "frame-ancestors 'none'",
  "worker-src 'self' blob:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com https://cdn.razorpay.com https://lumberjack.razorpay.com https://*.tpstreams.com https://app.tpstreams.com https://*.tpstreams.com https://*.cloudfront.net https://*.wasabisys.com https://*.amazonaws.com https://*.testpress.in https://esm.sh${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "media-src 'self' blob: https://*.cloudfront.net https://*.tpstreams.com https://*.wasabisys.com https://*.amazonaws.com",
].join("; ");

const nextConfig: NextConfig = withBundleAnalyzer({
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: false,
    dangerouslyAllowLocalIP: true,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },
      {
        protocol: 'https',
        hostname: 'd3tjsvjjvv1f4h.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'afgnktqrevcxbrimtdlx.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.wasabisys.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },
  cacheComponents: true,
  cacheLife: {
    // Quick data that changes often (e.g. progress, entitlements)
    halfMinute: { stale: 15, revalidate: 30, expire: 60 },
    // Catalog data (pillars, courses, bundles)
    minutes: { stale: 30, revalidate: 60, expire: 300 },
    // Dashboard and analytics data stays stable across refreshes for five minutes.
    fiveMinutes: { stale: 300, revalidate: 300, expire: 301 },
    // 10-minute cache for user progress metrics and chart
    tenMinutes: { stale: 600, revalidate: 600, expire: 601 },
    // 1-day cache for daily visits and streaks
    days: { stale: 86400, revalidate: 86400, expire: 86401 },
    // Static-ish data (pillar metadata, course structure)
    hours: { stale: 300, revalidate: 3600, expire: 86400 },
    // Course structure in course player shell — explicit 5-minute TTL.
    // No polling: refreshed by Next.js cache lifetime on the next server request.
    // Event-driven invalidation can be added later.
    courseStructure5m: { stale: 300, revalidate: 300, expire: 301 },
    // Custom settings for built-in 'weeks' profile
    weeks: { stale: 604800, revalidate: 604800, expire: 604801 },
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'radix-ui', 'sonner', 'framer-motion', 'date-fns'],
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value:
          'camera=(), microphone=(), geolocation=(), fullscreen=(self "https://app.tpstreams.com" "https://www.youtube.com" "https://www.youtube-nocookie.com"), encrypted-media=(self "https://app.tpstreams.com" "https://www.youtube.com" "https://www.youtube-nocookie.com"), payment=(), browsing-topics=(), web-share=()',
      },
      { key: "Content-Security-Policy", value: csp },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        source: "/((?!api/).*)",
        headers: securityHeaders,
      },
    ];
  },
});

export default nextConfig;
