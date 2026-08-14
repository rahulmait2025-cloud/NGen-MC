'use client';

import Image from 'next/image';
import {
  Award,
  Brain,
  Code2,
  GraduationCap,
  Network,
  Share2,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type CampusVisualVariant = 'who-should-apply' | 'movement' | 'dashboard' | 'rewards';

interface CampusVisualCardProps {
  variant: CampusVisualVariant;
  imageSrc?: string;
  title?: string;
  description?: string;
  className?: string;
}

const FLOATING_TAGS: Record<CampusVisualVariant, string[]> = {
  'who-should-apply': ['Tech Clubs', 'Student Leader', 'Community Builder', 'AI + Coding'],
  movement: ['Coding', 'AI', 'DSA', 'Projects', 'Career'],
  dashboard: ['Referrals', 'Rewards', 'Growth', 'Impact'],
  rewards: ['Certificate', 'Goodies', 'Internship', 'Recognition'],
};

function FallbackVisual({ variant }: { variant: CampusVisualVariant }) {
  if (variant === 'who-should-apply') {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-6">
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="flex -space-x-3">
            {['S', 'A', 'R', 'K'].map((letter) => (
              <div
                key={letter}
                className="flex size-12 items-center justify-center rounded-full border-2 border-primary/40 bg-zinc-900 text-sm font-bold text-white"
              >
                {letter}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
            <GraduationCap className="size-6 text-primary" />
            <div>
              <p className="text-sm font-semibold text-white">Campus Leaders</p>
              <p className="text-xs text-zinc-400">Tech · AI · Community</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Code2 className="size-5 text-primary/80" />
            <Brain className="size-5 text-primary/80" />
            <Users className="size-5 text-primary/80" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'movement') {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-8">
        <div className="absolute inset-0">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute size-2 rounded-full bg-primary/60"
              style={{
                top: `${20 + (i % 3) * 25}%`,
                left: `${15 + (i % 2) * 55}%`,
              }}
            />
          ))}
        </div>
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
          <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary" />
          <line x1="80%" y1="25%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary" />
          <line x1="25%" y1="75%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary" />
          <line x1="75%" y1="70%" x2="50%" y2="50%" stroke="currentColor" strokeWidth="1" className="text-primary" />
        </svg>
        <div className="relative z-10 flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-zinc-900/90 px-6 py-4">
          <Network className="size-8 text-primary" />
          <p className="text-lg font-bold text-white">NextGen CTO</p>
          <p className="text-xs text-zinc-400">Nationwide campus network</p>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="relative flex h-full w-full items-center justify-center p-6">
        <div className="relative z-10 space-y-4 text-center">
          <div className="mx-auto w-fit rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 px-8 py-4">
            <p className="text-xs uppercase tracking-widest text-primary">Your Code</p>
            <p className="text-2xl font-bold tracking-wider text-white">AMBASSADOR</p>
          </div>
          <div className="flex justify-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <Share2 className="size-5 text-primary" />
              <span className="text-[10px] text-zinc-400">Share</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Trophy className="size-5 text-primary" />
              <span className="text-[10px] text-zinc-400">Grow</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Award className="size-5 text-primary" />
              <span className="text-[10px] text-zinc-400">Earn</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center p-6">
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {[
          { icon: Award, label: 'Certificate' },
          { icon: Sparkles, label: 'Goodies' },
          { icon: Trophy, label: 'Recognition' },
          { icon: GraduationCap, label: 'Internship' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-4"
          >
            <Icon className="size-6 text-primary" />
            <span className="text-xs font-medium text-white">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CampusVisualCard({
  variant,
  imageSrc,
  title,
  description,
  className,
}: CampusVisualCardProps) {
  const tags = FLOATING_TAGS[variant];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/80',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="relative aspect-[4/3] min-h-[280px] w-full lg:min-h-[320px]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title ?? `Campus Ambassador ${variant}`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <FallbackVisual variant={variant} />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />
      </div>
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="pointer-events-none absolute rounded-full border border-primary/30 bg-zinc-900/90 px-3 py-1 text-[10px] font-semibold text-primary backdrop-blur"
          style={{
            top: `${12 + (i % 2) * 55}%`,
            left: i % 2 === 0 ? '8%' : 'auto',
            right: i % 2 === 1 ? '8%' : 'auto',
          }}
        >
          {tag}
        </span>
      ))}
      {(title || description) && (
        <div className="relative border-t border-white/10 bg-zinc-900/60 px-5 py-4 backdrop-blur">
          {title ? <p className="font-semibold text-white">{title}</p> : null}
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
      )}
    </div>
  );
}
