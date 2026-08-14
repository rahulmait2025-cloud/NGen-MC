'use client';

import { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  FolderOpen,
  Clock,
  AlertCircle,
  Plus,
  Edit3,
  Link2,
  RefreshCw,
  FileQuestion,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { RetryModuleSyncButton } from '@/components/master-courses/retry-module-sync-button';
import { ModuleDeleteAction } from '@/components/master-courses/module-delete-action';
import { CreateModuleDialog } from '@/components/master-courses/create-module-dialog';
import { CourseVisibilityToggles } from '@/components/master-courses/course-visibility-toggles';
import { ModuleVideosClient } from '@/components/master-courses/module-videos-client';
import { ModuleVideoAssetsTable } from '@/components/master-courses/module-video-assets-table';
import { CourseResourceManager } from '@/components/master-courses/course-resource-manager';
import { QuizEditor } from '@/components/master-courses/quiz-editor';
import { Switch } from '@/components/ui/switch';
import { deleteItemAction, reorderItemsAction, updateItemAction } from '@/app/(app)/master-courses/[courseId]/structure-actions';

import type {
  MasterCourseModulesRow,
  MasterCoursesRow,
  MasterCourseItemsRow,
  CourseResourceWithItem,
} from '@/types/database';
import type { VideoAssetWithCourse } from '@/lib/services/video-assets';

interface CourseModulesManagerClientProps {
  modules: Array<MasterCourseModulesRow & { video_count: number }>;
  allVideos: VideoAssetWithCourse[];
  allItems: MasterCourseItemsRow[];
  course: MasterCoursesRow;
  effectivePillarId?: string;
  effectiveCourseId: string;
  initialSelectedModuleId: string | null;
  context: 'pillar' | 'bootcamp';
  effectiveBootcampId?: string;
}

/** Resolve where a quiz sits in the module for list badges. */
function getQuizPlacementLabel(
  item: MasterCourseItemsRow,
  moduleVideoItems: MasterCourseItemsRow[],
): string {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  const linkedId =
    typeof metadata.linked_video_id === 'string' && metadata.linked_video_id.trim()
      ? metadata.linked_video_id
      : null;
  const explicitPlacement =
    typeof metadata.placement === 'string' ? metadata.placement : null;
  const sort = item.sort_order ?? 0;

  if (linkedId || explicitPlacement === 'after_video') {
    const video = linkedId
      ? moduleVideoItems.find((v) => v.id === linkedId)
      : null;
    return video ? `After: ${video.title}` : 'After linked video';
  }

  if (explicitPlacement === 'end' || sort === 999999) {
    return 'End of module';
  }

  if (explicitPlacement === 'start' || sort === -1) {
    return 'Start of module';
  }

  // Infer "after video" from sort proximity (matches quiz-editor load logic)
  let bestVideo: MasterCourseItemsRow | null = null;
  for (const v of moduleVideoItems) {
    if ((v.sort_order ?? 0) < sort) {
      if (!bestVideo || (v.sort_order ?? 0) > (bestVideo.sort_order ?? 0)) {
        bestVideo = v;
      }
    }
  }
  if (bestVideo && sort - (bestVideo.sort_order ?? 0) < 10) {
    return `After: ${bestVideo.title}`;
  }

  if (explicitPlacement === 'custom') {
    return `Custom position (${sort})`;
  }

  return `Custom position (${sort})`;
}

function tpFolderStatusBadge(status: string, error: string | null) {
  switch (status) {
    case 'created':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50/50 gap-1.5 text-[10px] dark:text-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <FolderOpen className="size-3" />
          Synced
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="outline"
          className="text-destructive border-destructive/20 bg-destructive/5 gap-1.5 text-[10px]"
          title={error ?? 'Sync failed'}
        >
          <AlertCircle className="size-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1.5 text-[10px]">
          <Clock className="size-3" />
          Pending
        </Badge>
      );
  }
}

function ModuleTpStatusBadge({ status, error }: { status: string | null; error: string | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1.5 text-[10px]">
        <Clock className="size-3" />
        No folder
      </Badge>
    );
  }
  return tpFolderStatusBadge(status, error);
}

