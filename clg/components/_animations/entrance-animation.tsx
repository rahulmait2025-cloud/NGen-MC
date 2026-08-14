'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useTenant } from '@/providers/tenant-provider';

export function EntranceAnimation({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const brandTextRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { branding } = useTenant();

  useEffect(() => {
    if (prefersReducedMotion) {
      setShowOverlay(false);
      return;
    }

    if (!overlayRef.current || !logoRef.current || !contentRef.current) return;

    let ctx: gsap.Context | null = null;

    async function animate() {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default;

      const overlay = overlayRef.current;
      const logo = logoRef.current;
      const glow = glowRef.current;
      const brandText = brandTextRef.current;
      const content = contentRef.current;

      if (!overlay || !logo || !content) return;

      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'power2.out' },
          onComplete: () => setShowOverlay(false),
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
            const sidebarHeader = document.querySelector('[data-sidebar="sidebar"] [data-sidebar="header"]');
            if (sidebarHeader) {
              const rect = sidebarHeader.getBoundingClientRect();
              return rect.left + rect.width / 2 - window.innerWidth / 2;
            }
            return -window.innerWidth / 2 + 48;
          },
          y: () => {
            const sidebarHeader = document.querySelector('[data-sidebar="sidebar"] [data-sidebar="header"]');
            if (sidebarHeader) {
              const rect = sidebarHeader.getBoundingClientRect();
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
      }, overlay);
    }

    animate();
    return () => { if (ctx) ctx.revert(); };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || !showOverlay) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950"
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
          <div className="text-white font-bold text-lg tracking-tight">{branding.name}</div>
          <div className="text-zinc-500 text-xs font-medium mt-0.5">College Admin</div>
        </div>
      </div>
      <div ref={contentRef}>
        {children}
      </div>
    </>
  );
}
