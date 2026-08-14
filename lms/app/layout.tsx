import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from './providers';
import { Plus_Jakarta_Sans, Space_Grotesk, Sora } from 'next/font/google';
import { nextGenCtoMetadata } from '@/lib/metadata/nextgen-cto';
import { cn } from '@/lib/utils';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  preload: true,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  ...nextGenCtoMetadata,
  icons: {
    icon: [
      { url: '/assets/logo-icon.png', type: 'image/png' },
    ],
    shortcut: '/assets/logo-icon.png',
    apple: '/assets/logo-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): ReactNode {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(plusJakartaSans.variable, spaceGrotesk.variable, sora.variable)}
    >
      <body suppressHydrationWarning className="font-sans antialiased bg-background text-foreground tracking-tight selection:bg-primary/20 selection:text-primary">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}