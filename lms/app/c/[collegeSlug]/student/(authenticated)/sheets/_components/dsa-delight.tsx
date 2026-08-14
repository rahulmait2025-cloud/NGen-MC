'use client';

import React, { useEffect, useState, useRef } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

import { createPortal } from 'react-dom';

/* ─── Small delight: particle burst on checkbox ─── */

interface ParticleBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

const BURST_COLORS = ['#22c55e', '#34d399', '#a3e635', '#facc15', '#fb923c'];

function createBurstParticles(seed: number) {
  return Array.from({ length: 12 }, (_, i) => ({
    id: seed + i,
    x: 0,
    y: 0,
    color: BURST_COLORS[i % BURST_COLORS.length],
    size: Math.random() * 5 + 4,
    angle: (i / 12) * 360 + (Math.random() - 0.5) * 25,
    distance: Math.random() * 28 + 24,
  }));
}

function ParticleBurstInner({ trigger, onComplete }: ParticleBurstProps) {
  const reduced = usePrefersReducedMotion();
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; size: number; angle: number; distance: number }[]
  >([]);

  useEffect(() => {
    if (!trigger) return;
    if (reduced) {
      onComplete?.();
      return;
    }
    const seed = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      setParticles(createBurstParticles(seed));
      timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 800);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [trigger, onComplete, reduced]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        return (
          <m.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: tx, y: ty, opacity: 0, scale: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              top: '50%',
              left: '50%',
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
            }}
          />
        );
      })}
      </AnimatePresence>
    </LazyMotion>
  );
}

/* ─── Ring pulse on check ─── */

function RingPulse({ trigger }: { trigger: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
      {trigger && (
        <m.span
          initial={{ scale: reduced ? 1 : 0.5, opacity: 0.8 }}
          animate={{ scale: reduced ? 1 : 2.8, opacity: 0 }}
          exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 rounded-md border-2 border-emerald-400 pointer-events-none"
        />
      )}
      </AnimatePresence>
    </LazyMotion>
  );
}

/* ─── Exported: small check delight ─── */

export function CheckDelight({ justCompleted }: { justCompleted: boolean }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!justCompleted) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      setFlash(true);
      timer = setTimeout(() => setFlash(false), 800);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [justCompleted]);

  return (
    <span className="relative inline-flex items-center justify-center">
      <RingPulse trigger={flash} />
      <ParticleBurstInner trigger={flash} />
    </span>
  );
}

/* ─── Big delight: full-screen category completion celebration ─── */

const CONFETTI_COLORS = ['#22c55e', '#34d399', '#facc15', '#fb923c', '#e85c1a', '#a3e635', '#60a5fa', '#c084fc'];

function buildConfettiPieces() {
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    angle: (i / 40) * 360 + (Math.random() - 0.5) * 30,
    distance: Math.random() * 300 + 200,
    size: Math.random() * 10 + 5,
    rotation: Math.random() * 720 - 360,
    delay: Math.random() * 0.3,
    duration: 1.2 + Math.random() * 0.8,
    isCircle: i % 4 === 0,
    isRect: i % 4 === 1,
  }));
}

const CONFETTI_PIECES = buildConfettiPieces();

function ScreenConfetti({ show }: { show: boolean }) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const content = (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
          {/* Dark backdrop flash */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black"
          />

          {/* Central golden burst */}
          <m.div
            initial={{ opacity: 0, scale: reduced ? 1 : 0.3 }}
            animate={{ opacity: [0, 0.9, 0], scale: reduced ? [1, 1, 1] : [0.3, 3, 4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.4 : 1.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-full"
            style={{
              width: 200,
              height: 200,
              background: 'radial-gradient(circle, rgba(250, 204, 21, 0.5) 0%, rgba(234, 179, 8, 0.2) 40%, transparent 70%)',
            }}
          />

          {/* Second ring pulse */}
          {!reduced && (
            <m.div
              initial={{ opacity: 0.6, scale: 0.5 }}
              animate={{ opacity: 0, scale: 4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="absolute rounded-full border-2 border-emerald-400/60"
              style={{ width: 100, height: 100 }}
            />
          )}

          {/* Confetti pieces */}
          {CONFETTI_PIECES.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;

            if (reduced) {
              return (
                <m.span
                  key={p.id}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: p.delay }}
                  className="absolute"
                  style={{
                    width: p.size,
                    height: p.isRect ? p.size * 0.4 : p.size,
                    backgroundColor: p.color,
                    borderRadius: p.isCircle ? '50%' : '2px',
                    top: '50%',
                    left: '50%',
                    marginTop: -p.size / 2,
                    marginLeft: -p.size / 2,
                    willChange: 'transform',
                  }}
                />
              );
            }

            return (
              <m.span
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                animate={{
                  x: tx,
                  y: [0, ty * 0.4, ty],
                  opacity: [1, 1, 0.8, 0],
                  scale: [0.5, 1.3, 1, 0.6],
                  rotate: p.rotation,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: p.duration,
                  ease: [0.22, 1, 0.36, 1],
                  delay: p.delay,
                }}
                className="absolute"
                style={{
                  width: p.size,
                  height: p.isRect ? p.size * 0.4 : p.size,
                  backgroundColor: p.color,
                  borderRadius: p.isCircle ? '50%' : '2px',
                  top: '50%',
                  left: '50%',
                  marginTop: -p.size / 2,
                  marginLeft: -p.size / 2,
                  willChange: 'transform',
                }}
              />
            );
          })}

          {/* Center text flash */}
          {!reduced && (
            <m.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.95], y: [10, 0, 0, -5] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, times: [0, 0.15, 0.7, 1] }}
              className="absolute flex flex-col items-center gap-2"
            >
              <span className="text-5xl font-bold text-emerald-400 drop-shadow-lg"
                style={{ textShadow: '0 0 40px rgba(34, 197, 94, 0.5)' }}
              >
                Category Complete!
              </span>
              <span className="text-lg text-emerald-300/80 font-medium">
                Amazing work — every problem solved
              </span>
            </m.div>
          )}
        </div>
      )}
      </AnimatePresence>
    </LazyMotion>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

export function CategoryCelebration({ trigger }: { trigger: boolean }) {
  return <ScreenConfetti show={trigger} />;
}

/* ─── Hook: detect "just completed" transition ─── */

export function useJustCompleted(isDone: boolean) {
  const [just, setJust] = useState(false);
  const prevRef = useRef(isDone);

  useEffect(() => {
    if (isDone && !prevRef.current) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const frame = requestAnimationFrame(() => {
        setJust(true);
        timer = setTimeout(() => setJust(false), 800);
      });
      prevRef.current = isDone;
      return () => {
        cancelAnimationFrame(frame);
        if (timer) clearTimeout(timer);
      };
    }
    prevRef.current = isDone;
  }, [isDone]);

  return just;
}

export function useCategoryJustCompleted(
  completedCount: number,
  totalCount: number
) {
  const [just, setJust] = useState(false);
  const prevCompletedRef = useRef(completedCount);

  useEffect(() => {
    const wasComplete = completedCount === totalCount && totalCount > 0;
    const prevWasComplete = prevCompletedRef.current === totalCount && totalCount > 0;

    if (wasComplete && !prevWasComplete) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const frame = requestAnimationFrame(() => {
        setJust(true);
        timer = setTimeout(() => setJust(false), 2500);
      });
      prevCompletedRef.current = completedCount;
      return () => {
        cancelAnimationFrame(frame);
        if (timer) clearTimeout(timer);
      };
    }
    prevCompletedRef.current = completedCount;
  }, [completedCount, totalCount]);

  return just;
}
