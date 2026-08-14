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
import { getBootcampById } from '@/lib/services/bootcamps';
import {
  getBootcampCourse,
  listBootcampCourseModules,
  getBootcampCourseDeleteImpact,
} from '@/lib/services/bootcamp-courses';
import { getCourseCurriculum } from '@/lib/services/master-course-structure';
import { listVideoAssetsByCourse } from '@/lib/services/video-assets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreateModuleDialog } from '@/components/master-courses/create-module-dialog';
import { RetryCourseSyncButton } from '@/components/master-courses/retry-course-sync-button';
import { PublishCourseHeaderActions } from '@/components/master-courses/publish-course-panel';
import { BootcampCourseDeleteAction } from '@/components/master-courses/bootcamp-course-delete-action';
import { PaidCourseLandingSettings } from '@/components/master-courses/paid-course-landing-settings';
import { CourseModulesManagerClient } from '@/components/master-courses/course-modules-manager-client';
import type { MasterCourseItemsRow } from '@/types/database';
import { CourseModuleDataRefresh } from './course-module-data-refresh';
import { resolveBootcampByKey, resolveCourseByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';

function publishStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
          Published
        </Badge>
      );
    case 'unpublished':
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">
          Unpublished
        </Badge>
      );
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

function tpFolderStatusBadge(status: string, error: string | null) {
  switch (status) {
    case 'created':
      return (
        <Badge
          variant="outline"
          className="text-emerald-600 border-emerald-200 bg-emerald-50/50 gap-1.5 dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10"
        >
          <FolderOpen className="size-3.5" />
          Synced
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="outline"
          className="text-destructive border-destructive/20 bg-destructive/5 gap-1.5"
          title={error ?? 'Sync failed'}
        >
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

function parseCourseDescription(description: string): ReactNode {
  try {
    const parsed = JSON.parse(description);
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
  return <p className="whitespace-pre-wrap">{description}</p>;
}



export default async function BootcampCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bootcampId: string; courseId: string }>;
  searchParams: Promise<{ module?: string }>;
}): Promise<ReactNode> {
  const { bootcampId, courseId } = await params;
  const bootcampKey = bootcampId;
  const courseKey = courseId;
  const resolvedSearchParams = await searchParams;
  const { module: selectedModuleIdParam } = resolvedSearchParams;

  const [_auth, resolvedBootcamp, resolvedCourse] = await Promise.all([
    getSessionFromHeaders(),
    resolveBootcampByKey(bootcampKey),
    resolveCourseByKey(courseKey),
  ]);
  if (!_auth) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
  }

  if (!resolvedBootcamp || !resolvedCourse) {
    notFound();
  }

  // Canonical redirect: UUID → slug
  const needsRedirect = isUuid(bootcampKey) || isUuid(courseKey);
  if (needsRedirect) {
    const targetBootcampSlug = resolvedBootcamp.slug || bootcampKey;
    const targetCourseSlug = resolvedCourse.slug || courseKey;
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/bootcamps/${targetBootcampSlug}/courses/${targetCourseSlug}${queryString}`);
  }

  const effectiveBootcampId = resolvedBootcamp.id;
  const effectiveCourseId = resolvedCourse.id;

  const [bootcamp, course, bootcampModules, curriculum, allCourseVideos, deleteImpact] = await Promise.all([
    getBootcampById(effectiveBootcampId),
    getBootcampCourse(effectiveBootcampId, effectiveCourseId),
    listBootcampCourseModules(effectiveBootcampId, effectiveCourseId).catch(() => []),
    getCourseCurriculum(effectiveCourseId).catch(() => ({ modules: [] as Array<never> })),
    listVideoAssetsByCourse(effectiveCourseId).catch(() => []),
    getBootcampCourseDeleteImpact(effectiveBootcampId, effectiveCourseId).catch(() => null),
  ]);

  if (!bootcamp || !course) {
    notFound();
  }

  // Strict guardrails: must be a bootcamp course under this bootcamp.
  if (course.catalog_type !== 'bootcamp' || course.bootcamp_id !== effectiveBootcampId) {
    notFound();
  }
  // Defense in depth: confirm pillar_id is null and college visibility is false.
  if (course.pillar_id !== null) {
    notFound();
  }
  if (course.visible_to_college_admins || course.visible_to_college_students) {
    notFound();
  }

  // Merge canonical curriculum rows with bootcamp video counts
  const modules = curriculum.modules
    .map((m) => ({
      ...m,
      video_count: bootcampModules.find((b) => b.id === m.id)?.video_count ?? 0,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);

  const allItems = (curriculum as { modules: Array<{ items: Array<Record<string, unknown>> }> }).modules.flatMap((m) => m.items ?? []) as unknown as MasterCourseItemsRow[];

  const unassignedVideos = allCourseVideos.filter(
    (v) => !v.master_course_module_id || !modules.some((m) => m.id === v.master_course_module_id),
  );

  const initialSelectedModuleId = selectedModuleIdParam ?? modules[0]?.id ?? null;

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
            <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-primary">{bootcamp.title}</span>
              <Separator orientation="vertical" className="h-3" />
              <code className="bg-primary/5 text-primary px-2 py-0.5 rounded text-[11px] font-semibold border border-primary/10">
                {course.code}
              </code>
              <Separator orientation="vertical" className="h-3" />
              <span className="flex items-center gap-1.5 ml-1">
                <Video className="size-3.5" />
                <span className="font-medium">
                  {allCourseVideos.length} Videos
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:justify-end md:w-auto md:shrink-0 md:gap-3">
          {course.tp_folder_status !== 'created' && (
            <RetryCourseSyncButton
              context="bootcamp"
              bootcampId={effectiveBootcampId}
              courseId={effectiveCourseId}
              variant="outline"
              className="h-9"
            />
          )}
          <PublishCourseHeaderActions
            courseId={effectiveCourseId}
            course={course}
            context="bootcamp"
            bootcampId={effectiveBootcampId}
          />
          <CreateModuleDialog
            context="bootcamp"
            bootcampId={effectiveBootcampId}
            courseId={effectiveCourseId}
          >
            <Button className="h-9 shadow-lg shadow-primary/20">
              <Plus className="mr-2 size-4" />
              New Module
            </Button>
          </CreateModuleDialog>
          {deleteImpact && (
            <BootcampCourseDeleteAction
              bootcampId={effectiveBootcampId}
              course={course}
              deleteImpact={deleteImpact}
            />
          )}
        </div>
      </div>

      {/* Course Description */}
      {course.description && (
        <div className="bg-muted/20 p-5 rounded-xl border border-border/60">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">
            Course Description
          </h4>
          <div className="text-sm font-medium leading-relaxed text-foreground space-y-2">
            {parseCourseDescription(course.description)}
          </div>
        </div>
      )}

      {/* Modules Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Course Modules
            <Badge variant="secondary" className="ml-2 font-semibold">
              {modules.length}
            </Badge>
          </h2>
        </div>

        <CourseModulesManagerClient
          modules={modules}
          allVideos={allCourseVideos}
          allItems={allItems}
          course={course}
          effectiveBootcampId={effectiveBootcampId}
          effectiveCourseId={effectiveCourseId}
          initialSelectedModuleId={initialSelectedModuleId}
          context="bootcamp"
        />

        {/* Extra Videos (Unassigned) */}
        {unassignedVideos.length > 0 && (
          <div className='group flex items-center justify-between p-5 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] hover:border-primary/30 transition-colors duration-200 mt-2'>
            <div className='flex items-center gap-4 min-w-0'>
              <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Layers className='size-5' />
              </div>
              <div className='min-w-0'>
                <div className='flex items-center gap-2.5'>
                  <span className='text-sm font-semibold text-foreground'>
                    Extra Videos (Unassigned)
                  </span>
                  <Badge className='bg-primary/10 text-primary hover:bg-primary/15 text-[10px] font-semibold'>
                    {unassignedVideos.length} Videos
                  </Badge>
                </div>
                <p className='text-[13px] text-muted-foreground mt-0.5'>
                  These videos are synced in the course folder but haven&apos;t been
                  assigned to a module yet.
                </p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Link
                href={`/bootcamps/${effectiveBootcampId}/courses/${effectiveCourseId}/unassigned-videos`}
                className='opacity-0 group-hover:opacity-100 transition-opacity duration-200'
              >
                <Button variant="secondary" size="sm" className="h-8 font-medium text-xs">
                  Manage Extra Videos
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <PaidCourseLandingSettings courseId={effectiveCourseId} enabled />
    </div>
  );
}
