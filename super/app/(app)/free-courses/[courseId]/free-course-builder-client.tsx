'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Youtube,
  Video,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  updateFreeCourseBasicsAction,
  updateFreeCourseStatusAction,
  updateFreeCourseLessonAction,
  removeFreeCourseLessonAction,
  publishAllFreeCourseLessonsAction,
} from '@/app/(app)/free-courses/actions';
import { syncFreeCourseTpAssetsAction } from '@/app/(app)/free-courses/[courseId]/tpstreams-upload/actions';
import type {
  MasterCoursesRow,
  MasterCourseModulesRow,
  MasterCourseItemsRow,
  MasterCoursePublishStatus,
  VideoAssetsRow,
} from '@/types/database';

interface FreeCourseBuilderClientProps {
  course: MasterCoursesRow;
  modules: MasterCourseModulesRow[];
  items: MasterCourseItemsRow[];
  videoAssetsByItemId: Record<string, VideoAssetsRow>;
  stats: {
    module_count: number;
    lesson_count: number;
    youtube_lesson_count: number;
    tpstreams_lesson_count: number;
  };
  thumbnailUrl: string | null;
}

function processingBadge(status: string) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border text-[10px] dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Ready</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="destructive" className="text-[10px]">Error</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] capitalize">{status}</Badge>;
}

