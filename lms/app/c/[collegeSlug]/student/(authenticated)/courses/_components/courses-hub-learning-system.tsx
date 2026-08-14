'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, CheckCircle2, FileText, Github, Library, Linkedin, Mic, Rocket, Route, ShieldCheck, Sparkles, Target, Wrench, X } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const FLOW_STEPS = [
  {
    title: 'Discover',
    description: 'Choose Free, Paid, or Bootcamp based on your current level.',
  },
  {
    title: 'Build',
    description: 'Learn through structured lessons, practice, and real projects.',
  },
  {
    title: 'Prove',
    description: 'Turn learning into GitHub, resume, LinkedIn, and interview proof.',
  },
];

const FIXES = [
  { old: 'Random videos', next: 'Sequenced roadmap' },
  { old: 'Theory-only learning', next: 'Project-first execution' },
  { old: 'Weak profile proof', next: 'Recruiter-visible assets' },
  { old: 'No accountability', next: 'Mentor-led milestones' },
];

const OUTCOMES = [
  { icon: Wrench, label: 'Real project portfolio' },
  { icon: Github, label: 'Optimized GitHub' },
  { icon: Linkedin, label: 'Better LinkedIn' },
  { icon: FileText, label: 'ATS-ready resume' },
  { icon: Mic, label: 'Interview stories' },
  { icon: ShieldCheck, label: 'Career confidence' },
];

const LEVEL_LADDER = [
  { icon: Library, label: 'Free', detail: 'Start foundations', value: 'No payment' },
  { icon: Sparkles, label: 'Paid', detail: 'Go deeper', value: 'Curated tracks' },
  { icon: Rocket, label: 'Bootcamp', detail: 'Get job ready', value: 'Full system' },
];

