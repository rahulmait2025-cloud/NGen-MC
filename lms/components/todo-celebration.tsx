'use client';

import { useEffect, useRef, useState } from 'react';

interface TodoCelebrationProps {
  trigger: boolean;
  onComplete?: () => void;
}

const PALETTE = [
  'oklch(0.75 0.22 45)',
  'oklch(0.7 0.2 150)',
  'oklch(0.72 0.18 250)',
  'oklch(0.78 0.15 80)',
  'oklch(0.65 0.24 330)',
  'oklch(0.8 0.17 60)',
  'oklch(0.68 0.21 190)',
  'oklch(0.82 0.14 120)',
  'oklch(0.6 0.25 20)',
  'oklch(0.74 0.19 300)',
];

function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  points: number
) {
  let rot = -Math.PI / 2;
  const step = Math.PI / points;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const px = x + Math.cos(rot) * r;
    const py = y + Math.sin(rot) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();
}

export function TodoCelebration({ trigger, onComplete }: TodoCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const prevTrigger = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const justActivated = trigger && !prevTrigger.current;
    prevTrigger.current = trigger;
    if (!justActivated) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      onCompleteRef.current?.();
      return;
    }

    queueMicrotask(() => setActive(true));
  }, [trigger]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const run = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (cancelled) return;

      const dpr = window.devicePixelRatio || 1;
      const W = 180;
      const H = 140;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const cx = W / 2;
      const cy = H / 2;

      interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        color: string;
        rotation: number;
        rotSpeed: number;
        shape: 'circle' | 'square' | 'star4' | 'star5' | 'diamond';
        opacity: number;
        gravity: number;
        drag: number;
      }

      const particles: Particle[] = [];

      for (let i = 0; i < 18; i++) {
        const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.3;
        const speed = 2.5 + Math.random() * 3;
        const shapes: Particle['shape'][] = ['circle', 'square', 'star4', 'star5', 'diamond'];
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 4 + Math.random() * 6,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.25,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          opacity: 1,
          gravity: 0.07 + Math.random() * 0.03,
          drag: 0.985,
        });
      }

      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
        const speed = 1 + Math.random() * 1.5;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: 2 + Math.random() * 3,
          color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
          rotation: 0,
          rotSpeed: 0,
          shape: 'circle',
          opacity: 1,
          gravity: 0.04,
          drag: 0.99,
        });
      }

      let frame: number;
      let start: number | null = null;
      const DURATION = 850;

      const draw = (ts: number) => {
        if (cancelled) return;
        if (!start) start = ts;
        const elapsed = ts - start;
        const progress = Math.min(elapsed / DURATION, 1);

        ctx.clearRect(0, 0, W, H);

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= p.drag;
          p.rotation += p.rotSpeed;
          p.opacity = Math.max(0, 1 - progress * 1.1);

          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          const s = p.size;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === 'square') {
            ctx.fillRect(-s / 2, -s / 2, s, s);
          } else if (p.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(0, -s / 2);
            ctx.lineTo(s / 3, 0);
            ctx.lineTo(0, s / 2);
            ctx.lineTo(-s / 3, 0);
            ctx.closePath();
            ctx.fill();
          } else if (p.shape === 'star4') {
            drawStar(ctx, 0, 0, s / 2, s / 5, 4);
          } else {
            drawStar(ctx, 0, 0, s / 2, s / 4, 5);
          }

          ctx.restore();
        }

        if (progress < 1) {
          frame = requestAnimationFrame(draw);
        } else {
          setActive(false);
          onCompleteRef.current?.();
        }
      };

      frame = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(frame);
    };

    let cleanupFn: (() => void) | undefined;
    run().then((cleanup) => { cleanupFn = cleanup; });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 z-30"
      tabIndex={-1}
    />
  );
}
