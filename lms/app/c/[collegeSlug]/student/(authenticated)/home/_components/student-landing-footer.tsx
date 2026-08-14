import Link from 'next/link';
import { Flame, Instagram, Linkedin, Youtube, ArrowUpRight, Code2 } from 'lucide-react';
import { studentBasePath } from '@/lib/student/student-home-route';
import { buildFooterLinks, LANDING_FOOTER_BRAND, LANDING_SOCIAL_LINKS } from './landing-content';
import { NextGenLogo } from './nextgen-logo';
import { cn } from '@/lib/utils';
import { isJobReadyBootcampFeatureEnabled } from '@/lib/services/job-ready-bootcamp-feature';

const SOCIAL_ICONS = {
  YouTube: Youtube,
  Instagram: Instagram,
  LinkedIn: Linkedin,
} as const;

interface StudentLandingFooterProps {
  collegeSlug: string;
}

export async function StudentLandingFooter({ collegeSlug }: StudentLandingFooterProps) {
  const showBootcamp = await isJobReadyBootcampFeatureEnabled();
  const linkGroups = buildFooterLinks(collegeSlug, { showBootcamp });
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-8 w-full border-t border-[var(--landing-border)] bg-[var(--landing-bg)] px-4 pb-8 pt-16 sm:px-6 lg:px-12">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -bottom-1/2 -left-1/4 size-[500px] rounded-full bg-gradient-to-t from-[var(--landing-orange)]/6 to-transparent" />
        <div className="absolute -top-1/2 -right-1/4 size-[500px] rounded-full bg-gradient-to-t from-[var(--landing-accent-teal)]/6 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-[1280px]">
        <div className="mb-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-16">
          <div className="flex flex-col gap-6 sm:col-span-2 lg:col-span-1">
            <NextGenLogo href={studentBasePath(collegeSlug)} size="md" className="w-fit" />
            <p className="max-w-sm text-base leading-relaxed landing-muted">
              {LANDING_FOOTER_BRAND.description}
            </p>

            <div className="mt-2 flex items-center gap-3">
              {LANDING_SOCIAL_LINKS.map((social) => {
                const Icon = SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS] ?? Youtube;
                return (
                  <Link
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'group flex size-11 items-center justify-center rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)]',
                      'landing-muted transition-all duration-300',
                      'hover:border-[var(--landing-orange)]/50 hover:bg-[var(--landing-orange)]/10 hover:text-[var(--landing-orange)]',
                      'hover:shadow-lg hover:shadow-[var(--landing-orange)]/15 hover:-translate-y-0.5'
                    )}
                    aria-label={social.label}
                  >
                    <Icon className="size-[18px] transition-transform duration-300 group-hover:scale-115" />
                  </Link>
                );
              })}
            </div>
          </div>

          {linkGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--landing-fg)]">
                <span className="flex size-1.5 rounded-full bg-[var(--landing-orange)]" />
                {group.title}
              </h4>
              <ul className="flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className={cn(
                        'group inline-flex items-center gap-2 text-sm transition-colors duration-200',
                        'landing-muted hover:text-[var(--landing-orange)]'
                      )}
                    >
                      <span className="relative">
                        {link.label}
                        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[var(--landing-orange)] transition-all duration-300 group-hover:w-full" />
                      </span>
                      {link.external && (
                        <ArrowUpRight className="size-3 opacity-50 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-[var(--landing-border)] pt-8 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="text-sm landing-muted">
              © {year} <span className="font-medium text-[var(--landing-fg)]">{LANDING_FOOTER_BRAND.name}</span>. All rights reserved.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-[var(--landing-border)] bg-[var(--landing-surface)] px-4 py-2">
              <Code2 className="size-4 text-[var(--landing-orange)]" />
              <span className="text-xs font-medium landing-heading">Built for engineers, by engineers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs text-[var(--landing-muted)]">
                <Flame className="size-3.5 text-[var(--landing-orange)]" aria-hidden="true" />
                Crafted with
              </span>
              <span className="text-xs font-semibold text-[var(--landing-orange)]">passion</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
