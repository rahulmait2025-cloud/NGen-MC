import Link from 'next/link';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { 
  Layers, 
  Video, 
  FolderOpen, 
  Clock, 
  AlertCircle,
  Plus,
} from 'lucide-react';

import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCoursePillarById } from '@/lib/services/master-course-pillars';
import { getCourseInPillar, listModulesForCourse } from '@/lib/services/master-courses';
import { listVideoAssetsByCourse } from '@/lib/services/video-assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RetryCourseSyncButton } from '@/components/master-courses/retry-course-sync-button';
import { CreateModuleDialog } from '@/components/master-courses/create-module-dialog';
import { PublishCourseHeaderActions } from '@/components/master-courses/publish-course-panel';
import { CourseModulesManagerClient } from '@/components/master-courses/course-modules-manager-client';
import { getCourseCurriculum } from '@/lib/services/master-course-structure';
import { CourseModuleDataRefresh } from './course-module-data-refresh';
import { resolvePillarByKey, resolveCourseByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';

function publishStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

function tpFolderStatusBadge(status: string, error: string | null) {
  switch (status) {
    case 'created':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 gap-1.5 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <FolderOpen className="size-3.5" />
          Synced
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 gap-1.5" title={error ?? 'Sync failed'}>
          <AlertCircle className="size-3.5" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1.5">
          <Clock className="size-3.5" />
          Pending
        </Badge>
      );
  }
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: { 
  params: Promise<{ pillarId: string; courseId: string }>;
  searchParams: Promise<{ module?: string }>;
}): Promise<ReactNode> {
  const [_auth, { pillarId, courseId }, resolvedSearchParams] = await Promise.all([
    getSessionFromHeaders(),
    params,
    searchParams,
  ]);
  if (!_auth) { redirect('/login'); }
  const pillarKey = pillarId;
  const courseKey = courseId;

  // Resolve pillarKey and courseKey to canonical entities
  const [resolvedPillar, resolvedCourse] = await Promise.all([
    resolvePillarByKey(pillarKey),
    resolveCourseByKey(courseKey),
  ]);

  if (!resolvedPillar || !resolvedCourse) {
    notFound();
  }

  // Canonical redirect: UUID → slug
  const needsRedirect = isUuid(pillarKey) || isUuid(courseKey);
  if (needsRedirect) {
    const targetPillarSlug = resolvedPillar.slug || pillarKey;
    const targetCourseSlug = resolvedCourse.slug || courseKey;
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/master-courses/pillars/${targetPillarSlug}/courses/${targetCourseSlug}${queryString}`);
  }

  const effectivePillarId = resolvedPillar.id;
  const effectiveCourseId = resolvedCourse.id;

  const [pillar, course, modules, videos, curriculum] = await Promise.all([
    getMasterCoursePillarById(effectivePillarId),
    getCourseInPillar(effectivePillarId, effectiveCourseId),
    listModulesForCourse(effectivePillarId, effectiveCourseId),
    listVideoAssetsByCourse(effectiveCourseId),
    getCourseCurriculum(effectiveCourseId).catch(() => ({ modules: [] as Array<{ items: Array<never> }> })),
  ]);

  const allItems = curriculum.modules.flatMap((m) => m.items ?? []);

  if (!pillar || !course) {
    notFound();
  }
  
  const unassignedVideos = videos.filter(v => 
    !v.master_course_module_id || !modules.some(m => m.id === v.master_course_module_id)
  );

  const initialSelectedModuleId = resolvedSearchParams.module ?? modules[0]?.id ?? null;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      <Suspense fallback={<div className="h-8 w-32 bg-muted/20 rounded-lg animate-pulse" />}>
        <CourseModuleDataRefresh />
      </Suspense>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
              <div className="flex items-center gap-2">
                {publishStatusBadge(course.publish_status)}
                {tpFolderStatusBadge(course.tp_folder_status, course.tp_last_error)}
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
              <span className="font-semibold text-primary">{pillar.title}</span>
              <Separator orientation="vertical" className="h-3" />
              <code className="bg-primary/5 text-primary px-2 py-0.5 rounded text-[11px] font-semibold border border-primary/10">{course.code}</code>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1.5 ml-1">
                <Video className="size-3.5" />
                <span className="font-medium">{videos.length} Videos</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end md:w-auto md:shrink-0 md:gap-3">
          {course.tp_folder_status !== 'created' && (
            <RetryCourseSyncButton courseId={course.id} pillarId={effectivePillarId} variant="outline" className="h-9 dark:bg-accent/30" />
          )}
          <PublishCourseHeaderActions courseId={effectiveCourseId} course={course} />
          <CreateModuleDialog pillarId={effectivePillarId} courseId={effectiveCourseId}>
            <Button className="h-9 shadow-lg shadow-primary/20">
              <Plus className="mr-2 size-4" />
              New Module
            </Button>
          </CreateModuleDialog>
        </div>
      </div>

      {course.publish_status === 'published' && (
        <div className="mt-3">
          <div className="bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-200 dark:border-amber-600 rounded-xl p-3">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-200">Editing published content may affect assigned colleges/students.</div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div className="space-y-6">
          {/* Main Description */}
          {course.description && (
            <div className="bg-muted/30 p-5 rounded-xl border-2 border-border/40 shadow-sm">
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2.5">Course Description</h4>
              <div className="text-sm font-medium leading-relaxed text-foreground space-y-2">
                {(() => {
                  try {
                    const parsed = JSON.parse(course.description);
                    if (Array.isArray(parsed)) {
                      return (
                        <ul className="list-disc pl-5 space-y-1">
                          {parsed.map((point: string) => (
                            <li key={point.slice(0, 32)}>{point}</li>
                          ))}
                        </ul>
                      );
                    }
                  } catch {
                    // Fallback to raw string
                  }
                  return <p className="whitespace-pre-wrap">{course.description}</p>;
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="size-5 text-primary" />
              Course Modules
              <Badge variant="secondary" className="ml-2 font-semibold">{modules.length}</Badge>
            </h2>
          </div>
          
          <div className="space-y-4">
            <CourseModulesManagerClient
              modules={modules}
              allVideos={videos}
              allItems={allItems}
              course={course}
              effectivePillarId={effectivePillarId}
              effectiveCourseId={effectiveCourseId}
              initialSelectedModuleId={initialSelectedModuleId}
              context="pillar"
            />

            {/* Extra Videos (Unassigned) */}
            {unassignedVideos.length > 0 && (
              <div className="group flex items-center justify-between p-5 rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 hover:border-primary/40 transition-[border-color] duration-200 mt-2">
                <div className="flex items-center gap-5 min-w-0">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-[background-color,color] duration-200">
                    <Layers className="size-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-primary">Extra Videos (Unassigned)</span>
                      <Badge className="bg-primary text-white hover:bg-primary">
                        {unassignedVideos.length} Videos
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 font-medium">
                      These videos are synced in the course folder but haven&apos;t been assigned to a module yet.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/master-courses/pillars/${effectivePillarId}/courses/${effectiveCourseId}/unassigned-videos`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Button variant="secondary" size="sm" className="font-semibold">
                      Manage Extra Videos
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
