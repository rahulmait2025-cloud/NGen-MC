'use client';

/** Dark orange hex palette for Recharts SVG fills — visible on both light and dark backgrounds. */
const learningChartColors = {
  primary: '#c2410c',
  primarySoft: '#d4520a',
  primaryMuted: 'rgba(194, 65, 12, 0.55)',
  primarySubtle: 'rgba(194, 65, 12, 0.3)',
  track: 'rgba(194, 65, 12, 0.15)',
  grid: 'rgba(156, 163, 175, 0.4)',
  funnel: {
    total: 'rgba(212, 82, 10, 0.2)',
    watched: 'rgba(212, 82, 10, 0.55)',
    completed: '#c2410c',
  },
  pie: ['rgba(212, 82, 10, 0.2)', 'rgba(212, 82, 10, 0.55)', '#c2410c'] as const,
  bar: '#d4520a',
  areaStroke: '#c2410c',
  areaFillStart: 'rgba(194, 65, 12, 0.25)',
  areaFillEnd: 'rgba(194, 65, 12, 0)',
  tier: {
    Dormant: 'rgba(194, 65, 12, 0.18)',
    Occasional: 'rgba(212, 82, 10, 0.35)',
    Regular: 'rgba(212, 82, 10, 0.6)',
    Engaged: '#c45c1a',
    Power: '#c2410c',
  },
} as const;

export type LearningChartColors = typeof learningChartColors;


/** @deprecated Prefer `learningChartColors` directly. Hook removed — colors are universal now. */
export function useLearningChartColors(): LearningChartColors {
  return learningChartColors;
}

export const chartSectionTitleClass =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground';

export const chartSectionSubtitleClass = 'mt-1 text-[13px] text-muted-foreground';
