'use client';

import Link from 'next/link';
import { ArrowRight, Instagram, Linkedin, Sparkles, Youtube } from 'lucide-react';
import { FounderMentorCard } from '@/components/brand/founder-mentor-card';
import { BRAND_SOCIAL_LINKS } from '@/lib/brand/social-links';

const SOCIAL_LINKS = [
  { icon: Youtube, href: BRAND_SOCIAL_LINKS.youtube, label: 'YouTube', stat: '100K+' },
  { icon: Instagram, href: BRAND_SOCIAL_LINKS.instagram, label: 'Instagram', stat: '50K+' },
  { icon: Linkedin, href: BRAND_SOCIAL_LINKS.linkedin, label: 'LinkedIn', stat: '25K+' },
];

const TRUST_STATS = [
  { title: 'Project-first', label: 'learning' },
  { title: 'Mentor-led', label: 'ecosystem' },
  { title: 'Career-ready', label: 'outcomes' },
];

export function CoursesHubFounderRedesign({
  collegeSlug,
  showBootcamp = false,
}: {
  collegeSlug: string;
  showBootcamp?: boolean;
}) {
  const bootcampHref = `/c/${collegeSlug}/student/bootcamp`;

  return (
    <section className="border-t border-[var(--landing-border)] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 gsap-reveal">
      <div className="mx-auto max-w-7xl">
        <div className="mentor-card relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="relative z-10 grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10 xl:p-12">
            <div className="order-2 flex flex-col gap-6 lg:order-1 lg:gap-7">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
                </span>
                <Sparkles className="size-3.5 text-[var(--landing-orange)] animate-pulse" />
                <span className="hero-badge-text text-xs font-bold uppercase tracking-[0.16em] text-[var(--landing-orange)]">
                  Meet your mentor
                </span>
              </div>

              <h2 className="text-balance text-3xl font-bold leading-[1.08] tracking-tight landing-heading sm:text-4xl lg:text-5xl">
                Learn directly from{' '}
                <span className="hero-highlight-wrap relative inline-block">
                  <span className="hero-highlight hero-badge-motion landing-gradient-highlight-orange relative inline-block overflow-hidden">CTO Bhaiya</span>
                </span>
              </h2>

              <p className="max-w-xl text-base font-medium leading-relaxed text-[color-mix(in_oklab,var(--landing-fg)_88%,var(--landing-muted))] sm:text-lg sm:leading-[1.7]">
                {showBootcamp
                  ? 'The courses hub is designed around mentor-led progression: free foundations, deeper paid tracks, and a bootcamp path for students who want accountability, projects, and interview readiness.'
                  : 'The courses hub is designed around mentor-led progression: free foundations and deeper paid tracks for students who want accountability, projects, and interview readiness.'}
              </p>

              <div className="flex flex-wrap gap-3">
                {SOCIAL_LINKS.map((social) => (
                  <Link
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/social relative inline-flex items-center gap-2.5 rounded-full border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-2.5 text-sm font-semibold text-[var(--landing-fg)] shadow-sm transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--landing-orange)]/40 active:translate-y-0"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-[var(--landing-orange)]/10 text-[var(--landing-orange)] transition-all duration-300 group-hover/social:scale-110 group-hover/social:bg-[var(--landing-orange)]/20">
                      <social.icon className="size-4" />
                    </span>
                    <span>{social.stat}</span>
                    <span className="landing-muted">{social.label}</span>
                  </Link>
                ))}
              </div>

              <div className="grid grid-cols-3 divide-x divide-[var(--landing-border)] rounded-2xl border border-[var(--landing-border)] bg-[color-mix(in_oklab,var(--landing-fg)_3%,var(--landing-card))] px-3 py-4 sm:px-5 sm:py-5">
                {TRUST_STATS.map((stat) => (
                  <div key={stat.title} className="px-2 text-center sm:px-3 sm:text-left">
                    <div className="text-base font-bold leading-tight landing-heading sm:text-xl">{stat.title}</div>
                    <div className="mt-1 text-xs font-medium leading-snug text-[color-mix(in_oklab,var(--landing-fg)_72%,var(--landing-muted))]">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                {showBootcamp ? (
                  <Link
                    href={bootcampHref}
                    className="group inline-flex items-center gap-2 rounded-xl bg-[var(--landing-orange)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--landing-orange)]/90 active:translate-y-0"
                  >
                    See the Bootcamp Path
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <Link
                    href={`/c/${collegeSlug}/student/paid-courses`}
                    className="group inline-flex items-center gap-2 rounded-xl bg-[var(--landing-orange)] px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[var(--landing-orange)]/90 active:translate-y-0"
                  >
                    Explore Paid Courses
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                )}
              </div>
            </div>

            <div className="order-1 flex w-full justify-center lg:order-2 lg:justify-end">
              <div className="relative w-full max-w-[19rem] sm:max-w-xs lg:max-w-sm">
                <div className="relative w-full">
                  <FounderMentorCard priority />
                  <div className="absolute -bottom-2 -right-2 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-4 py-2.5 shadow-lg">
                    <div className="flex items-center gap-2">
                      <span className="mentor-live-dot flex h-2.5 w-2.5 rounded-full bg-[var(--landing-success)] shadow-[0_0_8px_color-mix(in_oklab,var(--landing-success)_50%,transparent)]" />
                      <span className="text-xs font-medium landing-heading">Live Sessions</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] px-3 py-1.5 shadow-md">
                    <span className="text-xs font-semibold text-[var(--landing-orange)]">100K+ Students</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
