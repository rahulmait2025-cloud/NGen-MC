'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getCourseLinkedWorkspaceSummaryAction,
  getCourseLinkedModuleResourcesAction,
  getNoteDeletePreviewAction,
  deleteNoteCollectionDeepAction,
  createAndLinkVideoNoteAction,
  unlinkVideoNoteAction,
  createVideoExcalidrawResourceAction,
  updateVideoExcalidrawResourceAction,
  deleteVideoExcalidrawResourceAction,
  publishNoteCollectionAction,
  unpublishNoteCollectionAction,
  setExcalidrawResourceVisibilityAction,
  publishCourseLinkedResourcesAction,
  unpublishCourseLinkedResourcesAction,
} from '@/app/(app)/notes/notes-actions';
import {
  Loader2,
  FolderOpen,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import {
  SummaryCounts,
  ModuleSummary,
  LinkedNoteInfo,
  ExcalidrawResourceInfo,
  DeepDeletePreviewInfo,
  ModuleVideoItem,
  generateSlug,
} from './course-linked/types';
import { ModuleCard } from './course-linked/module-card';
import {
  CreateNoteDialog,
  UnlinkConfirmDialog,
  ManageExcalidrawDialog,
  RemoveExcalidrawDialog,
  UnpublishAllConfirmDialog,
  DeepDeleteNoteDialog,
} from './course-linked/dialogs';

type Props = {
  courseId: string;
  courseTitle: string;
};

export default function CourseLinkedNotesManager({ courseId, courseTitle: _courseTitle }: Props) {
  const router = useRouter();

  // Root data loading states
  const [courseInfo, setCourseInfo] = useState<{ title: string; code: string | null } | null>(null);
  const [curriculum, setCurriculum] = useState<ModuleSummary[]>([]);
  const [summary, setSummary] = useState<SummaryCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Granular cache states for modules
  const [loadedModules, setLoadedModules] = useState<Set<string>>(new Set());
  const [moduleVideos, setModuleVideos] = useState<Record<string, ModuleVideoItem[]>>({});
  const [moduleNotes, setModuleNotes] = useState<Record<string, LinkedNoteInfo[]>>({});
  const [moduleExcalidraw, setModuleExcalidraw] = useState<Record<string, Record<string, ExcalidrawResourceInfo[]>>>({});
  const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);

  // Create Notes dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creatingFor, setCreatingFor] = useState<{
    moduleId: string;
    moduleTitle: string;
    itemId: string;
    itemTitle: string;
  } | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteSlug, setNoteSlug] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Unlink confirmation state
  const [unlinkDialogOpen, setUnlinkDialogOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkingTarget, setUnlinkingTarget] = useState<{
    linkId: string;
    noteCollectionId: string;
    noteTitle: string;
    moduleId: string;
  } | null>(null);

  // Excalidraw dialog state
  const [excalidrawDialogOpen, setExcalidrawDialogOpen] = useState(false);
  const [excalidrawMode, setExcalidrawMode] = useState<'create' | 'edit'>('create');
  const [excalidrawFor, setExcalidrawFor] = useState<{
    moduleId: string;
    moduleTitle: string;
    itemId: string;
    itemTitle: string;
    resourceId?: string;
  } | null>(null);
  const [excalidrawTitle, setExcalidrawTitle] = useState('');
  const [excalidrawSubtitle, setExcalidrawSubtitle] = useState('');
  const [excalidrawUrl, setExcalidrawUrl] = useState('');
  const [excalidrawSaving, setExcalidrawSaving] = useState(false);

  // Remove Excalidraw confirmation state
  const [removeExcalidrawDialogOpen, setRemoveExcalidrawDialogOpen] = useState(false);
  const [removingExcalidraw, setRemovingExcalidraw] = useState(false);
  const [removingExcalidrawTarget, setRemovingExcalidrawTarget] = useState<{
    resourceId: string;
    title: string;
    moduleId: string;
  } | null>(null);

  // Deep deletion flow state
  const [deepDeleteDialogOpen, setDeepDeleteDialogOpen] = useState(false);
  const [deepDeletingTarget, setDeepDeletingTarget] = useState<string | null>(null);
  const [deepDeletePreview, setDeepDeletePreview] = useState<DeepDeletePreviewInfo | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deepDeleting, setDeepDeleting] = useState(false);
  const [deleteSourceModuleId, setDeleteSourceModuleId] = useState<string | null>(null);

  // Bulk actions states
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [bulkUnpublishing, setBulkUnpublishing] = useState(false);
  const [unpublishConfirmOpen, setUnpublishConfirmOpen] = useState(false);

  // Publishing / visibility loading states per note
  const [publishingNoteId, setPublishingNoteId] = useState<string | null>(null);
  const [togglingExcalidrawId, setTogglingExcalidrawId] = useState<string | null>(null);

  // ─── Data Ingestion & Caching ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const summaryResult = await getCourseLinkedWorkspaceSummaryAction(courseId);
      if (!summaryResult.ok) {
        throw new Error(summaryResult.error || 'Failed to fetch course curriculum summary');
      }

      const summaryData = summaryResult.data as {
        course: { title: string; code: string | null };
        modules: ModuleSummary[];
        totals: SummaryCounts;
      };

      setCourseInfo(summaryData.course);
      setCurriculum(summaryData.modules);
      setSummary(summaryData.totals);

      // Keep open expanded modules if any exist
      setExpandedModules((prev) => {
        const next = new Set<string>();
        for (const m of summaryData.modules) {
          if (prev.has(m.id)) next.add(m.id);
        }
        return next;
      });
    } catch (err) {
      console.error('[fetchData] Error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast.error('Failed to load curriculum structure');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const refetchModule = useCallback(async (moduleId: string) => {
    try {
      const res = await getCourseLinkedModuleResourcesAction(courseId, moduleId);
      if (!res.ok) {
        throw new Error(res.error || `Failed to fetch resources for module ${moduleId}`);
      }

      const data = res.data as {
        videos: ModuleVideoItem[];
        notes: LinkedNoteInfo[];
        excalidrawMap: Record<string, ExcalidrawResourceInfo[]>;
      };

      // 1. Update module items caches
      setModuleVideos((prev) => ({ ...prev, [moduleId]: data.videos }));
      setModuleNotes((prev) => ({ ...prev, [moduleId]: data.notes }));
      setModuleExcalidraw((prev) => ({ ...prev, [moduleId]: data.excalidrawMap }));

      // 2. Mark this module as loaded
      setLoadedModules((prev) => {
        const next = new Set(prev);
        next.add(moduleId);
        return next;
      });

      // 3. Update summary counters in module lists
      const moduleNotesCount = data.notes.length;
      const notesPublished = data.notes.filter((n) => n.note_publish_status === 'published').length;
      const notesDraft = moduleNotesCount - notesPublished;

      const allExcalItems = Object.values(data.excalidrawMap || {}).flat();
      const moduleExcalCount = allExcalItems.length;
      const excalPublished = allExcalItems.filter((e) => e.is_visible).length;
      const excalHidden = moduleExcalCount - excalPublished;

      setCurriculum((prev) =>
        prev.map((mod) => {
          if (mod.id === moduleId) {
            return {
              ...mod,
              videoCount: data.videos.length,
              notesCount: {
                total: moduleNotesCount,
                published: notesPublished,
                draft: notesDraft,
              },
              excalidrawCount: {
                total: moduleExcalCount,
                published: excalPublished,
                hidden: excalHidden,
              },
            };
          }
          return mod;
        }),
      );

      // 4. Update overall curriculum summary totals
      const summaryResult = await getCourseLinkedWorkspaceSummaryAction(courseId);
      if (summaryResult.ok && summaryResult.data) {
        const summaryData = summaryResult.data as { totals: SummaryCounts };
        setSummary(summaryData.totals);
      }
    } catch (err) {
      console.error(`[refetchModule] Error refetching module ${moduleId}:`, err);
      toast.error('Failed to sync module updates');
    }
  }, [courseId]);

  const loadModuleContents = useCallback(async (moduleId: string) => {
    setLoadingModuleId(moduleId);
    try {
      await refetchModule(moduleId);
    } finally {
      setLoadingModuleId(null);
    }
  }, [refetchModule]);

  const toggleModule = useCallback(async (moduleId: string) => {
    const isExpanded = expandedModules.has(moduleId);

    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });

    if (!isExpanded && !loadedModules.has(moduleId)) {
      await loadModuleContents(moduleId);
    }
  }, [expandedModules, loadedModules, loadModuleContents]);

  // Initial Load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getNoteForItem = useCallback((moduleId: string, itemId: string) => {
    const list = moduleNotes[moduleId] || [];
    return list.find((n) => n.item_id === itemId);
  }, [moduleNotes]);

  const getExcalidrawForItem = useCallback((moduleId: string, itemId: string) => {
    const map = moduleExcalidraw[moduleId] || {};
    return map[itemId] || [];
  }, [moduleExcalidraw]);

  // ─── Create Notes Flow ────────────────────────────────────────────────────

  const openCreateDialog = useCallback(
    (moduleId: string, moduleTitle: string, itemId: string, itemTitle: string) => {
      setCreatingFor({ moduleId, moduleTitle, itemId, itemTitle });
      setNoteTitle(`${itemTitle} - Notes`);
      setNoteSlug(generateSlug(`${itemTitle} - Notes`));
      setNoteDescription('');
      setCreateDialogOpen(true);
    },
    [],
  );

  const handleTitleChange = useCallback((val: string) => {
    setNoteTitle(val);
    setNoteSlug(generateSlug(val));
  }, []);

  const handleCreateNote = useCallback(async () => {
    if (!creatingFor || !noteTitle.trim() || !noteSlug.trim()) return;

    setCreating(true);
    try {
      const fd = new FormData();
      fd.append('title', noteTitle.trim());
      fd.append('slug', noteSlug.trim());
      fd.append('short_description', noteDescription.trim() || '');
      fd.append('course_id', courseId);
      fd.append('module_id', creatingFor.moduleId);
      fd.append('item_id', creatingFor.itemId);

      const result = await createAndLinkVideoNoteAction(fd);

      if (!result.ok) {
        toast.error(result.error || 'Failed to create notes');
        return;
      }

      toast.success('Notes created and linked successfully');
      setCreateDialogOpen(false);
      const activeModuleId = creatingFor.moduleId;
      setCreatingFor(null);

      await refetchModule(activeModuleId);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCreating(false);
    }
  }, [creatingFor, noteTitle, noteSlug, noteDescription, courseId, refetchModule]);

  // ─── Unlink Note Flow ─────────────────────────────────────────────────────

  const openUnlinkDialog = useCallback(
    (linkId: string, noteCollectionId: string, noteTitle: string, moduleId: string) => {
      setUnlinkingTarget({ linkId, noteCollectionId, noteTitle, moduleId });
      setUnlinkDialogOpen(true);
    },
    [],
  );

  const handleUnlink = useCallback(async () => {
    if (!unlinkingTarget) return;

    setUnlinking(true);
    try {
      const fd = new FormData();
      fd.append('link_id', unlinkingTarget.linkId);
      fd.append('note_collection_id', unlinkingTarget.noteCollectionId);
      fd.append('course_id', courseId);

      const result = await unlinkVideoNoteAction(fd);

      if (!result.ok) {
        toast.error(result.error || 'Failed to unlink note');
        return;
      }

      toast.success('Notes unlinked');
      setUnlinkDialogOpen(false);
      const activeModuleId = unlinkingTarget.moduleId;
      setUnlinkingTarget(null);

      await refetchModule(activeModuleId);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setUnlinking(false);
    }
  }, [unlinkingTarget, courseId, refetchModule]);

  // ─── Publish / Unpublish Individual Notes ─────────────────────────────────

  const handlePublishNote = useCallback(async (noteCollectionId: string, moduleId: string) => {
    setPublishingNoteId(noteCollectionId);
    try {
      const result = await publishNoteCollectionAction(noteCollectionId);
      if (!result.ok) {
        toast.error(result.error || 'Failed to publish note');
        return;
      }
      toast.success('Notes published to student portal');
      await refetchModule(moduleId);
    } catch {
      toast.error('Failed to publish notes');
    } finally {
      setPublishingNoteId(null);
    }
  }, [refetchModule]);

  const handleUnpublishNote = useCallback(async (noteCollectionId: string, moduleId: string) => {
    setPublishingNoteId(noteCollectionId);
    try {
      const result = await unpublishNoteCollectionAction(noteCollectionId);
      if (!result.ok) {
        toast.error(result.error || 'Failed to unpublish note');
        return;
      }
      toast.success('Notes unpublished (hidden from students)');
      await refetchModule(moduleId);
    } catch {
      toast.error('Failed to unpublish notes');
    } finally {
      setPublishingNoteId(null);
    }
  }, [refetchModule]);

  // ─── Add/Edit Excalidraw Links Flow ───────────────────────────────────────

  const openCreateExcalidrawDialog = useCallback(
    (moduleId: string, moduleTitle: string, itemId: string, itemTitle: string) => {
      setExcalidrawFor({ moduleId, moduleTitle, itemId, itemTitle });
      setExcalidrawMode('create');
      setExcalidrawTitle(`${itemTitle} - Whiteboard`);
      setExcalidrawSubtitle('');
      setExcalidrawUrl('');
      setExcalidrawDialogOpen(true);
    },
    [],
  );

  const openEditExcalidrawDialog = useCallback(
    (
      moduleId: string,
      moduleTitle: string,
      itemId: string,
      itemTitle: string,
      resource: ExcalidrawResourceInfo,
    ) => {
      setExcalidrawFor({
        moduleId,
        moduleTitle,
        itemId,
        itemTitle,
        resourceId: resource.resource_item_id,
      });
      setExcalidrawMode('edit');
      setExcalidrawTitle(resource.title);
      setExcalidrawSubtitle(resource.subtitle || '');
      setExcalidrawUrl(resource.excalidraw_url || '');
      setExcalidrawDialogOpen(true);
    },
    [],
  );

  const handleSaveExcalidraw = useCallback(async () => {
    if (!excalidrawFor || !excalidrawTitle.trim() || !excalidrawUrl.trim()) return;

    setExcalidrawSaving(true);
    try {
      const fd = new FormData();
      fd.append('course_id', courseId);
      fd.append('module_id', excalidrawFor.moduleId);
      fd.append('item_id', excalidrawFor.itemId);
      fd.append('title', excalidrawTitle.trim());
      fd.append('subtitle', excalidrawSubtitle.trim() || '');
      fd.append('excalidraw_url', excalidrawUrl.trim());

      let result;
      if (excalidrawMode === 'edit' && excalidrawFor.resourceId) {
        fd.append('resource_id', excalidrawFor.resourceId);
        result = await updateVideoExcalidrawResourceAction(fd);
      } else {
        result = await createVideoExcalidrawResourceAction(fd);
      }

      if (!result.ok) {
        toast.error(result.error || 'Failed to save Excalidraw resource');
        return;
      }

      toast.success(excalidrawMode === 'edit' ? 'Excalidraw updated' : 'Excalidraw added');
      setExcalidrawDialogOpen(false);
      const activeModuleId = excalidrawFor.moduleId;
      setExcalidrawFor(null);

      await refetchModule(activeModuleId);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setExcalidrawSaving(false);
    }
  }, [excalidrawFor, excalidrawTitle, excalidrawSubtitle, excalidrawUrl, excalidrawMode, courseId, refetchModule]);

  // ─── Remove Single Excalidraw Link Flow ───────────────────────────────────

  const openRemoveExcalidrawDialog = useCallback((resourceId: string, title: string, moduleId: string) => {
    setRemovingExcalidrawTarget({ resourceId, title, moduleId });
    setRemoveExcalidrawDialogOpen(true);
  }, []);

  const handleRemoveExcalidraw = useCallback(async () => {
    if (!removingExcalidrawTarget) return;

    setRemovingExcalidraw(true);
    try {
      const fd = new FormData();
      fd.append('resource_id', removingExcalidrawTarget.resourceId);

      const result = await deleteVideoExcalidrawResourceAction(fd);

      if (!result.ok) {
        toast.error(result.error || 'Failed to remove Excalidraw resource');
        return;
      }

      toast.success('Excalidraw removed');
      setRemoveExcalidrawDialogOpen(false);
      const activeModuleId = removingExcalidrawTarget.moduleId;
      setRemovingExcalidrawTarget(null);

      await refetchModule(activeModuleId);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemovingExcalidraw(false);
    }
  }, [removingExcalidrawTarget, refetchModule]);

  // ─── Deep Delete Note Collection Flow ─────────────────────────────────────

  const openDeepDeleteDialog = useCallback(async (noteCollectionId: string, moduleId: string) => {
    setDeepDeletingTarget(noteCollectionId);
    setDeleteSourceModuleId(moduleId);
    setConfirmDeleteText('');
    setDeepDeleteDialogOpen(true);
    setLoadingPreview(true);
    try {
      const res = await getNoteDeletePreviewAction(noteCollectionId);
      if (res.ok && res.data) {
        setDeepDeletePreview(res.data as DeepDeletePreviewInfo);
      } else {
        toast.error(res.error || 'Failed to fetch delete preview');
        setDeepDeleteDialogOpen(false);
      }
    } catch {
      toast.error('Failed to fetch delete preview');
      setDeepDeleteDialogOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleDeepDelete = useCallback(async () => {
    if (!deepDeletingTarget || confirmDeleteText !== 'DELETE') return;

    setDeepDeleting(true);
    try {
      const res = await deleteNoteCollectionDeepAction(deepDeletingTarget, confirmDeleteText);
      if (res.ok) {
        toast.success('Note collection and its related course resources deleted permanently');
        setDeepDeleteDialogOpen(false);
        setDeepDeletingTarget(null);
        setDeepDeletePreview(null);
        if (deleteSourceModuleId) {
          await refetchModule(deleteSourceModuleId);
        } else {
          await fetchData();
        }
      } else {
        toast.error(res.error || 'Failed to delete note collection');
      }
    } catch {
      toast.error('Something went wrong during deletion');
    } finally {
      setDeepDeleting(false);
    }
  }, [deepDeletingTarget, confirmDeleteText, deleteSourceModuleId, refetchModule, fetchData]);

  // ─── Excalidraw Resource Visibility Toggle ────────────────────────────────

  const handleToggleExcalidrawVisibility = useCallback(
    async (resourceId: string, currentVisible: boolean, moduleId: string) => {
      setTogglingExcalidrawId(resourceId);
      try {
        const result = await setExcalidrawResourceVisibilityAction(resourceId, !currentVisible);
        if (!result.ok) {
          toast.error(result.error || 'Failed to update whiteboard visibility');
          return;
        }

        toast.success(!currentVisible ? 'Excalidraw published to LMS' : 'Excalidraw hidden from LMS');
        await refetchModule(moduleId);
      } catch {
        toast.error('Failed to update visibility status');
      } finally {
        setTogglingExcalidrawId(null);
      }
    },
    [refetchModule],
  );

  // ─── Bulk Course publishing Actions ───────────────────────────────────────

  const handleBulkPublish = useCallback(async () => {
    setBulkPublishing(true);
    try {
      const result = await publishCourseLinkedResourcesAction(courseId);
      if (!result.ok) {
        toast.error(result.error || 'Failed to publish course materials');
        return;
      }
      toast.success('All linked notes and whiteboards published to students');
      await fetchData();

      // Refresh currently open loaded modules to sync local status badge state
      for (const mId of Array.from(loadedModules)) {
        await refetchModule(mId);
      }
    } catch {
      toast.error('Failed to run bulk publish operation');
    } finally {
      setBulkPublishing(false);
    }
  }, [courseId, loadedModules, fetchData, refetchModule]);

  const handleBulkUnpublish = useCallback(async () => {
    setBulkUnpublishing(true);
    try {
      const result = await unpublishCourseLinkedResourcesAction(courseId);
      if (!result.ok) {
        toast.error(result.error || 'Failed to unpublish course materials');
        return;
      }
      toast.success('All linked materials unpublished successfully');
      setUnpublishConfirmOpen(false);
      await fetchData();

      // Refresh currently open loaded modules to sync local status badge state
      for (const mId of Array.from(loadedModules)) {
        await refetchModule(mId);
      }
    } catch {
      toast.error('Failed to run bulk unpublish operation');
    } finally {
      setBulkUnpublishing(false);
    }
  }, [courseId, loadedModules, fetchData, refetchModule]);

  // ─── Computations ─────────────────────────────────────────────────────────

  const nothingToPublish = !summary || (summary.notes.total === 0 && summary.excalidraw.total === 0);
  const hasDraftOrHidden = summary && (summary.notes.draft > 0 || summary.excalidraw.hidden > 0);
  const hasAnyPublished = summary && (summary.notes.published > 0 || summary.excalidraw.published > 0);

  // ─── Render UI ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="size-5 text-primary" />
                Course Curriculum Notes & Excalidraw
              </CardTitle>
              {courseInfo && (
                <p className="text-sm font-semibold text-primary/95 mt-1">
                  Active Course: {courseInfo.title} {courseInfo.code ? `(${courseInfo.code})` : ''}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-0.5">
                Create and manage notes and Excalidraw whiteboards for each module/video in this course.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Publishing makes linked notes and Excalidraw resources available to students with active course access.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {nothingToPublish ? (
                <Button size="sm" variant="outline" disabled>
                  Nothing to publish yet
                </Button>
              ) : hasDraftOrHidden ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={bulkPublishing || loading}
                  onClick={handleBulkPublish}
                >
                  {bulkPublishing ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                  Publish to LMS
                </Button>
              ) : hasAnyPublished ? (
                <div className="h-8 inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 select-none">
                  <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  Published to LMS
                </div>
              ) : (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={bulkPublishing || loading}
                  onClick={handleBulkPublish}
                >
                  {bulkPublishing ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                  Publish to LMS
                </Button>
              )}
              {hasAnyPublished ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-300"
                  disabled={bulkPublishing || bulkUnpublishing || loading}
                  onClick={() => setUnpublishConfirmOpen(true)}
                >
                  {bulkUnpublishing ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                  Unpublish All
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`size-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Course-level Summary Counters */}
      {!loading && !error && summary && curriculum.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center text-xs px-1">
          <div className="flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1 border border-border/40">
            <span className="font-medium text-muted-foreground">Notes:</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span className="text-foreground/90 font-medium">{summary.notes.published}</span>
              <span className="text-muted-foreground/80 text-[10px]">published</span>
            </span>
            <span className="h-3 w-px bg-border/60" />
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span className="text-foreground/90 font-medium">{summary.notes.draft}</span>
              <span className="text-muted-foreground/80 text-[10px]">draft</span>
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-muted/40 px-3 py-1 border border-border/40">
            <span className="font-medium text-muted-foreground">Excalidraw:</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-violet-500" />
              <span className="text-foreground/90 font-medium">{summary.excalidraw.published}</span>
              <span className="text-muted-foreground/80 text-[10px]">published</span>
            </span>
            <span className="h-3 w-px bg-border/60" />
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              <span className="text-foreground/90 font-medium">{summary.excalidraw.hidden}</span>
              <span className="text-muted-foreground/80 text-[10px]">hidden</span>
            </span>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && curriculum.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading workspace curriculum...
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex items-center gap-2 text-sm text-destructive py-4 px-4 rounded-lg border border-destructive/20 bg-destructive/5">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && curriculum.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 px-4 rounded-lg border border-dashed">
          <FolderOpen className="size-4 shrink-0" /> No modules found for this course.
        </div>
      )}

      {/* Curriculum Tree */}
      {curriculum.length > 0 && (
        <div className="space-y-2">
          {curriculum.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              isExpanded={expandedModules.has(mod.id)}
              isLoading={loadingModuleId === mod.id}
              isLoaded={loadedModules.has(mod.id)}
              videoItems={moduleVideos[mod.id] || []}
              onToggle={() => toggleModule(mod.id)}
              getNoteForItem={(itemId) => getNoteForItem(mod.id, itemId)}
              getExcalidrawForItem={(itemId) => getExcalidrawForItem(mod.id, itemId)}
              publishingNoteId={publishingNoteId}
              togglingExcalidrawId={togglingExcalidrawId}
              onEditPages={(noteCollectionId) => router.push(`/notes/${noteCollectionId}/edit?tab=pages`)}
              onPublishNotes={handlePublishNote}
              onUnpublishNotes={handleUnpublishNote}
              onUnlinkNotes={openUnlinkDialog}
              onDeleteNotes={openDeepDeleteDialog}
              onAddNotes={(itemId, itemTitle) => openCreateDialog(mod.id, mod.title, itemId, itemTitle)}
              onAddExcalidraw={(itemId, itemTitle) => openCreateExcalidrawDialog(mod.id, mod.title, itemId, itemTitle)}
              onManageExcalidraw={(itemId, itemTitle, resource) =>
                openEditExcalidrawDialog(mod.id, mod.title, itemId, itemTitle, resource)
              }
              onToggleExcalidrawVisibility={handleToggleExcalidrawVisibility}
              onRemoveExcalidraw={openRemoveExcalidrawDialog}
            />
          ))}
        </div>
      )}

      {/* dialog panels */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        itemTitle={creatingFor?.itemTitle ?? ''}
        moduleTitle={creatingFor?.moduleTitle ?? ''}
        noteTitle={noteTitle}
        noteSlug={noteSlug}
        noteDescription={noteDescription}
        creating={creating}
        onTitleChange={handleTitleChange}
        onSlugChange={setNoteSlug}
        onDescriptionChange={setNoteDescription}
        onCreate={handleCreateNote}
      />

      <UnlinkConfirmDialog
        open={unlinkDialogOpen}
        onOpenChange={setUnlinkDialogOpen}
        noteTitle={unlinkingTarget?.noteTitle ?? ''}
        unlinking={unlinking}
        onConfirm={handleUnlink}
      />

      <ManageExcalidrawDialog
        open={excalidrawDialogOpen}
        onOpenChange={setExcalidrawDialogOpen}
        mode={excalidrawMode}
        itemTitle={excalidrawFor?.itemTitle ?? ''}
        moduleTitle={excalidrawFor?.moduleTitle ?? ''}
        title={excalidrawTitle}
        subtitle={excalidrawSubtitle}
        url={excalidrawUrl}
        saving={excalidrawSaving}
        onTitleChange={setExcalidrawTitle}
        onSubtitleChange={setExcalidrawSubtitle}
        onUrlChange={setExcalidrawUrl}
        onSave={handleSaveExcalidraw}
      />

      <RemoveExcalidrawDialog
        open={removeExcalidrawDialogOpen}
        onOpenChange={setRemoveExcalidrawDialogOpen}
        title={removingExcalidrawTarget?.title ?? ''}
        removing={removingExcalidraw}
        onConfirm={handleRemoveExcalidraw}
      />

      <UnpublishAllConfirmDialog
        open={unpublishConfirmOpen}
        onOpenChange={setUnpublishConfirmOpen}
        unpublishing={bulkUnpublishing}
        onConfirm={handleBulkUnpublish}
      />

      <DeepDeleteNoteDialog
        open={deepDeleteDialogOpen}
        onOpenChange={setDeepDeleteDialogOpen}
        loadingPreview={loadingPreview}
        preview={deepDeletePreview}
        confirmText={confirmDeleteText}
        deleting={deepDeleting}
        onConfirmTextChange={setConfirmDeleteText}
        onConfirm={handleDeepDelete}
      />
    </div>
  );
}
