'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ArrowRight,
  BookOpen,
  Layout,
  Play,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { buildPillarCourseDetailHref } from '@/lib/utils/variant-learn-url';

export interface PillarCatalogCourse {
  catalog_key: string;
  catalog_kind: 'master_course' | 'variant';
  id: string;
  variant_id: string | null;
  code: string;
  title: string;
  parent_course_title: string | null;
  description: string | null;
  module_count: number;
  video_count: number;
  entitled: boolean;
  progress_percentage: number | null;
  is_free: boolean;
  thumbnail_url: string | null;
}

type CatalogTab = 'courses' | 'variants';

interface PillarCatalogTabsProps {
  courses: PillarCatalogCourse[];
  collegeSlug: string;
  pillarSlug: string;
}

export function PillarCatalogTabs({ courses, collegeSlug, pillarSlug }: PillarCatalogTabsProps) {
  const [tab, setTab] = useState<CatalogTab>('courses');

  const masterCourses = useMemo(
    () => courses.filter((course) => course.catalog_kind === 'master_course'),
    [courses],
  );
  const variantCourses = useMemo(
    () => courses.filter((course) => course.catalog_kind === 'variant'),
    [courses],
  );

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as CatalogTab)}>
      <div className="space-y-6">
        <TabsList className="flex flex-wrap items-center gap-2 border-b border-border pb-4 bg-transparent h-auto">
          <TabsTrigger
            value="courses"
            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Courses
            <span className="ml-2 tabular-nums opacity-80">{masterCourses.length}</span>
          </TabsTrigger>
          <TabsTrigger
            value="variants"
            className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Course Variants
            <span className="ml-2 tabular-nums opacity-80">{variantCourses.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="grid gap-4">
          {masterCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="No courses in this pillar yet"
              description="Check back soon for new master courses in this pillar."
            />
          ) : (
            masterCourses.map((course) => (
              <Card
                key={course.catalog_key}
                className="group border-border/70 bg-card transition hover:border-primary/35 hover:shadow-lg"
              >
                <CardContent className="flex flex-col gap-8 p-6 lg:flex-row lg:items-center">
                  {course.thumbnail_url && (
                    <div className="w-full lg:w-[200px] shrink-0 aspect-video rounded-lg overflow-hidden bg-muted relative">
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        sizes="200px"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{course.code || 'COURSE'}</Badge>
                      {course.catalog_kind === 'variant' ? (
                        <Badge variant="outline">Variant</Badge>
                      ) : null}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    {course.parent_course_title ? (
                      <p className="mb-3 text-xs text-muted-foreground">
                        Based on {course.parent_course_title}
                      </p>
                    ) : null}
                    <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {course.description ||
                        'Structured lessons with modules and videos inside your college workspace.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Layout className="size-4" />
                        {course.module_count} Modules
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Play className="size-4" />
                        {course.video_count} Videos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <TrendingUp className="size-4" />
                        Self-paced
                      </span>
                    </div>
                  </div>

                  <div className="w-full shrink-0 lg:w-[280px]">
                    {course.entitled ? (
                      <div className="mb-4 space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span className="tabular-nums">{course.progress_percentage ?? 0}%</span>
                        </div>
                        <Progress value={course.progress_percentage ?? 0} className="h-2" />
                      </div>
                    ) : null}
                    <Button asChild className="w-full rounded-xl">
                      <Link
                        href={buildPillarCourseDetailHref(
                          collegeSlug,
                          pillarSlug,
                          course.id,
                          course.variant_id,
                        )}
                      >
                        {course.entitled
                          ? course.progress_percentage && course.progress_percentage > 0
                            ? 'Continue'
                            : 'Start Learning'
                          : course.is_free
                            ? 'View Free Course'
                            : 'View Details / Enroll'}
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="variants" className="grid gap-4">
          {variantCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title="No course variants in this pillar yet"
              description="No course variants are available in this pillar yet."
            />
          ) : (
            variantCourses.map((course) => (
              <Card
                key={course.catalog_key}
                className="group border-border/70 bg-card transition hover:border-primary/35 hover:shadow-lg"
              >
                <CardContent className="flex flex-col gap-8 p-6 lg:flex-row lg:items-center">
                  {course.thumbnail_url && (
                    <div className="w-full lg:w-[200px] shrink-0 aspect-video rounded-lg overflow-hidden bg-muted relative">
                      <Image
                        src={course.thumbnail_url}
                        alt={course.title}
                        fill
                        sizes="200px"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{course.code || 'COURSE'}</Badge>
                      {course.catalog_kind === 'variant' ? (
                        <Badge variant="outline">Variant</Badge>
                      ) : null}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    {course.parent_course_title ? (
                      <p className="mb-3 text-xs text-muted-foreground">
                        Based on {course.parent_course_title}
                      </p>
                    ) : null}
                    <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {course.description ||
                        'Structured lessons with modules and videos inside your college workspace.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Layout className="size-4" />
                        {course.module_count} Modules
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Play className="size-4" />
                        {course.video_count} Videos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <TrendingUp className="size-4" />
                        Self-paced
                      </span>
                    </div>
                  </div>

                  <div className="w-full shrink-0 lg:w-[280px]">
                    {course.entitled ? (
                      <div className="mb-4 space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span className="tabular-nums">{course.progress_percentage ?? 0}%</span>
                        </div>
                        <Progress value={course.progress_percentage ?? 0} className="h-2" />
                      </div>
                    ) : null}
                    <Button asChild className="w-full rounded-xl">
                      <Link
                        href={buildPillarCourseDetailHref(
                          collegeSlug,
                          pillarSlug,
                          course.id,
                          course.variant_id,
                        )}
                      >
                        {course.entitled
                          ? course.progress_percentage && course.progress_percentage > 0
                            ? 'Continue'
                            : 'Start Learning'
                          : course.is_free
                            ? 'View Free Course'
                            : 'View Details / Enroll'}
                        <ArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
