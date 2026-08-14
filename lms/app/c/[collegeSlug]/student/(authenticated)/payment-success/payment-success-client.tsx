'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, BookOpen, AlertCircle, Check, ArrowLeft, Sparkles } from 'lucide-react';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';

function buildMyCoursesBootcampTabHref(collegeSlug: string): string {
  return `/c/${encodeURIComponent(collegeSlug)}/student/my-courses?tab=job-ready-bootcamp`;
}

interface PaymentSuccessClientProps {
  collegeSlug: string;
  purchaseType?: 'course' | 'bundle' | 'bootcamp';
  courseId: string | null;
  courseTitle: string;
  learnHref: string;
  bundleSlug?: string | null;
  isConfirmed?: boolean;
  courseValidity?: string;
}

function ConfettiCanvas({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const cx = rect.width / 2;
    const cy = rect.height * 0.18;

    const COLORS = [
      'oklch(0.72 0.19 45)',
      'oklch(0.65 0.18 150)',
      'oklch(0.7 0.15 250)',
      'oklch(0.75 0.12 80)',
      'oklch(0.6 0.2 330)',
    ];

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotationSpeed: number;
      shape: 'circle' | 'square';
      opacity: number;
    }

    const particles: Particle[] = [];
    const PARTICLE_COUNT = 24;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4;
      const speed = 1.5 + Math.random() * 2.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        shape: Math.random() > 0.5 ? 'circle' : 'square',
        opacity: 1,
      });
    }

    let frame: number;
    let start: number | null = null;
    const DURATION = 1200;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / DURATION, 1);

      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        p.opacity = 1 - progress;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        ctx.restore();
      }

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}

