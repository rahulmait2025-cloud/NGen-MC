import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/theme-provider';
import { LenisProvider } from '@/components/lenis-provider';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://admin-nextgen-cto.vercel.app';
  return url.startsWith('http') ? url : `https://${url}`;
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: 'NextGen CTO - Super Admin',
  description: 'Multi-tenant LMS super admin console for NextGen CTO platform.',
  icons: {
    icon: '/assets/brand-logo.png',
  },
  openGraph: {
    title: 'NextGen CTO - Super Admin',
    description: 'Multi-tenant LMS super admin console for NextGen CTO platform.',
    type: 'website',
    siteName: 'NextGen CTO',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NextGen CTO - Super Admin',
    description: 'Multi-tenant LMS super admin console for NextGen CTO platform.',
  },
};

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      {children}
    </LenisProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): ReactNode {
  return (
    <html lang="en" className={cn(GeistSans.variable, GeistMono.variable)} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <div className="noise-overlay" aria-hidden="true" />
        <Suspense fallback={null}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange
          >
            <AppShell>
              {children}
            </AppShell>
            <Toaster richColors position="bottom-right" />
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}