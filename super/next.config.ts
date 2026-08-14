import path from 'node:path';
import type { NextConfig } from 'next';

const projectRoot = path.resolve(__dirname);

let withBundleAnalyzer: (cfg: NextConfig) => NextConfig = (cfg) => cfg;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const analyzer = require('@next/bundle-analyzer');
  withBundleAnalyzer = analyzer({ enabled: process.env.ANALYZE === 'true' });
} catch {
  // @next/bundle-analyzer not installed — run `npm install @next/bundle-analyzer` to enable
}

const isDev = process.env.NODE_ENV !== 'production';

const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://vercel.live https://static.testpress.in https://static.tpstreams.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://static.tpstreams.com",
    "img-src 'self' blob: data: https://i.postimg.cc https://d3tjsvjjvv1f4h.cloudfront.net https://*.cloudfront.net https://static.tpstreams.com https://*.wasabisys.com https://*.amazonaws.com https://*.supabase.co https://img.youtube.com https://i.ytimg.com",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'self' https://app.tpstreams.com https://vercel.live",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.tpstreams.com https://*.tpstreams.com https://*.cloudfront.net https://s3.eu-central-1.wasabisys.com https://*.wasabisys.com https://*.amazonaws.com${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
    "media-src 'self' blob: https://*.cloudfront.net https://*.tpstreams.com https://*.wasabisys.com https://*.amazonaws.com",
].join('; ');

const nextConfig: NextConfig = {
    // Pin workspace root so Turbopack resolves node_modules/next from super/, not D:\NextGen.
    turbopack: {
        root: projectRoot,
    },
    outputFileTracingRoot: projectRoot,
    // Enable the `use cache` directive (Next.js 16) — replaces unstable_cache.
    // See: https://nextjs.org/docs/app/api-reference/directives/use-cache
    cacheComponents: true,
    // Custom cache lifetime profiles used by `cacheLife()` calls in
    // `use cache` scopes. Tuned for admin dashboard data that changes
    // more frequently than the default 15-min revalidate.
    cacheLife: {
        halfMinute: { stale: 15, revalidate: 30, expire: 60 },
        minutes: { stale: 30, revalidate: 60, expire: 300 },
        "10minutes": { stale: 300, revalidate: 600, expire: 1200 },
        hours: { stale: 300, revalidate: 3600, expire: 86400 },
    },
    images: {
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
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.co',
            },
        ],
    },
    // Tree-shake barrel imports to reduce unused JS (Lighthouse: "Reduce unused JavaScript")
    experimental: {
        optimizePackageImports: ['lucide-react', 'radix-ui', 'recharts', 'sonner', 'framer-motion'],
        staleTimes: {
            dynamic: 300,
            static: 300,
        },
        serverActions: {
            bodySizeLimit: '3mb',
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
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), fullscreen=(), payment=(), web-share=()' },
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
};

export default withBundleAnalyzer(nextConfig);