export function CourseModulesManagerClient({
  modules,
  allVideos,
  allItems,
  course,
  effectivePillarId = '',
  effectiveCourseId,
  initialSelectedModuleId,
  context,
  effectiveBootcampId = '',
}: CourseModulesManagerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(() => {
    if (initialSelectedModuleId && modules.some((m) => m.id === initialSelectedModuleId)) {
      return initialSelectedModuleId;
    }
    return modules[0]?.id ?? null;
  });

  const selectedModule = modules.find((m) => m.id === selectedModuleId) ?? modules[0] ?? null;
  const moduleOrdinalById = new Map(modules.map((m, index) => [m.id, index] as const));

  // Quiz state
  const [isQuizEditorOpen, setIsQuizEditorOpen] = useState(false);
  const [quizEditorItemId, setQuizEditorItemId] = useState<string | null>(null);
  const [linkQuizId, setLinkQuizId] = useState<string | null>(null);
  const [showLinkVideoDialog, setShowLinkVideoDialog] = useState(false);
  const [quizStatuses, setQuizStatuses] = useState<Record<string, { publish_status: string; title: string }>>({});
  const [deleteConfirmItemId, setDeleteConfirmItemId] = useState<string | null>(null);
  const [moduleResources, setModuleResources] = useState<CourseResourceWithItem[]>([]);

  // Get quiz_placeholder items for the selected module
  const moduleQuizItems = selectedModule
    ? allItems
        .filter((item) => item.module_id === selectedModule.id && item.item_type === 'quiz_placeholder')
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  // Get video items in this module for linking
  const moduleVideoItems = selectedModule
    ? allItems
        .filter((item) => item.module_id === selectedModule.id && item.item_type === 'video')
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const quizIdsList = moduleQuizItems
    .map((item) => (item as MasterCourseItemsRow & { quiz_id?: string | null }).quiz_id)
    .filter((id): id is string => !!id);
  const quizIdsSerialized = quizIdsList.join(',');

  const fetchQuizStatuses = useCallback(async () => {
    const quizIds = quizIdsSerialized ? quizIdsSerialized.split(',') : [];
    if (!quizIds.length) return;
    try {
      const { getQuizStatuses } = await import('@/app/(app)/master-courses/[courseId]/quiz-actions');
      const result = await getQuizStatuses(quizIds);
      if (result.ok && result.data) {
        setQuizStatuses(result.data);
      }
    } catch {}
  }, [quizIdsSerialized]);

  // Fetch quiz publish statuses for quiz items
  useEffect(() => {
    fetchQuizStatuses();
  }, [fetchQuizStatuses]);

  const handleLinkQuizToVideo = async (quizItemId: string, videoItemId: string | null) => {
    try {
      const existing = allItems.find((item) => item.id === quizItemId);
      const existingMetadata = (existing?.metadata ?? {}) as Record<string, unknown>;
      const fd = new FormData();
      fd.append('item_id', quizItemId);
      fd.append(
        'metadata',
        JSON.stringify({
          ...existingMetadata,
          linked_video_id: videoItemId,
          placement: videoItemId ? 'after_video' : 'end',
        }),
      );
      
      if (videoItemId) {
        const targetVideo = allItems.find((item) => item.id === videoItemId);
        if (targetVideo) {
          fd.append('sort_order', String(targetVideo.sort_order + 5));
        }
      } else {
        fd.append('sort_order', '999999');
      }

      const res = await updateItemAction(fd);
      if (res.ok) {
        toast.success(videoItemId ? 'Quiz linked to video' : 'Quiz link removed');
        setShowLinkVideoDialog(false);
        setLinkQuizId(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to link quiz');
      }
    } catch {
      toast.error('Failed to link quiz');
    }
  };

  const handleToggleQuizPublish = async (quizItemId: string, quizId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const fd = new FormData();
      fd.append('item_id', quizItemId);
      fd.append('status', newStatus);
      const { toggleQuizPublishAction } = await import('@/app/(app)/master-courses/[courseId]/quiz-actions');
      const res = await toggleQuizPublishAction(fd);
      if (res.ok) {
        toast.success(`Quiz ${newStatus === 'published' ? 'published' : 'unpublished'}`);
        setQuizStatuses((prev) => ({
          ...prev,
          [quizId]: {
            ...prev[quizId],
            publish_status: newStatus,
          },
        }));
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to update');
      }
    } catch {
      toast.error('Failed to update quiz status');
    }
  };

  const handleCreateQuiz = () => {
    if (!selectedModule) return;
    setQuizEditorItemId(null);
    setIsQuizEditorOpen(true);
  };

  const handleDeleteQuizItem = (itemId: string) => {
    setDeleteConfirmItemId(itemId);
  };

  const confirmDeleteQuizItem = async () => {
    if (!deleteConfirmItemId) return;
    try {
      const fd = new FormData();
      fd.append('item_id', deleteConfirmItemId);
      const res = await deleteItemAction(fd);
      if (res.ok) {
        toast.success('Quiz deleted');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete quiz');
      }
    } catch {
      toast.error('Failed to delete quiz');
    } finally {
      setDeleteConfirmItemId(null);
    }
  };

  const handleMoveQuiz = async (itemId: string, currentIndex: number, direction: 'up' | 'down') => {
    if (!selectedModule) return;
    const quizItems = allItems.filter(
      (i) => i.module_id === selectedModule.id && i.item_type === 'quiz_placeholder',
    );
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= quizItems.length) return;

    const reordered = [...quizItems];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];

    try {
      await reorderItemsAction(selectedModule.id, reordered.map((i) => i.id));
      router.refresh();
    } catch {
      toast.error('Failed to reorder');
    }
  };

  const selectedModuleVideos = selectedModule
    ? allVideos.filter((v) => v.master_course_module_id === selectedModule.id)
    : [];

  /** Map video asset id → titles of resources attached to that lesson. */
  const linkedResourcesByVideoId = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!selectedModule) return map;

    const itemByVideoAssetId = new Map<string, string>();
    for (const item of allItems) {
      if (
        item.module_id === selectedModule.id &&
        item.item_type === 'video' &&
        item.video_asset_id
      ) {
        itemByVideoAssetId.set(item.video_asset_id, item.id);
      }
    }

    for (const resource of moduleResources) {
      if (resource.resource_scope !== 'lesson_attachment' || !resource.parent_item_id) continue;
      for (const [videoAssetId, itemId] of itemByVideoAssetId) {
        if (itemId === resource.parent_item_id) {
          if (!map[videoAssetId]) map[videoAssetId] = [];
          map[videoAssetId].push(resource.title);
        }
      }
    }
    return map;
  }, [selectedModule, allItems, moduleResources]);

  const selectedModuleFolderReady =
    selectedModule?.tp_folder_status === 'created' && Boolean(selectedModule.tp_folder_uuid);

  const selectModule = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setModuleResources([]);
    const url = new URL(window.location.href);
    url.searchParams.set('module', moduleId);
    window.history.replaceState(null, '', url.pathname + url.search);
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  if (modules.length === 0) {
    return (
      <Card className="border-dashed py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
            <Plus className="size-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No modules found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">
            Start building your course structure by adding your first module.
          </p>
          <CreateModuleDialog
            context={context}
            pillarId={context === 'pillar' ? effectivePillarId : undefined}
            bootcampId={context === 'bootcamp' ? effectiveBootcampId : undefined}
            courseId={effectiveCourseId}
          >
            <Button className="mt-6" variant="outline">
              <Plus className="mr-2 size-4" />
              Add Module
            </Button>
          </CreateModuleDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Navigation Tabs */}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-3">
          {modules.map((module) => {
            const isSelected = selectedModule?.id === module.id;
            const ordinal = moduleOrdinalById.get(module.id) ?? 0;
            const moduleHref =
              context === 'bootcamp'
                ? `/bootcamps/${effectiveBootcampId}/courses/${effectiveCourseId}?module=${module.id}`
                : `/master-courses/pillars/${effectivePillarId}/courses/${effectiveCourseId}?module=${module.id}`;

            return (
              <div
                key={module.id}
                className={`relative flex min-w-[320px] items-center justify-between gap-3 rounded-xl border p-3 transition-[border-color,background-color,box-shadow] ${
                  isSelected
                    ? 'border-primary bg-primary/[0.04] shadow-sm shadow-primary/20'
                    : 'bg-card hover:border-primary/30'
                }`}
              >
                <Link
                  href={moduleHref}
                  onClick={(e) => {
                    e.preventDefault();
                    selectModule(module.id);
                  }}
                  className="absolute inset-0 z-10 rounded-xl"
                  aria-label={`Open module ${module.title}`}
                />
                <div className="pointer-events-none min-w-0 space-y-1">
                  <span className="block text-sm font-semibold truncate">
                    {ordinal}. {module.title}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Video className="size-3.5" />
                    <span>{module.video_count} videos</span>
                  </div>
                </div>
                <div className="relative z-20 flex items-center gap-2">
                  {module.tp_folder_status !== 'created' && (
                    <RetryModuleSyncButton
                      context={context}
                      pillarId={context === 'pillar' ? effectivePillarId : undefined}
                      bootcampId={context === 'bootcamp' ? effectiveBootcampId : undefined}
                      courseId={effectiveCourseId}
                      moduleId={module.id}
                      size="sm"
                      variant="outline"
                    />
                  )}
                  <ModuleDeleteAction
                    context={context}
                    pillarId={context === 'pillar' ? effectivePillarId : undefined}
                    bootcampId={context === 'bootcamp' ? effectiveBootcampId : undefined}
                    courseId={effectiveCourseId}
                    module={module}
                    videoCount={module.video_count}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Module Detail Panel */}
      {selectedModule && (
        <div className="space-y-6">
          {/* Module Overview Card */}
          {context === 'pillar' ? (
            <Card className="border-2 border-border/60 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>
                        {moduleOrdinalById.get(selectedModule.id) ?? 0}. {selectedModule.title}
                      </span>
                      <CreateModuleDialog
                        pillarId={effectivePillarId}
                        courseId={effectiveCourseId}
                        module={selectedModule}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted">
                            <Edit3 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        }
                      />
                    </CardTitle>
                    <CardDescription>
                      Manage this module&apos;s videos and publishing state.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <ModuleTpStatusBadge
                      status={selectedModule.tp_folder_status}
                      error={selectedModule.tp_last_error}
                    />
                    <CourseVisibilityToggles
                      courseId={course.id}
                      pillarId={effectivePillarId}
                      initialVisibility={{
                        visible_to_college_admins: false,
                        visible_to_college_students: false,
                        visible_to_global_students: false,
                      }}
                      showGlobalStudents={false}
                      compact
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Video className="size-4" />
                    {selectedModule.video_count} videos in this module
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline">
                    <Link
                      href={`/master-courses/pillars/${effectivePillarId}/courses/${effectiveCourseId}/modules/${selectedModule.id}/videos`}
                    >
                      Open Module Videos
                    </Link>
                  </Button>
                  <Button variant="outline" onClick={handleRefresh} disabled={isPending}>
                    {isPending ? (
                      <RefreshCw className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5 mr-1.5" />
                    )}
                    Refresh Module View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border/60">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>
                        {moduleOrdinalById.get(selectedModule.id) ?? 0}. {selectedModule.title}
                      </span>
                      <CreateModuleDialog
                        context="bootcamp"
                        bootcampId={effectiveBootcampId}
                        courseId={effectiveCourseId}
                        module={selectedModule}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted">
                            <Edit3 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        }
                      />
                    </CardTitle>
                    <CardDescription className="text-[13px]">
                      Manage this module&apos;s videos and publishing state.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <ModuleTpStatusBadge
                      status={selectedModule.tp_folder_status}
                      error={selectedModule.tp_last_error}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Video className="size-4" />
                    {selectedModule.video_count} videos in this module
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={handleRefresh} disabled={isPending}>
                    <RefreshCw className={`size-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
                    Refresh Module View
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Module Video Library Card */}
          <Card className={`border shadow-sm overflow-hidden ${context === 'pillar' ? 'border-primary/10' : 'border-border/60'}`}>
            <CardHeader className={`border-b py-4 ${context === 'pillar' ? 'bg-primary/[0.02]' : 'border-border/55'}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle className={`flex items-center gap-2 ${context === 'pillar' ? 'text-lg text-primary' : 'text-base'}`}>
                    <Video className="size-5" />
                    Module Video Library
                  </CardTitle>
                  <CardDescription className={context === 'pillar' ? 'font-medium text-muted-foreground mt-1' : 'text-[13px] text-muted-foreground mt-0.5'}>
                    Manage videos for{' '}
                    <span className={context === 'pillar' ? 'text-foreground' : 'text-foreground font-medium'}>
                      {selectedModule.title}
                    </span>{' '}
                    without leaving this page.
                  </CardDescription>
                </div>
                <ModuleVideosClient
                  key={selectedModule.id}
                  context={context}
                  pillarId={context === 'pillar' ? effectivePillarId : undefined}
                  bootcampId={context === 'bootcamp' ? effectiveBootcampId : undefined}
                  courseId={effectiveCourseId}
                  moduleId={selectedModule.id}
                  folderUuid={selectedModule.tp_folder_uuid}
                  modules={modules}
                />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              {!selectedModuleFolderReady && (
                <div className={`border rounded-xl p-5 ${context === 'pillar' ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-amber-50/50 border-amber-200/60'}`}>
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="size-6 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900 text-base">Module Folder Not Ready</h4>
                      <p className="text-sm text-amber-800 mt-1 font-medium leading-relaxed">
                        This module needs a TPStreams folder before upload/sync can be managed here.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedModuleVideos.length === 0 ? (
                <div className={`text-center py-12 border-2 border-dashed border-border/60 rounded-2xl ${context === 'pillar' ? 'bg-muted/20' : 'bg-muted/10'}`}>
                  <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
                    <Video className="size-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-foreground">No videos yet</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      {selectedModuleFolderReady
                        ? 'Upload videos or sync from TPStreams to populate this module.'
                        : 'Prepare module folder sync first, then videos will appear here.'}
                    </p>
                  </div>
                </div>
              ) : (
                <ModuleVideoAssetsTable
                  context={context}
                  bootcampId={context === 'bootcamp' ? effectiveBootcampId : undefined}
                  linkedResourcesByVideoId={linkedResourcesByVideoId}
                  videos={selectedModuleVideos.map((v) => ({
                    id: v.id,
                    tp_asset_id: v.tp_asset_id,
                    title: v.title,
                    description: v.description,
                    thumbnail_url: v.thumbnail_url,
                    updated_at: v.updated_at,
                    processing_status: v.processing_status,
                    duration_seconds: v.duration_seconds,
                    created_at: v.created_at,
                    resolutions: v.resolutions,
                    sort_order: v.sort_order,
                  }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Quiz Section */}
          <Card className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileQuestion className="size-5 text-primary" />
                    Quizzes
                    {moduleQuizItems.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {moduleQuizItems.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-[13px]">
                    Create and manage quizzes for this module. Quizzes appear in the course player after the module content.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      setLinkQuizId(moduleQuizItems[0]?.id ?? null);
                      setShowLinkVideoDialog(true);
                    }}
                    disabled={moduleQuizItems.length === 0}
                  >
                    <Link2 className="size-4 mr-1.5" /> Link to Video
                  </Button>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleCreateQuiz}
                  >
                    <Plus className="size-4 mr-1.5" />
                    Add Quiz
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {moduleQuizItems.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
                  <FileQuestion className="size-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No quizzes in this module yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &quot;Add Quiz&quot; to create a quiz for this module.
                  </p>
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {moduleQuizItems.map((item, idx) => {
                    const quizId = (item as MasterCourseItemsRow & { quiz_id?: string | null }).quiz_id;
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuiz(item.id, idx, 'up')}
                            >
                              <ChevronUp className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-5"
                              disabled={idx === moduleQuizItems.length - 1}
                              onClick={() => handleMoveQuiz(item.id, idx, 'down')}
                            >
                              <ChevronDown className="size-3" />
                            </Button>
                          </div>
                          <FileQuestion className="size-4 text-primary" />
                          <div>
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link Title:</span>
                              <span className="text-sm font-semibold text-foreground">{item.title}</span>
                              {quizId ? (
                                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[10px] font-semibold py-0 px-1.5 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                  Configured
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 py-0 px-1.5">
                                  No Quiz
                                </Badge>
                              )}
                              {quizId && quizStatuses[quizId] && (
                                <Badge
                                  className={`text-[10px] py-0 px-1.5 font-semibold border ${
                                    quizStatuses[quizId].publish_status === 'published'
                                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                                      : 'bg-secondary text-secondary-foreground border-transparent'
                                  }`}
                                >
                                  {quizStatuses[quizId].publish_status === 'published' ? 'Published' : 'Draft'}
                                </Badge>
                              )}
                              {(() => {
                                const placement = getQuizPlacementLabel(item, moduleVideoItems);
                                const isAfterVideo = placement.startsWith('After:');
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] py-0 px-1.5 max-w-[220px] truncate ${
                                      isAfterVideo
                                        ? 'text-sky-600 dark:text-sky-400 border-sky-500/20 dark:border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10'
                                        : 'text-violet-600 dark:text-violet-400 border-violet-500/20 dark:border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10'
                                    }`}
                                    title={placement}
                                  >
                                    <Link2 className="size-2.5 mr-0.5 shrink-0" />
                                    <span className="truncate">{placement}</span>
                                  </Badge>
                                );
                              })()}
                            </div>
                            {quizId && quizStatuses[quizId]?.title && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[11px] font-medium text-muted-foreground">Quiz Title:</span>
                                <span className="text-[11px] font-medium text-primary bg-primary/5 border border-primary/10 rounded px-1.5 py-0.5">
                                  {quizStatuses[quizId].title}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {quizId && (
                            <div className="flex items-center gap-1.5 mr-2" title={quizStatuses[quizId]?.publish_status === 'published' ? 'Unpublish' : 'Publish'}>
                              <Switch
                                checked={quizStatuses[quizId]?.publish_status === 'published'}
                                onCheckedChange={() => handleToggleQuizPublish(item.id, quizId, quizStatuses[quizId]?.publish_status ?? 'draft')}
                              />
                              <span
                                className={`text-[11px] font-semibold select-none cursor-pointer ${
                                  quizStatuses[quizId]?.publish_status === 'published'
                                    ? 'text-emerald-600'
                                    : 'text-muted-foreground'
                                }`}
                                onClick={() => handleToggleQuizPublish(item.id, quizId, quizStatuses[quizId]?.publish_status ?? 'draft')}
                              >
                                {quizStatuses[quizId]?.publish_status === 'published' ? 'Live' : 'Draft'}
                              </span>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setQuizEditorItemId(item.id);
                              setIsQuizEditorOpen(true);
                            }}
                          >
                            <Edit3 className="size-3.5 mr-1" />
                            {quizId ? 'Edit Quiz' : 'Create Quiz'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteQuizItem(item.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Resources Manager Component */}
          <CourseResourceManager
            key={selectedModule.id}
            courseId={effectiveCourseId}
            moduleId={selectedModule.id}
            moduleTitle={selectedModule.title}
            items={allItems}
            context={context}
            bootcampId={context === 'bootcamp' ? effectiveBootcampId : undefined}
            onResourcesChange={setModuleResources}
          />
        </div>
      )}


      {/* Quiz Editor Dialog — opens on Add Quiz (create) or Edit Quiz (existing item) */}
      {isQuizEditorOpen && selectedModule && (
        <Dialog
          open={isQuizEditorOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsQuizEditorOpen(false);
              setQuizEditorItemId(null);
            }
          }}
        >
          <DialogContent
            className="sm:max-w-2xl max-h-[85vh] h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
            data-lenis-prevent
          >
            <QuizEditor
              itemId={quizEditorItemId}
              moduleId={selectedModule.id}
              masterCourseId={effectiveCourseId}
              courseTitle={course.title}
              moduleItems={allItems.filter((item) => item.module_id === selectedModule.id)}
              onClose={() => {
                setIsQuizEditorOpen(false);
                setQuizEditorItemId(null);
                fetchQuizStatuses();
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Link Quiz to Video Dialog */}
      <Dialog open={showLinkVideoDialog} onOpenChange={setShowLinkVideoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="size-5" />
              Link Quiz to Video
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Select a video after which this quiz will appear in the course player.
            </p>
            <div className="space-y-1.5">
              <Label>Select Quiz</Label>
              <Select
                value={linkQuizId ?? ''}
                onValueChange={(val) => setLinkQuizId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a quiz" />
                </SelectTrigger>
                <SelectContent>
                  {moduleQuizItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link to Video</Label>
              <Select
                value={(() => {
                  const quiz = moduleQuizItems.find((i) => i.id === linkQuizId);
                  const linkedId = (quiz as MasterCourseItemsRow & { metadata?: Record<string, unknown> })?.metadata?.linked_video_id as string ?? '';
                  return linkedId || '_none';
                })()}
                onValueChange={(val) => {
                  if (linkQuizId) {
                    handleLinkQuizToVideo(linkQuizId, val === '_none' ? null : val);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select video positioning" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">End of module (no video link)</SelectItem>
                  {moduleVideoItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      After: {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkVideoDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Quiz Confirmation Dialog */}
      <Dialog
        open={deleteConfirmItemId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmItemId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Quiz?</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-muted-foreground">
            Delete this quiz? This will remove the quiz and all student attempts.
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmItemId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteQuizItem}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
