import Link from 'next/link';
import Image from 'next/image';
import { Youtube, Instagram, Linkedin, Heart } from 'lucide-react';
import { BRAND_SOCIAL_LINKS } from '@/lib/brand/social-links';
import { cn } from '@/lib/utils';

const SOCIAL_LINKS = [
  { icon: Youtube, href: BRAND_SOCIAL_LINKS.youtube, label: 'YouTube' },
  { icon: Instagram, href: BRAND_SOCIAL_LINKS.instagram, label: 'Instagram' },
  { icon: Linkedin, href: BRAND_SOCIAL_LINKS.linkedin, label: 'LinkedIn' },
] as const;

type FooterProps = {
  tenantName?: string;
  collegeSlug?: string;
  className?: string;
};

export function Footer({ tenantName = 'NextGenCTO', collegeSlug, className }: FooterProps) {
  const slug = collegeSlug ?? '';
  const currentYear = new Date().getFullYear();
  const studentBase = slug ? `/c/${slug}/student` : '';

  const learningLinks = [
    { label: 'Browse Courses', href: `${studentBase}/courses` },
    { label: 'Activity Feed', href: `${studentBase}/activity` },
  ];

  const resourceLinks = [
    { label: 'Courses', href: `${studentBase}/courses` },
    { label: 'Student Helpdesk', href: '#' },
  ];

  return (
    <footer
      className={cn(
        'relative mt-auto w-full shrink-0 overflow-hidden',
        'bg-muted',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, oklch(0.72 0.19 45 / 0.25), oklch(0.72 0.19 45 / 0.5), oklch(0.72 0.19 45 / 0.25), transparent)',
        }}
        aria-hidden="true"
      />

      <div className="mx-auto w-full max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_auto_auto] lg:gap-16">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground">
                <Image
                  src="/assets/logo-icon.png"
                  alt="NextGenCTO"
                  width={32}
                  height={32}
                  className="size-full object-contain"
                />
              </div>
              <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
                NextGen<span className="text-primary">CTO</span>
              </span>
            </div>
            <p className="max-w-xs text-[13px] font-medium leading-relaxed text-muted-foreground">
              Elite mentorship and shipped projects for builders who want to lead in modern product engineering.
            </p>
            <div className="flex gap-1.5 pt-1">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Icon className="size-4" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Learning Path
            </h3>
            <ul className="space-y-2.5">
              {learningLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Resources
            </h3>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-primary/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">
            &copy; {currentYear} {tenantName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] font-medium text-muted-foreground">
            <Link href="#" prefetch={false} className="transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <span className="inline-flex items-center gap-1">
              Made with <Heart className="size-3 fill-primary/50 text-primary/50" /> for future CTOs
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
