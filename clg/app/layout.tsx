import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';

const getBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://college-admin-nextgen.vercel.app';
  return url.startsWith('http') ? url : `https://${url}`;
};

const collegeAdminTitle = 'NextGen CTO College Admin Portal';
const collegeAdminDescription =
  'Manage college learning programs, students, and progress from one dashboard.';
const collegeAdminOgImage = new URL(
  '/og/nextgen-cto-college-admin-portal-v2.png',
  getBaseUrl(),
).toString();

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: collegeAdminTitle,
  description: collegeAdminDescription,
  icons: {
    icon: [
      { url: '/assets/logo-icon.png', type: 'image/png' },
    ],
    shortcut: '/assets/logo-icon.png',
    apple: '/assets/logo-icon.png',
  },
  openGraph: {
    title: collegeAdminTitle,
    description: collegeAdminDescription,
    type: 'website',
    siteName: 'NextGen CTO',
    url: getBaseUrl(),
    images: [
      {
        url: collegeAdminOgImage,
        width: 1200,
        height: 630,
        alt: collegeAdminTitle,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: collegeAdminTitle,
    description: collegeAdminDescription,
    images: [collegeAdminOgImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body suppressHydrationWarning className="min-h-screen font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
