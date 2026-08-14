import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getSessionFromHeaders } from '@/lib/auth/require-superadmin';
import { getMasterCourseById } from '@/lib/services/master-courses';
import { getCourseCurriculum } from '@/lib/services/master-course-structure';
import { listVideoAssetsByCourse } from '@/lib/services/video-assets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  FolderOpen,
  FolderX,
  AlertCircle,
  Video,
  Clock,
  CheckCircle,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { formatDuration } from '@/lib/services/video-assets';

type VideoAsset = {
  id: string;
  title: string;
  tp_asset_id: string;
  processing_status: string;
  duration_seconds: number | null;
  module_id: string | null;
  content_protection_type: string | null;
  playback_url: string | null;
  thumbnail_url: string | null;
};

type ModuleLike = { id: string; title: string };

function VideoAssetRow({ video, modules }: { video: VideoAsset; modules: ModuleLike[] }) {
  const parentModule = modules.find((m) => m.id === video.module_id);
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium max-w-[300px] truncate">
          {video.title}
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {video.tp_asset_id}
        </div>
        {video.thumbnail_url && (
          <Image
            src={video.thumbnail_url}
            alt=""
            width={128}
            height={72}
            className="mt-2 rounded border"
            unoptimized
          />
        )}
      </TableCell>
      <TableCell>
        {processingStatusBadge(video.processing_status)}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {formatDuration(video.duration_seconds)}
      </TableCell>
      <TableCell>
        {parentModule ? (
          <Badge variant="outline" className="text-xs">
            {parentModule.title}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs uppercase">
          {video.content_protection_type ?? '—'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {video.playback_url && (
            <Button asChild variant="ghost" size="sm">
              <a
                href={video.playback_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function VideosTable({ videos, modules, courseId, tpFolderUuid }: { videos: VideoAsset[]; modules: ModuleLike[]; courseId: string; tpFolderUuid: string | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Video Assets ({videos.length})</CardTitle>
          <CardDescription>
            Videos uploaded to TPStreams and registered against this course.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <SyncFolderButton
            courseId={courseId}
            disabled={!tpFolderUuid}
          />
          <Button asChild>
            <Link href={`/master-courses/${courseId}/video-assets`}>
              <Plus className="size-4 mr-1" /> Upload Video
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <div className="text-center py-8">
            <Video className="size-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No videos yet. Upload your first video.</p>
            <Button asChild className="mt-3">
              <Link href={`/master-courses/${courseId}/video-assets`}>
                <Plus className="size-4 mr-1" /> Upload Video
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Video</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Protection</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((video) => (
                <VideoAssetRow key={video.id} video={video} modules={modules} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
import { SyncFolderButton } from './video-assets/sync-folder-button';
import { PublishCoursePanel } from '@/components/master-courses/publish-course-panel';
import { PaidCourseLandingSettings } from '@/components/master-courses/paid-course-landing-settings';
import { PaidCoursePricePlansPanel } from '@/components/master-courses/paid-course-price-plans-panel';
import { PricingPanel } from '@/components/master-courses/pricing-panel';
import CourseResourceSectionsEditor from '@/components/master-courses/course-resource-sections-editor';
import { resolveCourseByKey } from '@/lib/resolvers';
import { isUuid } from '@/lib/utils/slug';

function statusBadge(status: string) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

function processingStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="size-3.5" />
          Ready
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3.5" />
          Error
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <RefreshCw className="size-3.5 animate-spin" />
          Processing
        </span>
      );
    case 'queued':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Clock className="size-3.5" />
          Queued
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Pending
        </span>
      );
  }
}

export default async function MasterCourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const { courseId } = await params;
  const courseKey = courseId;
  const resolvedSearchParams = await searchParams;

  const [_auth, resolved] = await Promise.all([
    getSessionFromHeaders(),
    resolveCourseByKey(courseKey),
  ]);
  if (!_auth) { redirect('/login'); }

  if (!resolved) {
    notFound();
  }

  // Canonical redirect: UUID → slug
  if (isUuid(courseKey) && resolved.slug) {
    const searchParamsQuery = new URLSearchParams(resolvedSearchParams as Record<string, string>).toString();
    const queryString = searchParamsQuery ? `?${searchParamsQuery}` : '';
    redirect(`/master-courses/${resolved.slug}${queryString}`);
  }

  const effectiveCourseId = resolved.id;

  const [[course], [videos, curriculum]] = await Promise.all([
    Promise.all([
      getMasterCourseById(effectiveCourseId),
    ]),
    Promise.all([
      listVideoAssetsByCourse(effectiveCourseId),
      getCourseCurriculum(effectiveCourseId),
    ]),
  ]);

  if (!course) {
    notFound();
  }
  const modules = curriculum.modules;

  const stats = {
    totalVideos: videos.length,
    completedVideos: videos.filter((v) => v.processing_status === 'completed').length,
    processingVideos: videos.filter((v) =>
      ['pending', 'queued', 'processing'].includes(v.processing_status),
    ).length,
    errorVideos: videos.filter((v) => v.processing_status === 'error').length,
    totalDuration: videos.reduce(
      (sum, v) => sum + (v.duration_seconds ?? 0),
      0,
    ),
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/master-courses">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{course.title}</h1>
            <p className="text-sm text-muted-foreground font-mono">{course.code}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(course.publish_status)}
          {course.pillar_id ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/master-courses/pillars/${course.pillar_id}/courses/${courseId}`}>
                Pillar course view
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* TPStreams Folder Status */}
      <Card className={course.tp_folder_status === 'failed' ? 'border-destructive/50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {course.tp_folder_status === 'created' ? (
              <FolderOpen className="size-5 text-emerald-600" />
            ) : course.tp_folder_status === 'failed' ? (
              <AlertCircle className="size-5 text-destructive" />
            ) : (
              <FolderX className="size-5 text-muted-foreground" />
            )}
            TPStreams Folder
          </CardTitle>
          <CardDescription>
            Dedicated folder for all course videos. Created automatically during course creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Status</div>
              <div className="font-medium capitalize">{course.tp_folder_status}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Folder UUID</div>
              <div className="font-mono text-xs truncate" title={course.tp_folder_uuid ?? '—'}>
                {course.tp_folder_uuid ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Folder Title</div>
              <div className="font-medium truncate">{course.tp_folder_title ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Last Synced</div>
              <div className="font-medium" suppressHydrationWarning>
                {course.tp_last_synced_at
                  ? new Date(course.tp_last_synced_at).toLocaleString()
                  : '—'}
              </div>
            </div>
          </div>
          {course.tp_last_error && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-sm text-destructive">
              <strong>Error:</strong> {course.tp_last_error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Videos</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{stats.totalVideos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ready</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-emerald-600">{stats.completedVideos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-blue-600">{stats.processingVideos}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Duration</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{formatDuration(stats.totalDuration)}</CardContent>
        </Card>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {course.description && (
            <div>
              <div className="text-sm font-medium mb-1">Description</div>
              <div className="text-sm text-muted-foreground space-y-2">
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
                    // fallback
                  }
                  return <p className="whitespace-pre-wrap">{course.description}</p>;
                })()}
              </div>
            </div>
          )}
          {course.short_description && (
            <div>
              <div className="text-sm font-medium mb-1">Short Description</div>
              <p className="text-sm text-muted-foreground">{course.short_description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Pillar</div>
              <div className="font-medium">{course.pillar ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Program Tag</div>
              <div className="font-medium">{course.program_tag ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Created</div>
              <div className="font-medium" suppressHydrationWarning>
                {new Date(course.created_at).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Last Updated</div>
              <div className="font-medium" suppressHydrationWarning>
                {new Date(course.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      {modules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Modules ({modules.length})</CardTitle>
            <CardDescription>
              Logical organization for course videos. Does NOT create TPStreams sub-folders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modules
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((mod) => {
                  const modVideos = videos.filter((v) => v.module_id === mod.id);
                  return (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{mod.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {mod.items.length} item{mod.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {modVideos.length} video{modVideos.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      <VideosTable videos={videos} modules={modules} courseId={courseId} tpFolderUuid={course.tp_folder_uuid} />

      {/* Course Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Course Resources</CardTitle>
          <CardDescription>
            Manage resource sections and items (links, notes, files, markdown) shown in the student player Resources tab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseResourceSectionsEditor courseId={effectiveCourseId} />
        </CardContent>
      </Card>

      <div id="course-pricing">
        <PricingPanel course={course} />
      </div>

      {(course.show_as_paid_course || course.catalog_type === 'bootcamp' || course.bootcamp_id) && (
        <>
          <PaidCoursePricePlansPanel
            sourceType={
              course.catalog_type === 'bootcamp' || course.bootcamp_id
                ? 'paid_course_builder'
                : 'master_course'
            }
            sourceId={courseId}
            masterCourseId={courseId}
          />
          <PaidCourseLandingSettings
            courseId={courseId}
            enabled={!!course.show_as_paid_course || course.catalog_type === 'bootcamp' || !!course.bootcamp_id}
          />
        </>
      )}

      <div id="course-publish">
        <PublishCoursePanel courseId={courseId} course={course} />
      </div>
    </div>
  );
}