function statusBadge(status: MasterCoursePublishStatus) {
  switch (status) {
    case 'published':
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border dark:text-emerald-400 dark:border-emerald-500/20 dark:bg-emerald-500/10">Published</Badge>;
    case 'unpublished':
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 border dark:text-amber-400 dark:border-amber-500/20 dark:bg-amber-500/10">Unpublished</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

interface CurriculumCardProps {
  stats: { module_count: number; lesson_count: number };
  unpublishedLessonCount: number;
  itemsByModule: Array<{ module: MasterCourseModulesRow; lessons: MasterCourseItemsRow[] }>;
  videoAssetsByItemId: Record<string, VideoAssetsRow>;
  pending: boolean;
  onSyncTpAssets: () => void;
  onPublishAllLessons: () => void;
  onEditLesson: (lesson: MasterCourseItemsRow) => void;
  onRemoveLesson: (lesson: MasterCourseItemsRow) => void;
}

function CurriculumCard({
  stats,
  unpublishedLessonCount,
  itemsByModule,
  videoAssetsByItemId,
  pending,
  onSyncTpAssets,
  onPublishAllLessons,
  onEditLesson,
  onRemoveLesson,
}: CurriculumCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Curriculum</CardTitle>
          <CardDescription>{stats.module_count} module(s), {stats.lesson_count} lesson(s).</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {unpublishedLessonCount > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onPublishAllLessons}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Publish all lessons ({unpublishedLessonCount})
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onSyncTpAssets}>
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Sync TPStreams Assets
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {itemsByModule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No modules yet.</p>
        ) : (
          itemsByModule.map(({ module, lessons }) => (
            <div key={module.id} className="rounded-lg border p-3">
              <p className="font-medium text-sm">{module.title}</p>
              {lessons.length === 0 ? (
                <p className="text-xs text-muted-foreground mt-2">No lessons in this module.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {lessons.map((lesson) => {
                    const asset = videoAssetsByItemId[lesson.id];
                    const thumb = lesson.video_source === 'youtube' ? lesson.youtube_thumbnail_url : asset?.thumbnail_url;
                    return (
                      <li key={lesson.id} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between rounded-md border bg-muted/20 p-3">
                        <div className="flex gap-3 min-w-0 flex-1">
                          {thumb && (
                            // eslint-disable-next-line @next/next/no-img-element -- external thumbnail URL, not optimizable
                            <img src={thumb} alt="" className="w-20 h-12 rounded object-cover border shrink-0" />
                          )}
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm truncate">{lesson.title}</span>
                              {lesson.video_source === 'youtube' ? (
                                <Badge variant="outline" className="text-[10px] shrink-0 gap-0.5 border-red-500/30 text-red-700">
                                  <Youtube className="size-2.5" /> YouTube
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] shrink-0 gap-0.5 border-primary/30 text-primary">
                                  <Video className="size-2.5" /> Premium
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px]">#{lesson.sort_order}</Badge>
                              {statusBadge(lesson.publish_status)}
                              {asset && processingBadge(asset.processing_status)}
                              {asset?.content_protection_type && (
                                <Badge variant="outline" className="text-[10px] uppercase">{asset.content_protection_type}</Badge>
                              )}
                            </div>
                            {lesson.video_source === 'youtube' && lesson.youtube_original_title && lesson.youtube_original_title !== lesson.title && (
                              <p className="text-xs text-muted-foreground line-clamp-1">YouTube: {lesson.youtube_original_title}</p>
                            )}
                            {lesson.video_source === 'youtube' && lesson.youtube_video_id && (
                              <p className="text-xs text-muted-foreground font-mono">{lesson.youtube_video_id}</p>
                            )}
                            {lesson.description && <p className="text-xs text-muted-foreground line-clamp-2">{lesson.description}</p>}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => onEditLesson(lesson)}>
                            <Pencil className="mr-1 size-3.5" /> Edit
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onRemoveLesson(lesson)}>
                            <Trash2 className="mr-1 size-3.5" /> Remove
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface CourseEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: MasterCoursesRow;
  thumbnailUrl: string | null;
  visibility: { visible_to_global_students: boolean; visible_to_college_students: boolean; visible_to_college_admins: boolean };
  onVisibilityChange: React.Dispatch<React.SetStateAction<{ visible_to_global_students: boolean; visible_to_college_students: boolean; visible_to_college_admins: boolean }>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}

function CourseEditDialog({ open, onOpenChange, course, thumbnailUrl, visibility, onVisibilityChange, onSubmit, pending }: CourseEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit course details</DialogTitle>
          <DialogDescription>Update title, descriptions, thumbnail, and visibility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" name="title" defaultValue={course.title} required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-short_description">Short description</Label>
            <Input id="edit-short_description" name="short_description" defaultValue={course.short_description ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" name="description" rows={3} defaultValue={course.description ?? ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-thumbnail_url">Thumbnail URL</Label>
            <Input id="edit-thumbnail_url" name="thumbnail_url" type="url" defaultValue={thumbnailUrl ?? ''} />
          </div>
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="font-normal">Global students</Label>
              <Switch checked={visibility.visible_to_global_students} onCheckedChange={(c) => onVisibilityChange((v) => ({ ...v, visible_to_global_students: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">College students</Label>
              <Switch checked={visibility.visible_to_college_students} onCheckedChange={(c) => onVisibilityChange((v) => ({ ...v, visible_to_college_students: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">College admins</Label>
              <Switch checked={visibility.visible_to_college_admins} onCheckedChange={(c) => onVisibilityChange((v) => ({ ...v, visible_to_college_admins: c }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface LessonEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLesson: MasterCourseItemsRow | null;
  lessonForm: { title: string; description: string; thumbnail_url: string; sort_order: number; publish_status: MasterCoursePublishStatus };
  onFormChange: React.Dispatch<React.SetStateAction<{ title: string; description: string; thumbnail_url: string; sort_order: number; publish_status: MasterCoursePublishStatus }>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}

function LessonEditDialog({ open, onOpenChange, editingLesson, lessonForm, onFormChange, onSubmit, pending }: LessonEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>
            {editingLesson?.video_source === 'youtube'
              ? 'Update title, thumbnail, and publish status for this YouTube lecture.'
              : 'Update title, description, thumbnail, sort order, and publish status.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input id="lesson-title" value={lessonForm.title} onChange={(e) => onFormChange((f) => ({ ...f, title: e.target.value }))} required minLength={1} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-description">Description</Label>
            <Textarea id="lesson-description" value={lessonForm.description} onChange={(e) => onFormChange((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-thumbnail">Thumbnail URL</Label>
            <Input id="lesson-thumbnail" type="url" value={lessonForm.thumbnail_url} onChange={(e) => onFormChange((f) => ({ ...f, thumbnail_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-sort">Sort order</Label>
            <Input id="lesson-sort" type="number" min={0} value={lessonForm.sort_order} onChange={(e) => onFormChange((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))} />
          </div>
          <div className="space-y-2">
            <Label>Publish status</Label>
            <Select value={lessonForm.publish_status} onValueChange={(v) => onFormChange((f) => ({ ...f, publish_status: v as MasterCoursePublishStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />} Save lesson
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FreeCourseBuilderClient({
  course,
  modules,
  items,
  videoAssetsByItemId,
  stats,
  thumbnailUrl,
}: FreeCourseBuilderClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [lessonEditOpen, setLessonEditOpen] = useState(false);
  const [lessonToRemove, setLessonToRemove] = useState<MasterCourseItemsRow | null>(null);
  const [editingLesson, setEditingLesson] = useState<MasterCourseItemsRow | null>(null);
  const [lessonForm, setLessonForm] = useState(() => ({
    title: '',
    description: '',
    thumbnail_url: '',
    sort_order: 0,
    publish_status: 'draft' as MasterCoursePublishStatus,
  }));
  const [visibility, setVisibility] = useState(() => ({
    visible_to_college_admins: course.visible_to_college_admins,
    visible_to_college_students: course.visible_to_college_students,
    visible_to_global_students: course.visible_to_global_students,
  }));

  function handleStatusChange(next: MasterCoursePublishStatus) {
    startTransition(async () => {
      const result = await updateFreeCourseStatusAction(course.id, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        next === 'published'
          ? 'Course and all lessons published'
          : `Course marked as ${next}`,
      );
      router.refresh();
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('visible_to_college_admins', visibility.visible_to_college_admins ? 'on' : 'off');
    formData.set('visible_to_college_students', visibility.visible_to_college_students ? 'on' : 'off');
    formData.set('visible_to_global_students', visibility.visible_to_global_students ? 'on' : 'off');

    startTransition(async () => {
      const result = await updateFreeCourseBasicsAction(course.id, formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Course details updated');
      setEditOpen(false);
      router.refresh();
    });
  }

  function openLessonEdit(lesson: MasterCourseItemsRow) {
    const asset = videoAssetsByItemId[lesson.id];
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      description: lesson.description ?? '',
      thumbnail_url:
        lesson.video_source === 'youtube'
          ? lesson.youtube_thumbnail_url ?? ''
          : asset?.thumbnail_url ?? '',
      sort_order: lesson.sort_order,
      publish_status: lesson.publish_status,
    });
    setLessonEditOpen(true);
  }

  function handleSyncTpAssets() {
    startTransition(async () => {
      const result = await syncFreeCourseTpAssetsAction(course.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('TPStreams assets synced for this course');
      router.refresh();
    });
  }

  function handlePublishAllLessons() {
    startTransition(async () => {
      const result = await publishAllFreeCourseLessonsAction(course.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const count = result.data?.lessonsUpdated ?? 0;
      toast.success(
        count > 0
          ? `Published ${count} lesson(s)`
          : 'All lessons were already published',
      );
      router.refresh();
    });
  }

  function handleLessonEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingLesson) return;

    startTransition(async () => {
      const result = await updateFreeCourseLessonAction(course.id, editingLesson.id, {
        title: lessonForm.title,
        description: lessonForm.description || null,
        thumbnail_url: lessonForm.thumbnail_url || null,
        publish_status: lessonForm.publish_status,
        sort_order: lessonForm.sort_order,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Lesson updated');
      setLessonEditOpen(false);
      setEditingLesson(null);
      router.refresh();
    });
  }

  function handleRemoveLesson() {
    if (!lessonToRemove) return;
    startTransition(async () => {
      const result = await removeFreeCourseLessonAction(course.id, lessonToRemove.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Lesson removed');
      setLessonToRemove(null);
      router.refresh();
    });
  }

  const itemsByModule = modules.map((mod) => ({
    module: mod,
    lessons: items
      .filter((item) => item.module_id === mod.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  }));

  const unpublishedLessonCount = items.filter((item) => item.publish_status !== 'published').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/free-courses">
              <ArrowLeft className="mr-2 size-4" />
              Back to Free Courses
            </Link>
          </Button>
          <h2 className="text-xl font-semibold tracking-tight">{course.title}</h2>
          <p className="text-sm text-muted-foreground font-mono">{course.code}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline" className="border-primary/30 text-primary">
              Free Course
            </Badge>
            {statusBadge(course.publish_status)}
            <Badge variant="outline" className="gap-1">
              <Youtube className="size-3" />
              {stats.youtube_lesson_count} YouTube
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Video className="size-3" />
              {stats.tpstreams_lesson_count} TPStreams
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" />
            Edit Details
          </Button>
          {course.publish_status !== 'published' && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => handleStatusChange('published')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Publish
            </Button>
          )}
          {course.publish_status === 'published' && (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => handleStatusChange('unpublished')}
            >
              Unpublish
            </Button>
          )}
          {course.publish_status !== 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => handleStatusChange('draft')}
            >
              Mark Draft
            </Button>
          )}
        </div>
      </div>

      {(course.publish_status !== 'published' ||
        !course.visible_to_college_students ||
        unpublishedLessonCount > 0) && (
        <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30">
          <CardContent className="flex gap-3 pt-6 text-sm text-amber-950 dark:text-amber-100">
            <AlertCircle className="size-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium">Students on college portals may not see this course yet</p>
              <ul className="list-disc pl-4 text-amber-900/90 dark:text-amber-100/90 space-y-0.5">
                {course.publish_status !== 'published' && (
                  <li>Publish the course (status is currently {course.publish_status}).</li>
                )}
                {unpublishedLessonCount > 0 && (
                  <li>
                    {unpublishedLessonCount} lesson(s) are still draft/unpublished — use{' '}
                    <strong>Publish all lessons</strong> in Curriculum, or publish the course
                    (that now publishes lessons too).
                  </li>
                )}
                {!course.visible_to_college_students && (
                  <li>
                    Turn on <strong>Visible to college students</strong> under Visibility (college
                    URLs like /c/your-college/student/courses).
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>Basic metadata for this free course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {thumbnailUrl && (
              <p>
                <span className="text-muted-foreground">Thumbnail:</span>{' '}
                <a href={thumbnailUrl} className="text-primary hover:underline break-all" target="_blank" rel="noreferrer">
                  {thumbnailUrl}
                </a>
              </p>
            )}
            {course.short_description && (
              <p>
                <span className="text-muted-foreground">Short description:</span> {course.short_description}
              </p>
            )}
            {course.description && (
              <p className="whitespace-pre-wrap">
                <span className="text-muted-foreground">Description:</span> {course.description}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Visibility:</span>{' '}
              {[
                course.visible_to_global_students && 'Global students',
                course.visible_to_college_students && 'College students',
                course.visible_to_college_admins && 'College admins',
              ]
                .filter(Boolean)
                .join(', ') || 'None'}
            </p>
          </CardContent>
        </Card>

        <CurriculumCard
          stats={stats}
          unpublishedLessonCount={unpublishedLessonCount}
          itemsByModule={itemsByModule}
          videoAssetsByItemId={videoAssetsByItemId}
          pending={pending}
          onSyncTpAssets={handleSyncTpAssets}
          onPublishAllLessons={handlePublishAllLessons}
          onEditLesson={openLessonEdit}
          onRemoveLesson={(lesson) => setLessonToRemove(lesson)}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="size-4 text-red-600" />
              YouTube Import
            </CardTitle>
            <CardDescription>Import lectures from YouTube playlists.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={`/free-courses/${course.id}/youtube-import`}>
                <Youtube className="mr-2 size-4" />
                Import from YouTube
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="size-4 text-primary" />
              Premium TPStreams Lectures
            </CardTitle>
            <CardDescription>Upload platform-hosted premium lectures.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href={`/free-courses/${course.id}/tpstreams-upload`}>
                <Video className="mr-2 size-4" />
                Add Premium Lectures
              </Link>
            </Button>
          </CardContent>
        </Card>

      </div>

      <CourseEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        course={course}
        thumbnailUrl={thumbnailUrl}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        onSubmit={handleEditSubmit}
        pending={pending}
      />

      <LessonEditDialog
        open={lessonEditOpen}
        onOpenChange={setLessonEditOpen}
        editingLesson={editingLesson}
        lessonForm={lessonForm}
        onFormChange={setLessonForm}
        onSubmit={handleLessonEditSubmit}
        pending={pending}
      />

      <AlertDialog open={!!lessonToRemove} onOpenChange={(open) => !open && setLessonToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &quot;{lessonToRemove?.title}&quot; from the course curriculum.
              {lessonToRemove?.video_source === 'tpstreams'
                ? ' The TPStreams video asset is kept in the library (not deleted from TPStreams).'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveLesson}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
