'use client';

import { useEffect } from 'react';

export function SmoothScroll({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        let cleanup = () => { };
        let cancelled = false;
        let idleHandle: number | null = null;
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const initSmoothScroll = async () => {
            const [{ default: Lenis }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
                import('lenis'),
                import('gsap'),
                import('gsap/dist/ScrollTrigger'),
            ]);

            if (cancelled) {
                return;
            }

            gsap.registerPlugin(ScrollTrigger);

            const lenis = new Lenis({
                duration: 1.2,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                wheelMultiplier: 1,
                touchMultiplier: 2,
                infinite: false,
            });

            lenis.on('scroll', ScrollTrigger.update);

            const tick = (time: number) => {
                lenis.raf(time * 1000);
            };

            gsap.ticker.add(tick);
            gsap.ticker.lagSmoothing(0);

            cleanup = () => {
                gsap.ticker.remove(tick);
                lenis.destroy();
            };
        };

        if ('requestIdleCallback' in window) {
            idleHandle = window.requestIdleCallback(() => {
                void initSmoothScroll();
            }, { timeout: 1200 });
        } else {
            timeoutHandle = setTimeout(() => {
                void initSmoothScroll();
            }, 0);
        }

        return () => {
            cancelled = true;
            if (idleHandle !== null && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleHandle);
            }
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            cleanup();
        };
    }, []);

    return <>{children}</>;
}