export function CoursesHubLearningSystem() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !sectionRef.current) return;

    let ctx: { revert: () => void } | null = null;
    let active = true;

    async function init() {
      const gsapModule = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      if (!active || !sectionRef.current) return;

      const { gsap } = gsapModule;
      gsap.registerPlugin(ScrollTrigger);

      const landingShell = document.querySelector('.landing-shell');
      const scroller = landingShell ? { scroller: landingShell } : {};

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { duration: 0.38, ease: 'power3.out' },
          scrollTrigger: {
            trigger: sectionRef.current,
            ...scroller,
            start: 'top 96%',
            toggleActions: 'play none none none',
          },
        });

        gsap.set('.learning-system-panel, .learning-ladder-wrap', {
          transformOrigin: '50% 60%',
          willChange: 'transform, opacity',
        });
        gsap.set('.learning-flow-card, .learning-ladder-card, .learning-fix-row, .learning-outcome-chip, .learning-chip-icon', {
          willChange: 'transform, opacity',
        });

        tl.fromTo(
          '.learning-system-headline',
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, stagger: 0.03 },
        )
          .fromTo(
            '.learning-system-panel',
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04 },
            '-=0.24',
          )
          .fromTo(
            '.learning-panel-head',
            { autoAlpha: 0, x: -10 },
            { autoAlpha: 1, x: 0, duration: 0.28, stagger: 0.03 },
            '-=0.34',
          )
          .fromTo(
            '.learning-flow-card',
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.04 },
            '-=0.22',
          )
          .fromTo(
            '.learning-flow-line',
            { scaleX: 0 },
            { scaleX: 1, duration: 0.32, ease: 'power2.out' },
            '-=0.34',
          )
          .fromTo(
            '.learning-ladder-wrap',
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 0.34 },
            '-=0.16',
          )
          .fromTo(
            '.learning-ladder-badge',
            { autoAlpha: 0, x: 8 },
            { autoAlpha: 1, x: 0, duration: 0.22 },
            '-=0.22',
          )
          .fromTo(
            '.learning-fix-row',
            { autoAlpha: 0, x: 14 },
            { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.03 },
            '-=0.4',
          )
          .fromTo(
            '.learning-fix-arrow',
            { autoAlpha: 0, x: -5 },
            { autoAlpha: 1, x: 0, duration: 0.2, stagger: 0.02 },
            '-=0.24',
          )
          .fromTo(
            '.learning-ladder-card',
            { autoAlpha: 0, y: 12 },
            { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.035 },
            '-=0.2',
          )
          .fromTo(
            '.learning-outcome-chip',
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.28, stagger: { amount: 0.12, from: 'center' } },
            '-=0.36',
          )
          .fromTo(
            '.learning-chip-icon',
            { scale: 0.86 },
            { scale: 1, duration: 0.22, stagger: { amount: 0.1, from: 'center' } },
            '-=0.24',
          );
      }, sectionRef);
    }

    init();

    return () => {
      active = false;
      ctx?.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <section ref={sectionRef} className="border-t border-[var(--landing-border)] px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-end">
          <div className="space-y-4">
            <span className="learning-system-headline inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_oklab,var(--landing-orange)_30%,var(--landing-border))] bg-[color-mix(in_oklab,var(--landing-orange)_10%,var(--landing-card))] px-4 py-1.5 animate-badge-shimmer animate-badge-pulse-glow text-xs font-bold uppercase tracking-[0.14em] text-[var(--landing-orange)]">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--landing-orange)] opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-[var(--landing-orange)]"></span>
              </span>
              <Route className="size-3.5 text-[var(--landing-orange)] animate-pulse" />
              Learning system
            </span>
            <h2 className="learning-system-headline text-balance text-3xl font-bold leading-tight tracking-tight landing-heading sm:text-4xl lg:text-5xl">
              Not a course dump. A path from learning to proof.
            </h2>
          </div>
          <p className="learning-system-headline max-w-2xl text-pretty text-base leading-relaxed landing-muted lg:justify-self-end">
            The old sections repeated the same idea. This version shows one clean operating system: choose the right path, build in sequence, and leave with assets recruiters can verify.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="learning-system-panel relative overflow-hidden rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-8 lg:col-span-7">
            <div className="relative z-10 space-y-8">
              <div className="learning-panel-head flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-[var(--landing-orange)]/25 bg-[var(--landing-orange)]/10 text-[var(--landing-orange)]">
                  <Target className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold landing-heading">How students move through it</h3>
                  <p className="text-sm landing-muted">Three stages, not six disconnected blocks.</p>
                </div>
              </div>

              <div className="relative grid gap-4 md:grid-cols-3">
                <div className="learning-flow-line pointer-events-none absolute left-[12%] right-[12%] top-9 hidden h-px origin-left bg-[var(--landing-border)] md:block" aria-hidden="true" />
                {FLOW_STEPS.map((step, index) => (
                  <div key={step.title} className="learning-flow-card relative rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/75 p-5 [transform-style:preserve-3d]">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--landing-orange)]">Step {index + 1}</span>
                      {index < FLOW_STEPS.length - 1 ? <ArrowRight className="hidden size-4 text-[var(--landing-orange)]/70 md:block" /> : null}
                    </div>
                    <h4 className="text-lg font-bold landing-heading">{step.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed landing-muted">{step.description}</p>
                  </div>
                ))}
              </div>

              <div className="learning-ladder-wrap rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/75 p-5 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold landing-heading">Course level ladder</h4>
                    <p className="mt-1 text-sm landing-muted">The page points students to one of these three decisions.</p>
                  </div>
                  <span className="learning-ladder-badge hero-badge-motion rounded-full border border-[var(--landing-orange)]/25 bg-[var(--landing-orange)]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--landing-orange)]">
                    choose once
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {LEVEL_LADDER.map((level) => (
                    <div key={level.label} className="learning-ladder-card rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--landing-orange)]/10 text-[var(--landing-orange)]">
                          <level.icon className="size-5" />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--landing-orange)]">{level.value}</span>
                      </div>
                      <p className="text-xl font-bold landing-heading">{level.label}</p>
                      <p className="mt-1 text-sm landing-muted">{level.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:col-span-5">
            <div className="learning-system-panel rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-7">
              <h3 className="learning-panel-head text-xl font-bold landing-heading">What this fixes</h3>
              <div className="mt-5 space-y-3">
                {FIXES.map((item) => (
                  <div key={item.old} className="learning-fix-row grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/70 p-3">
                    <span className="flex items-center gap-2 text-sm landing-muted">
                      <X className="size-3.5 text-[var(--landing-danger)]" />
                      {item.old}
                    </span>
                    <ArrowRight className="learning-fix-arrow size-4 text-[var(--landing-orange)]" />
                    <span className="flex items-center gap-2 text-sm font-semibold landing-heading">
                      <CheckCircle2 className="size-3.5 text-[var(--landing-success)]" />
                      {item.next}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="learning-system-panel rounded-3xl border border-[var(--landing-border)] bg-[var(--landing-card)] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] sm:p-7">
              <h3 className="learning-panel-head text-xl font-bold landing-heading">What students walk away with</h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {OUTCOMES.map((item) => (
                  <div key={item.label} className="learning-outcome-chip flex items-center gap-3 rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)]/70 p-3">
                    <span className="learning-chip-icon flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--landing-orange)]/10 text-[var(--landing-orange)]">
                      <item.icon className="size-4" />
                    </span>
                    <span className="text-sm font-semibold leading-snug landing-heading">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
