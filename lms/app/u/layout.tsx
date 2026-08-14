import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NextGenLogo } from '../c/[collegeSlug]/student/(authenticated)/home/_components/nextgen-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function PublicProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Simple Public Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <NextGenLogo href="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle className="rounded-xl border border-border/80 bg-card hover:bg-muted/60 transition-colors shadow-2xs" />
            <Button asChild size="sm" className="rounded-xl font-semibold px-4 cursor-pointer">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0 overflow-x-hidden">
        {children}
      </main>

      {/* Simple Public Footer */}
      <footer className="border-t border-border/60 bg-card/40 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 NextGen CTO. All rights reserved.</p>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Powered by NextGen CTO Platform
          </Link>
        </div>
      </footer>
    </div>
  );
}
