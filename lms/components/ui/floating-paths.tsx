'use client';

import { motion } from 'framer-motion';

export function FloatingPaths({ position }: { position: number }) {
  // Generate 24 elegant, sweeping bezier curves constrained within (0 0 700 900)
  const paths = Array.from({ length: 24 }, (_, i) => {
    const p = position * (i * 8);
    return {
      id: i,
      d: `M -100 ${100 + i * 30} C ${200 + p} ${50 + i * 20}, ${450 - p} ${400 + i * 15}, ${300 + p} ${850 - i * 10}`,
      width: 0.8 + (i % 4) * 0.3,
    };
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      <svg
        className="h-full w-full text-primary"
        fill="none"
        viewBox="0 0 700 900"
        preserveAspectRatio="xMinYMid slice"
      >
        <title>Branding Floating Paths</title>
        {paths.map((path) => (
          <motion.path
            animate={{
              pathLength: [0.3, 1, 0.3],
              opacity: [0.3, 0.75, 0.3],
              pathOffset: [0, 0.8, 0],
            }}
            d={path.d}
            initial={{ pathLength: 0.4, opacity: 0.4 }}
            key={path.id}
            stroke="currentColor"
            strokeOpacity={0.25 + (path.id % 6) * 0.08}
            strokeWidth={1.2 + (path.id % 4) * 0.4}
            strokeLinecap="round"
            transition={{
              duration: 14 + (path.id % 5) * 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: [0.25, 1, 0.5, 1],
            }}
          />
        ))}
      </svg>
    </div>
  );
}
