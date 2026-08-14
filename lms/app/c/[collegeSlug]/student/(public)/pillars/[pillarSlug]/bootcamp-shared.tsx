'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PillarCatalogCourse } from '@/components/pillars/pillar-catalog-tabs';
import { LandingSectionHeader } from '@/components/student/landing/landing-section-header';

export { LandingSectionHeader as SectionHeader };

export interface BootcampPillarCourseGroup {
  slug: string;
  title: string;
  courses: PillarCatalogCourse[];
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return reduced;
}

export function ModuleAccordion({
  modules,
}: {
  modules: { title: string; description: string }[];
}) {
  const [openId, setOpenId] = useState<string | null>(modules[0]?.title ?? null);

  return (
    <div className="space-y-3 h-full">
      <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Modules Inside Pillar</h4>
      <div className="space-y-2">
        {modules.map((mod, index) => {
          const isOpen = openId === mod.title;
          return (
            <div
              key={mod.title}
              className={cn(
                'relative overflow-hidden rounded-2xl border border-border/60 transition-colors duration-200',
                isOpen && 'border-primary/30 bg-primary/5',
              )}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40"
                onClick={() => setOpenId(isOpen ? null : mod.title)}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-lg font-bold text-primary/40 tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-semibold text-foreground text-sm sm:text-base truncate">{mod.title}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
                    isOpen && 'rotate-180 text-primary',
                  )}
                />
              </button>
              {isOpen ? (
                <div className="border-t border-border/40 bg-muted/10 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                  {mod.description}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
