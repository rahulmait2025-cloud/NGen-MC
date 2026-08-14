'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BOOTCAMP_CURRICULUM_TABS, type BootcampCurriculumTabId } from './bootcamp-landing-content';
import { SectionHeader, ModuleAccordion } from './bootcamp-shared';
import { BootcampCtaButton } from './pillar-bootcamp-cta';
import type { BootcampCtaState } from '@/lib/utils/bootcamp-cta';
import { BootcampProgramCta } from '../../bootcamp/_components/bootcamp-program-cta';
import type { JobReadyBootcampProduct } from '@/lib/services/job-ready-bootcamp';

interface BootcampCurriculumProps {
  cta: BootcampCtaState;
  collegeSlug?: string;
  isCompleteBootcamp?: boolean;
  isBootcampEnrolled?: boolean;
  bootcampProduct?: JobReadyBootcampProduct | null;
  isPending?: boolean;
}

export function BootcampCurriculum({
  cta,
  collegeSlug,
  isCompleteBootcamp = false,
  isBootcampEnrolled = false,
  bootcampProduct = null,
  isPending = false,
}: BootcampCurriculumProps) {
  const [curriculumTab, setCurriculumTab] = useState<BootcampCurriculumTabId>('technical');

  return (
    <section id="curriculum" className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8 gsap-reveal">
      <div className="mx-auto max-w-7xl space-y-10">
        <SectionHeader
          title="Explore The Complete Bootcamp Curriculum"
          description="Six pillars. One structured path. Every module is designed to convert learning into visible career readiness."
        />

        <Tabs
          value={curriculumTab}
          onValueChange={(v) => setCurriculumTab(v as BootcampCurriculumTabId)}
          orientation="vertical"
          className="flex flex-col gap-6 md:flex-row md:gap-8"
        >
          <TabsList
            variant="line"
            className="h-auto w-full shrink-0 flex-col items-stretch gap-1 bg-transparent p-0 md:sticky md:top-24 md:w-72"
          >
            {BOOTCAMP_CURRICULUM_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="justify-start rounded-xl border-l-4 border-transparent px-4 py-3 text-left transition-colors data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:text-primary"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-w-0 flex-1">
            {BOOTCAMP_CURRICULUM_TABS.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0 gsap-stagger-item">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <div className="relative flex h-full flex-col gap-6 overflow-hidden rounded-3xl border border-border/60 p-6">
                      <div>
                        <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                          Pillar {BOOTCAMP_CURRICULUM_TABS.indexOf(tab) + 1}
                        </Badge>
                        <h3 className="text-xl font-bold text-foreground sm:text-2xl leading-snug">{tab.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tab.description}</p>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Focus Area</p>
                          <p className="text-sm font-semibold text-foreground">{tab.focus}</p>
                        </div>
                        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-primary">Interview Impact</p>
                          <p className="text-sm font-semibold text-foreground">{tab.impact}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deliverables & Evidence</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tab.deliverables.map((item) => (
                            <Badge key={item} variant="secondary" className="rounded-lg bg-background text-foreground border-border/50 text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <ModuleAccordion modules={tab.modules} />
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-8 text-center">
          <p className="text-base font-semibold text-foreground">
            Stop collecting certificates. Start building proof.
          </p>
          <p className="text-sm text-muted-foreground">
            Begin the structured bootcamp path and turn learning into visible career readiness.
          </p>
          {collegeSlug && isCompleteBootcamp ? (
            <BootcampProgramCta
              collegeSlug={collegeSlug}
              isCompleteBootcamp={isCompleteBootcamp}
              isBootcampEnrolled={isBootcampEnrolled}
              bootcampProduct={bootcampProduct}
              fallbackCta={cta}
              size="lg"
              className="mt-2"
              enrollLabel="Enroll Now"
              layout="strip"
              isPending={isPending}
            />
          ) : (
            <BootcampCtaButton cta={cta} size="lg" className="mt-2" />
          )}
        </div>
      </div>
    </section>
  );
}
