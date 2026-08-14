'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

/**
 * EntranceAnimation — CSS-only version.
 *
 * PERFORMANCE: Previous GSAP implementation dynamically imported ~50KB of JS
 * and held content invisible (autoAlpha: 0) for 1.5–3 seconds. This CSS-only
 * version uses GPU-accelerated keyframes and shows content behind the overlay
 * immediately, so the page is interactive ~1.5s faster.
 *
 * The overlay fades out via CSS after 1.2s. Content is visible from the start
 * with a subtle fade-in so there's zero perceived lag.
 */
export function EntranceAnimation({ children }: { children: React.ReactNode }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Defer sessionStorage + setState so we avoid sync setState-in-effect
    // and keep SSR/client markup matched on first paint.
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      try {
        const hasShown = sessionStorage.getItem('hasShownEntranceAnimation');
        if (!hasShown) {
          setShowOverlay(true);
          sessionStorage.setItem('hasShownEntranceAnimation', 'true');
          hideTimer = setTimeout(() => setShowOverlay(false), 1200);
        }
      } catch {
        setShowOverlay(true);
        hideTimer = setTimeout(() => setShowOverlay(false), 1200);
      }
    }, 0);

    return () => {
      clearTimeout(startTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Overlay — CSS-animated, removed from DOM after completion */}
      {showOverlay && (
        <div className="entrance-overlay" aria-hidden="true">
          <div className="entrance-logo">
            <div className="entrance-glow" />
            <Image
              src="/assets/logo-icon.png"
              alt="NextGen CTO"
              width={88}
              height={88}
              className="relative z-10 object-contain drop-shadow-[0_0_32px_rgba(249,115,22,0.5)]"
              priority
            />
          </div>
          <div className="entrance-brand-text">
            <div className="text-white font-bold text-lg tracking-tight">NextGen CTO</div>
            <div className="text-zinc-500 text-xs font-medium mt-0.5">Student Portal</div>
          </div>
        </div>
      )}

      {/* Content — visible immediately with a subtle fade-in only when animation is active */}
      <div className={showOverlay ? "entrance-content" : ""}>
        {children}
      </div>

      <style jsx global>{`
        .entrance-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #09090b;
          animation: entranceOverlayOut 0.4s ease-out 0.8s forwards;
          will-change: opacity;
          pointer-events: none;
        }

        .entrance-logo {
          position: relative;
          margin-bottom: 1rem;
          animation: entranceLogoIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        .entrance-glow {
          position: absolute;
          inset: -2rem;
          border-radius: 9999px;
          background: rgba(249, 115, 22, 0.25);
          filter: blur(48px);
          animation: entranceGlowPulse 1.2s ease-in-out forwards;
          will-change: transform, opacity;
        }

        .entrance-brand-text {
          text-align: center;
          animation: entranceBrandIn 0.35s ease-out 0.15s both;
          will-change: transform, opacity;
        }

        /* Content fades in quickly — NOT blocked by the overlay */
        .entrance-content {
          animation: entranceContentIn 0.35s ease-out 0.2s both;
          will-change: opacity;
        }

        @keyframes entranceLogoIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes entranceGlowPulse {
          0% { transform: scale(0.8); opacity: 0; }
          40% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        @keyframes entranceBrandIn {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes entranceOverlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes entranceContentIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
