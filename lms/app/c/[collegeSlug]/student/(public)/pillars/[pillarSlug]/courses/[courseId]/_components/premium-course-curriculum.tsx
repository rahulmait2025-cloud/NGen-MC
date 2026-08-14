'use client';

import React from 'react';
import {
  PlayCircle,
  Video,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CourseLandingDetail } from './premium-course-landing-client';

export function PremiumCourseCurriculum({ detail }: { detail: CourseLandingDetail }) {
  return (
    <section id="curriculum" className="animate-section scroll-mt-28 space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge
            variant="outline"
            className="mb-3 rounded-full border-primary/20 bg-primary/5 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
          >
            Curriculum
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Course Modules</h2>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
          <span>{detail.module_count} Modules</span>
          <span>•</span>
          <span>{detail.video_count} Lectures</span>
        </div>
      </div>

      <div className="space-y-4">
        {detail.modules.map((mod, idx) => (
          <Accordion key={mod.id} type="single" collapsible className="w-full">
            <AccordionItem value={mod.id} className="rounded-3xl border border-border/60 bg-card px-6">
              <AccordionTrigger className="hover:no-underline py-5">
                <div className="flex items-center gap-4 text-left">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="text-base font-bold sm:text-lg">{mod.title}</h3>
                    <p className="text-xs text-muted-foreground">{mod.item_count} items</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-6 pt-2">
                {mod.items && mod.items.length > 0 ? (
                  <div className="space-y-2 border-t border-border/40 pt-4">
                    {mod.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-3">
                          <Video className="size-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{item.title}</span>
                        </div>
                        {item.preview_enabled && (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1 rounded-full text-[10px] font-bold text-primary"
                          >
                            <PlayCircle className="size-3" />
                            Preview
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic pt-2">
                    Module content included in course progression.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </section>
  );
}
