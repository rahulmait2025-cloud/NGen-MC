'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { BRAND_ASSETS } from '@/lib/brand/assets';
import { FloatingPaths } from '@/components/ui/floating-paths';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

/** Left branding panel — displays logo and founder testimonial quote. */
export function AuthHeroPanel() {
  const thoughtCloudRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let active = true;
    let ctx: { revert: () => void } | null = null;

    async function animateThoughtCloud() {
      const { gsap } = await import('gsap');

      if (!active || !thoughtCloudRef.current || prefersReducedMotion) return;

      ctx = gsap.context(() => {
        const cloud = thoughtCloudRef.current;
        if (!cloud) return;

        const bubbles = gsap.utils.toArray<HTMLElement>('.thought-cloud-bubble');
        const twinkles = gsap.utils.toArray<HTMLElement>('.thought-cloud-twinkle');

        gsap.set(cloud, { transformOrigin: '50% 82%', force3D: true });
        gsap.set(twinkles, { transformOrigin: '50% 50%', autoAlpha: 0.68, scale: 0.8, force3D: true });

        gsap
          .timeline({ defaults: { ease: 'sine.inOut' }, repeat: -1, yoyo: true })
          .to(cloud, { y: -8, x: 4, rotation: 1.4, scale: 1.025, duration: 2.4 })
          .to(cloud, { y: -2, x: -3, rotation: -1, scale: 0.995, duration: 2.1 })
          .to(cloud, { y: -7, x: 2, rotation: 0.8, scale: 1.015, duration: 2.2 });

        gsap.to(bubbles, {
          y: (index) => [-5, -9, -12][index] ?? -6,
          x: (index) => [2, -2, 1][index] ?? 0,
          scale: (index) => [1.12, 0.92, 1.25][index] ?? 1.05,
          duration: 1.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.18,
        });

        gsap.to(twinkles, {
          autoAlpha: 1,
          scale: 1.18,
          rotation: '+=12',
          duration: 0.9,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.32,
        });
      }, thoughtCloudRef);
    }

    animateThoughtCloud();

    return () => {
      active = false;
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion]);

  return (
    <section
      className="login-branding-panel relative z-20 hidden h-full flex-none flex-col overflow-visible p-10 lg:flex lg:w-[52%] xl:w-[55%]"
      aria-label="NextGen CTO branding"
    >
      {/* Animated Vector Floating Paths (Left Side Only) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>

      {/* Brand logo top left */}
      <div className="relative z-10 inline-flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center justify-center p-1.5 rounded-xl bg-zinc-950 border border-zinc-800/80 shadow-sm transition-transform hover:scale-105 duration-200">
          <Image
            src={BRAND_ASSETS.logoIcon}
            alt="NextGen CTO"
            width={26}
            height={26}
            className="object-contain"
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="text-lg font-black tracking-tight text-foreground leading-none">
            NextGen <span className="text-primary font-black">CTO</span>
          </span>
          <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/75 pt-1">
            Engineering Leadership
          </span>
        </div>
      </div>

      {/* Unified Founder Hero Presentation (Seamless page integration) */}
      <div className="relative z-10 flex min-h-0 flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Thought Cloud callout near forehead (Theme-adaptive: Light & Dark) */}
        <div
          ref={thoughtCloudRef}
          className="absolute top-[7%] right-[-15%] z-30 animate-in fade-in zoom-in-95 duration-500 hover:scale-105 transition-transform xl:right-[-10%]"
        >
          <div className="relative">
            <div
              className="thought-cloud-twinkle absolute -right-5 top-9 h-1.5 w-5 rotate-[-28deg] rounded-full bg-orange-500"
              aria-hidden="true"
            />
            <div
              className="thought-cloud-twinkle absolute -right-6 top-[3.25rem] h-1.5 w-4 rotate-[18deg] rounded-full bg-orange-400"
              aria-hidden="true"
            />
            <div
              className="thought-cloud-twinkle absolute -right-3 top-5 h-4 w-1.5 rotate-[28deg] rounded-full bg-zinc-950 dark:bg-zinc-100"
              aria-hidden="true"
            />

            {/* Main Cloud Body */}
            <div className="relative h-[126px] w-[262px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_16px_36px_rgba(0,0,0,0.5)]">
              <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 262 126" aria-hidden="true">
                {/* Subtle warm offset outline */}
                <path
                  d="M34 74C18 73 9 60 14 47c3-9 10-15 20-17 2-17 18-27 36-22 8-9 23-12 36-6 9-10 28-11 40 1 18-7 40 1 47 18 17-1 32 12 33 29 1 15-8 27-23 31 0 18-18 31-38 26-10 13-32 16-47 6-13 9-34 8-45-2-17 4-35-5-39-20Z"
                  fill="none"
                  className="stroke-orange-500/25 dark:stroke-orange-500/40"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                  transform="translate(4 6)"
                />
                {/* Main cloud path */}
                <path
                  d="M34 74C18 73 9 60 14 47c3-9 10-15 20-17 2-17 18-27 36-22 8-9 23-12 36-6 9-10 28-11 40 1 18-7 40 1 47 18 17-1 32 12 33 29 1 15-8 27-23 31 0 18-18 31-38 26-10 13-32 16-47 6-13 9-34 8-45-2-17 4-35-5-39-20Z"
                  className="fill-white dark:fill-zinc-900 stroke-zinc-900 dark:stroke-zinc-100 transition-colors duration-300"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.25"
                />
              </svg>
              {/* Text inside cloud */}
              <div className="absolute inset-x-6 top-[1.85rem] rotate-[-1.5deg] text-center leading-[1.2] tracking-[-0.03em]">
                <span className="block text-[20px] font-extrabold text-zinc-900 dark:text-zinc-100">
                  Jyada Soch mat,
                </span>
                <span className="block text-[21px] font-black text-orange-600 dark:text-orange-400 pt-0.5">
                  Abhi Sign In Kar
                </span>
              </div>
            </div>

            {/* Trailing Cloud Bubbles leading to forehead */}
            <div
              className="thought-cloud-bubble absolute bottom-6 -left-8 size-5 rounded-full border-[2.5px] border-zinc-900 bg-white dark:border-zinc-100 dark:bg-zinc-900 transition-colors duration-300 shadow-xs"
              aria-hidden="true"
            />
            <div
              className="thought-cloud-bubble absolute bottom-2 -left-14 size-3.5 rounded-full border-[2.5px] border-zinc-900 bg-white dark:border-zinc-100 dark:bg-zinc-900 transition-colors duration-300 shadow-xs"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Full Founder Image, vertically aligned with the sign-in card. */}
        <div className="absolute inset-x-[-1.5rem] bottom-10 top-0 flex items-center justify-center xl:inset-x-[-2.5rem] xl:bottom-12">
          {/* Light Mode image: anuj_black.png */}
          <Image
            src={BRAND_ASSETS.founderImageBlack}
            alt="CTO Bhaiya - Founder NextGen CTO"
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="block scale-[1.2] object-contain object-center drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)] transition-transform duration-500 hover:scale-[1.22] dark:hidden xl:scale-[1.3] xl:hover:scale-[1.32]"
            priority
          />
          {/* Dark Mode image: anuj_white.png */}
          <Image
            src={BRAND_ASSETS.founderImageWhite}
            alt="CTO Bhaiya - Founder NextGen CTO"
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="hidden scale-[1.2] object-contain object-center drop-shadow-[0_15px_30px_rgba(0,0,0,0.3)] transition-transform duration-500 hover:scale-[1.22] dark:block xl:scale-[1.3] xl:hover:scale-[1.32]"
            priority
          />
        </div>
      </div>
    </section>
  );
}
