'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

const ENTRANCE_SEEN_KEY = 'ngcto-entrance-seen';

export function EntranceAnimation({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const brandTextRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarHeaderRef = useRef<Element | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const finishEntrance = useCallback(() => {
    setShowOverlay(false);
    if (contentRef.current) {
      contentRef.current.style.opacity = '';
      contentRef.current.style.visibility = '';
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      finishEntrance();
      return;
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem(ENTRANCE_SEEN_KEY)) {
      finishEntrance();
      return;
    }

    let ctx: gsap.Context | null = null;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    safetyTimer = setTimeout(() => finishEntrance(), 4000);

    async function animate() {
      try {
        if (!overlayRef.current || !logoRef.current || !contentRef.current) {
          finishEntrance();
          return;
        }

        const gsapModule = await import('gsap');
        const gsap = gsapModule.default;

        const overlay = overlayRef.current;
        const logo = logoRef.current;
        const glow = glowRef.current;
        const brandText = brandTextRef.current;
        const content = contentRef.current;

        sidebarHeaderRef.current = document.querySelector('[data-sidebar="sidebar"] [data-sidebar="header"]');

        ctx = gsap.context(() => {
          const tl = gsap.timeline({
            defaults: { ease: 'power2.out' },
            onComplete: () => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(ENTRANCE_SEEN_KEY, '1');
              }
              finishEntrance();
            },
          });

          gsap.set(overlay, { autoAlpha: 1 });
          gsap.set(logo, { scale: 0.5, autoAlpha: 0 });
          gsap.set(glow, { scale: 0.8, autoAlpha: 0 });
          gsap.set(brandText, { autoAlpha: 0, y: 8 });
          gsap.set(content, { autoAlpha: 0 });

          tl.to(logo, {
            scale: 1,
            autoAlpha: 1,
            duration: 0.5,
            ease: 'expo.out',
          }, 0);

          tl.to(glow, {
            scale: 1.2,
            autoAlpha: 0.7,
            duration: 0.6,
            ease: 'power2.out',
          }, 0);

          tl.to(glow, {
            scale: 1.4,
            autoAlpha: 0.3,
            duration: 0.8,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: 1,
          }, 0.3);

          tl.to(brandText, {
            autoAlpha: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out',
          }, 0.15);

          tl.to(logo, {
            x: () => {
              if (sidebarHeaderRef.current) {
                const rect = sidebarHeaderRef.current.getBoundingClientRect();
                return rect.left + rect.width / 2 - window.innerWidth / 2;
              }
              return -window.innerWidth / 2 + 48;
            },
            y: () => {
              if (sidebarHeaderRef.current) {
                const rect = sidebarHeaderRef.current.getBoundingClientRect();
                return rect.top + rect.height / 2 - window.innerHeight / 2;
              }
              return -window.innerHeight / 2 + 48;
            },
            scale: 0.35,
            duration: 0.55,
            ease: 'expo.inOut',
          }, 0.9);

          tl.to(brandText, {
            autoAlpha: 0,
            y: -8,
            duration: 0.3,
            ease: 'power2.in',
          }, 0.95);

          tl.to(glow, {
            autoAlpha: 0,
            duration: 0.3,
            ease: 'power2.in',
          }, 0.95);

          tl.to(overlay, {
            autoAlpha: 0,
            duration: 0.4,
            ease: 'power2.out',
          }, 1.1);

          tl.to(content, {
            autoAlpha: 1,
            duration: 0.35,
            clearProps: 'all',
          }, 1.05);
        }, overlayRef.current);
      } catch {
        finishEntrance();
      }
    }

    animate();

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      if (ctx) ctx.revert();
    };
  }, [prefersReducedMotion, finishEntrance]);

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950"
        style={showOverlay ? undefined : { display: 'none' }}
      >
        <div ref={logoRef} className="relative mb-4">
          <div
            ref={glowRef}
            className="absolute -inset-8 rounded-full bg-primary/25 blur-3xl"
          />
          <Image
            src="/assets/logo-icon.png"
            alt="NextGen CTO"
            width={88}
            height={88}
            className="relative z-10 object-contain drop-shadow-[0_0_32px_rgba(249,115,22,0.5)]"
            priority
          />
        </div>
        <div ref={brandTextRef} className="text-center">
          <div className="text-white font-bold text-lg tracking-tight">NextGen CTO</div>
          <div className="text-zinc-500 text-xs font-medium mt-0.5">Platform</div>
        </div>
      </div>
      <div ref={contentRef}>
        {children}
      </div>
    </>
  );
}
