import type { Metadata, Viewport } from "next";
import {
  Space_Grotesk,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { SmoothScroll } from "@/components/animate-ui/SmoothScroll";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { AnalyticsInit } from "@/components/analytics/AnalyticsInit";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import { PostHogPageView } from "@/components/analytics/PostHogPageView";
import { Suspense } from "react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nextgen-cto.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "NextGen CTO | From Classroom to Corporate",
    template: "%s | NextGen CTO",
  },
  description:
    "NextGen CTO: elite mentorship, shipped projects, and interview-ready depth for ambitious technologists.",
  openGraph: {
    type: "website",
    siteName: "NextGen CTO",
    title: "NextGen CTO | From Classroom to Corporate",
    description:
      "Elite mentorship, shipped projects, and interview-ready depth for ambitious technologists.",
    url: siteUrl,
    images: [
      {
        url: '/assets/logo-hd.png',
        width: 1200,
        height: 630,
        alt: 'NextGen CTO - From Classroom to Corporate',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NextGen CTO | From Classroom to Corporate",
    description:
      "Elite mentorship, shipped projects, and interview-ready depth for ambitious technologists.",
    images: ['/assets/logo-hd.png'],
  },
  icons: {
    icon: '/assets/logo-hd.png',
    shortcut: '/assets/logo-hd.png',
    apple: '/assets/logo-hd.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FF5F36" },
    { media: "(prefers-color-scheme: dark)", color: "#FF5F36" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`
          ${spaceGrotesk.variable}
          ${jakarta.variable}
          antialiased font-sans
        `}
      >
        <GoogleAnalytics />
        <PostHogProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SmoothScroll>
            <MotionProvider>
              <AnalyticsInit />
              <Suspense fallback={null}>
                <PostHogPageView />
              </Suspense>
              {children}
            </MotionProvider>
          </SmoothScroll>
        </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
