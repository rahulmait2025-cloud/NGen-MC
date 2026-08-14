'use client';



import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import Image from 'next/image';

import { ArrowRight, Layers, Play } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Progress } from '@/components/ui/progress';

import { buildLearnHref } from '@/lib/utils/variant-learn-url';

import { buildBootcampCoursePreviewHref } from '@/lib/student/bootcamp-routes';

import { cn } from '@/lib/utils';

import type { PillarCatalogCourse } from '@/components/pillars/pillar-catalog-tabs';

import type { BootcampPillarCourseGroup } from './bootcamp-shared';



function resolveCourseAction(

  course: PillarCatalogCourse,

  collegeSlug: string,

  pillarSlug: string,

): { href: string; label: string } {

  if (course.entitled) {

    const hasProgress = (course.progress_percentage ?? 0) > 0;

    return {

      href: buildLearnHref(collegeSlug, course.id, { variantId: course.variant_id }),

      label: hasProgress ? 'Resume Learning' : 'Start Learning',

    };

  }

  return {

    href: buildBootcampCoursePreviewHref(collegeSlug, pillarSlug, course.id),

    label: course.is_free ? 'View Course' : 'View Details',

  };

}



function BootcampCourseCard({

  course,

  collegeSlug,

  pillarSlug,

}: {

  course: PillarCatalogCourse;

  collegeSlug: string;

  pillarSlug: string;

}) {

  const action = resolveCourseAction(course, collegeSlug, pillarSlug);

  const status = course.entitled

    ? { label: 'Enrolled', cls: 'bg-primary/15 text-primary border-primary/30' }

    : course.is_free

      ? { label: 'Free', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400' }

      : { label: 'Premium', cls: 'bg-muted text-muted-foreground border-border' };



  return (

    <div className="group flex flex-col gap-5 rounded-3xl border border-border/60 p-6 sm:p-7">

      {course.thumbnail_url && (

        <div className="-mx-6 -mt-6 sm:-mx-7 sm:-mt-7 mb-1 aspect-video overflow-hidden bg-muted relative rounded-t-3xl border-b border-border/40">

          <Image

            src={course.thumbnail_url}

            alt={course.title}

            fill

            sizes="(max-width: 640px) 100vw, 50vw"

            className="object-cover transition-transform duration-200 group-hover:scale-105"

          />

        </div>

      )}

      <div className="flex items-start justify-between gap-3">

        <Badge variant="secondary" className="rounded-md bg-muted text-muted-foreground border-border/50 text-[10px] font-bold uppercase tracking-wide">

          {course.code || 'COURSE'}

        </Badge>

        <Badge variant="outline" className={cn('rounded-full text-[10px] font-bold', status.cls)}>

          {status.label}

        </Badge>

      </div>



      <div className="flex-1 space-y-3">

        <h4 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary sm:text-xl leading-snug">

          {course.title}

        </h4>

        <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">

          {course.description || 'Structured lessons with modules and videos inside your college workspace.'}

        </p>

        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-medium text-muted-foreground">

          <span className="inline-flex items-center gap-1.5">

            <Layers className="size-4 text-primary/70" />

            {course.module_count} Modules

          </span>

          <span className="inline-flex items-center gap-1.5">

            <Play className="size-4 text-primary/70" />

            {course.video_count} Videos

          </span>

        </div>

      </div>



      {course.entitled ? (

        <div className="space-y-1.5">

          <div className="flex justify-between text-[11px] text-muted-foreground">

            <span>Progress</span>

            <span className="tabular-nums">{course.progress_percentage ?? 0}%</span>

          </div>

          <Progress value={course.progress_percentage ?? 0} className="h-1.5" />

        </div>

      ) : null}



      <Button asChild variant="outline" className="w-full rounded-xl border-border/60 font-semibold transition-colors group-hover:border-primary/50 group-hover:text-primary">

        <Link href={action.href} className="inline-flex items-center justify-center gap-2">

          {action.label}

          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />

        </Link>

      </Button>

    </div>

  );

}



export function BootcampCourseExplorer({

  collegeSlug,

  pillarCourseGroups,

  reduceMotion,

}: {

  collegeSlug: string;

  pillarCourseGroups: BootcampPillarCourseGroup[];

  reduceMotion: boolean;

}) {

  const [activeSlug, setActiveSlug] = useState(pillarCourseGroups[0]?.slug ?? '');

  const gridRef = useRef<HTMLDivElement>(null);



  const active = useMemo(

    () => pillarCourseGroups.find((p) => p.slug === activeSlug) ?? pillarCourseGroups[0] ?? null,

    [activeSlug, pillarCourseGroups],

  );



  const prevGroups = useRef(pillarCourseGroups);
  if (pillarCourseGroups !== prevGroups.current) {
    prevGroups.current = pillarCourseGroups;
    if (!pillarCourseGroups.some((p) => p.slug === activeSlug) && pillarCourseGroups[0]) {
      setActiveSlug(pillarCourseGroups[0].slug);
    }
  }



  useEffect(() => {

    if (reduceMotion || !gridRef.current) return;

    const cards = gridRef.current.querySelectorAll('.bootcamp-course-card');

    if (cards.length === 0) return;

    import('gsap').then(({ default: gsap }) => {

      gsap.fromTo(

        cards,

        { opacity: 0, y: 16 },

        { opacity: 1, y: 0, stagger: 0.06, duration: 0.4, ease: 'power2.out' },

      );

    });

  }, [activeSlug, reduceMotion]);



  if (pillarCourseGroups.length === 0) {

    return (

          <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border/60 p-12 text-center">

        <Layers className="mx-auto mb-4 size-10 text-muted-foreground/40" />

        <p className="text-sm text-muted-foreground">
          Bootcamp pillars will appear here once they are published in your catalog.
        </p>

      </div>

    );

  }



  if (!active) return null;



  return (

    <div className="space-y-8">

      <div className="flex flex-wrap justify-center gap-2">

        {pillarCourseGroups.map((p) => {

          const isActive = p.slug === active.slug;

          return (

            <button

              key={p.slug}

              type="button"

              onClick={() => setActiveSlug(p.slug)}

              className={cn(

                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition duration-200',

                isActive

                  ? 'border-primary/50 bg-primary/10 text-primary'

                  : 'border-border/60 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',

              )}

            >

              {p.title}

              <span className="tabular-nums opacity-70">{p.courses.length}</span>

            </button>

          );

        })}

      </div>



      <div className="mx-auto max-w-2xl text-center space-y-1">

        <h3 className="text-xl font-bold text-foreground sm:text-2xl">{active.title}</h3>

        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {active.courses.length} {active.courses.length === 1 ? 'Course' : 'Courses'} Available
        </p>

      </div>



      <div ref={gridRef}>

        {active.courses.length === 0 ? (

      <div className="mx-auto max-w-2xl rounded-3xl border border-dashed border-border/60 p-12 text-center">

            <Layers className="mx-auto mb-4 size-10 text-muted-foreground/40" />

            <p className="text-sm text-muted-foreground">
              Courses for this pillar are coming soon.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {active.courses.map((course) => (

              <BootcampCourseCard

                key={course.catalog_key}

                course={course}

                collegeSlug={collegeSlug}

                pillarSlug={active.slug}

              />

            ))}

          </div>

        )}

      </div>

    </div>

  );

}