function CheckmarkAnimation() {
  return (
    <div className="relative inline-flex items-center justify-center">
      <div className="absolute -inset-6 bg-emerald-500/10 blur-3xl rounded-full check-glow" />
      <div className="absolute -inset-3 bg-emerald-500/5 blur-xl rounded-full" />
      <svg
        className="checkmark-svg"
        width="100"
        height="100"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="checkmark-circle"
          cx="48"
          cy="48"
          r="44"
          stroke="oklch(0.62 0.19 155)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="oklch(0.62 0.19 155 / 0.06)"
        />
        <path
          className="checkmark-check"
          d="M30 49 L42 61 L66 37"
          stroke="oklch(0.62 0.19 155)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
}

const paymentSuccessStyles = `
  .checkmark-svg {
    transform: scale(0.4);
    opacity: 0;
  }
  .checkmark-circle {
    stroke-dasharray: 276.46;
    stroke-dashoffset: 276.46;
  }
  .checkmark-check {
    stroke-dasharray: 56.57;
    stroke-dashoffset: 56.57;
  }
  .check-glow {
    animation: checkGlowPulse 2.5s ease-in-out 0.8s 1;
  }
  @keyframes checkGlowPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  .success-card-inner {
    background-image: radial-gradient(
      circle at 100% 0%,
      oklch(0.62 0.19 155 / 0.03) 0%,
      transparent 50%
    );
  }
  @media (prefers-reduced-motion: reduce) {
    .checkmark-svg,
    .checkmark-circle,
    .checkmark-check {
      animation: none !important;
      transition: none !important;
      stroke-dashoffset: 0 !important;
      transform: none !important;
      opacity: 1 !important;
    }
    .check-glow {
      animation: none !important;
    }
  }
`;

export function PaymentSuccessClient({
  collegeSlug,
  purchaseType = 'course',
  courseId: _courseId,
  courseTitle,
  learnHref,
  bundleSlug: _bundleSlug,
  isConfirmed = true,
  courseValidity,
}: PaymentSuccessClientProps) {
  const isBundle = purchaseType === 'bundle';
  const isBootcamp = purchaseType === 'bootcamp';
  const rootRef = useRef<HTMLDivElement>(null);
  const countdownTextRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isConfirmed) return;

    let currentCountdown = 10;
    const interval = setInterval(() => {
      currentCountdown -= 1;
      if (countdownTextRef.current) {
        countdownTextRef.current.textContent = String(currentCountdown >= 0 ? currentCountdown : 0);
      }
      if (currentCountdown <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    const timeout = setTimeout(() => {
      if (isBootcamp) {
        router.push(buildMyCoursesBootcampTabHref(collegeSlug));
      } else {
        router.push(`/c/${collegeSlug}/student/my-courses`);
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isConfirmed, collegeSlug, router, isBootcamp]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cancelled = false;
    (async () => {
      const gsapModule = await import('gsap');
      if (cancelled) return;
      const { gsap } = gsapModule;

      const ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (isConfirmed) {
        if (prefersReducedMotion) {
          gsap.set(['.checkmark-svg', '.success-title', '.success-subtitle', '.success-card', '.success-actions', '.redirect-text', '.success-nav'], {
            opacity: 1,
            y: 0,
          });
          return;
        }

        // Burst 1 (0s): checkmark + circle + check draw — all at once
        tl.fromTo('.checkmark-svg', { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.4)' }, 0)
          .fromTo('.checkmark-circle', { strokeDashoffset: 276.46 }, { strokeDashoffset: 0, duration: 0.2, ease: 'power2.inOut' }, 0)
          .fromTo('.checkmark-check', { strokeDashoffset: 56.57 }, { strokeDashoffset: 0, duration: 0.15, ease: 'power2.out' }, 0)
          // Burst 2 (0.05s): nav + title + subtitle — fade in together
          .fromTo('.success-nav', { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.15 }, 0.05)
          .fromTo('.success-title', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15 }, 0.05)
          .fromTo('.success-subtitle', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15 }, 0.05)
          // Burst 3 (0.1s): card + actions + redirect — fade in together
          .fromTo('.success-card', { y: 24, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.2 }, 0.1)
          .fromTo('.success-actions', { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15, stagger: 0.04 }, 0.1)
          .fromTo('.redirect-text', { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.15);
      } else {
        tl.fromTo('.error-icon', { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' })
          .fromTo('.error-title', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
          .fromTo('.error-subtitle', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4')
          .fromTo('.error-actions', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, '-=0.4');
      }
    }, root);

    return () => {
      ctx.revert();
    };
    })();
    return () => { cancelled = true; };
  }, [collegeSlug, router, isConfirmed]);

  const myCoursesHref = isBootcamp
    ? buildMyCoursesBootcampTabHref(collegeSlug)
    : `/c/${collegeSlug}/student/my-courses`;

  if (!isConfirmed) {
    return (
      <div ref={rootRef} className="max-w-2xl w-full text-center space-y-8">
        <div className="error-icon relative inline-block">
          <div className="relative size-24 rounded-3xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <AlertCircle className="size-12 text-destructive" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="error-title text-4xl md:text-5xl font-bold tracking-tight leading-none">
            Enrollment <span className="text-destructive">Pending</span>
          </h1>
          <p className="error-subtitle text-lg text-muted-foreground font-medium max-w-lg mx-auto">
            We could not confirm a recent enrollment. If you just completed a payment, it may take a few moments to process.
          </p>
        </div>

        <div className="error-actions flex flex-col sm:flex-row items-center justify-center gap-4">
          <StudentCtaButton href={myCoursesHref} size="lg" className="w-full sm:w-auto">
            Go to My Courses
          </StudentCtaButton>
          <StudentCtaButton onClick={() => window.location.reload()} variant="secondary" size="lg" showArrow={false} className="w-full sm:w-auto">
            Check Again
          </StudentCtaButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: paymentSuccessStyles }} />

      <div
        ref={rootRef}
        className="max-w-2xl w-full text-center space-y-8 relative min-h-[80vh] flex flex-col items-center justify-center py-12"
        role="status"
        aria-live="polite"
        aria-label={`Enrollment confirmed for ${courseTitle}`}
      >
        <ConfettiCanvas containerRef={rootRef} />

        <nav className="success-nav absolute top-6 left-6 z-30" aria-label="Back navigation">
          <Link
            href={myCoursesHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            My Courses
          </Link>
        </nav>

        <div className="space-y-5 relative z-20">
          <CheckmarkAnimation />

          <div className="space-y-3">
            <h1 className="success-title text-4xl md:text-5xl font-bold tracking-tight leading-none" style={{ opacity: 0 }}>
              {isBootcamp ? 'Enrollment Successful' : 'Congratulations!'}
            </h1>
            <p className="success-subtitle text-lg text-foreground/70 font-medium max-w-md mx-auto" style={{ opacity: 0 }}>
              {isBootcamp
                ? 'You now have access to the complete Job Ready Bootcamp. Happy Coding!'
                : isBundle
                  ? 'Your bundle is ready. Dive in and start exploring.'
                  : "You're all set to start learning."}
            </p>
          </div>
        </div>

        <div
          className="success-card success-card-inner p-8 md:p-10 rounded-2xl border border-border/60 bg-card relative overflow-hidden w-full max-w-md"
          style={{ opacity: 0 }}
        >
          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="size-3" aria-hidden="true" />
              {isBootcamp ? 'Bootcamp Enrolled' : isBundle ? 'Bundle Enrolled' : 'Course Enrolled'}
            </div>
            <h2 className="text-2xl font-bold tracking-tight leading-tight">
              {courseTitle}
            </h2>
            <div className="flex items-center justify-center gap-5 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" /> {courseValidity || 'Forever Access'}
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-500" strokeWidth={3} aria-hidden="true" /> Verified
              </span>
            </div>
          </div>
        </div>

        <div className="success-actions flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20 w-full max-w-md" style={{ opacity: 0 }}>
          <StudentCtaButton href={learnHref} size="lg" className="w-full sm:w-auto" showArrow={false}>
            {isBundle ? 'Continue Bundle' : isBootcamp ? 'Start Bootcamp' : 'Start Learning'}
            <ArrowRight className="size-5 ml-2 inline" aria-hidden="true" />
          </StudentCtaButton>
          <StudentCtaButton
            href={myCoursesHref}
            variant="secondary"
            size="lg"
            showArrow={false}
            className="w-full sm:w-auto"
          >
            Go to Dashboard
          </StudentCtaButton>
        </div>

        <p className="redirect-text text-sm text-muted-foreground/60 font-medium relative z-20" style={{ opacity: 0 }}>
          Redirecting to My Courses in <span ref={countdownTextRef} className="font-bold text-primary">10</span> seconds...
        </p>
      </div>
    </>
  );
}
