'use client';

import { useCallback, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  File,
  Link2,
  Trash2,
  Loader2,
  Download,
  Pencil,
  Unlink,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  deleteResourceAction,
  getResourceSignedUrlAction,
  unattachResourceAction,
  promoteResourceToCurriculumAction,
  relocateCurriculumResourceAction,
  linkExistingResourceToLessonAction,
} from '@/app/(app)/master-courses/[courseId]/course-resources-actions';
import type { CourseResourceWithItem, MasterCourseItemsRow } from '@/types/database';

interface ResourceListProps {
  resources: CourseResourceWithItem[];
  courseId: string;
  moduleId: string;
  items: MasterCourseItemsRow[];
  context?: 'pillar' | 'bootcamp';
  bootcampId?: string;
  onEdit?: (resource: CourseResourceWithItem) => void;
  onRefresh?: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  markdown: <FileText className="size-4 text-blue-500" />,
  pdf: <File className="size-4 text-red-500" />,
  external_link: <Link2 className="size-4 text-emerald-500" />,
};

const TYPE_LABELS: Record<string, string> = {
  markdown: 'Note',
  pdf: 'PDF',
  external_link: 'Link',
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  markdown: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  pdf: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  external_link: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
};

/** Quiz-style placement label for a curriculum resource item. */
function getResourcePlacementLabel(
  curriculumItem: MasterCourseItemsRow,
  moduleItems: MasterCourseItemsRow[],
): string {
  const metadata = (curriculumItem.metadata ?? {}) as Record<string, unknown>;
  const linkedId =
    (typeof metadata.linked_video_id === 'string' && metadata.linked_video_id.trim()
      ? metadata.linked_video_id
      : null) ??
    (typeof metadata.linked_item_id === 'string' && metadata.linked_item_id.trim()
      ? metadata.linked_item_id
      : null);
  const explicitPlacement =
    typeof metadata.placement === 'string' ? metadata.placement : null;
  const sort = curriculumItem.sort_order ?? 0;

  if (linkedId || explicitPlacement === 'after_video') {
    const ref = linkedId ? moduleItems.find((i) => i.id === linkedId) : null;
    return ref ? `After: ${ref.title}` : 'After linked lesson';
  }

  if (explicitPlacement === 'before_item' && linkedId) {
    const ref = moduleItems.find((i) => i.id === linkedId);
    return ref ? `Before: ${ref.title}` : 'Before linked lesson';
  }

  if (explicitPlacement === 'end' || sort >= 999999) {
    return 'End of module';
  }

  if (explicitPlacement === 'start') {
    return 'Start of module';
  }

  const sorted = [...moduleItems].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const idx = sorted.findIndex((i) => i.id === curriculumItem.id);
  if (idx <= 0) return 'Start of module';

  const prev = sorted[idx - 1];
  return `After: ${prev.title}`;
}

type DeleteState = {
  deletingId: string | null;
  confirmId: string | null;
  confirmTitle: string;
};
type DeleteAction =
  | { type: 'CONFIRM'; id: string; title: string }
  | { type: 'CANCEL' }
  | { type: 'DELETE_START'; id: string }
  | { type: 'DELETE_END' };

function deleteReducer(state: DeleteState, action: DeleteAction): DeleteState {
  switch (action.type) {
    case 'CONFIRM': return { ...state, confirmId: action.id, confirmTitle: action.title };
    case 'CANCEL': return { ...state, confirmId: null, confirmTitle: '' };
    case 'DELETE_START': return { ...state, deletingId: action.id, confirmId: null, confirmTitle: '' };
    case 'DELETE_END': return { ...state, deletingId: null };
  }
}

type PromoteState = {
  resourceId: string | null;
  placement: string;
  refItemId: string;
  isPromoting: boolean;
};
type PromoteAction =
  | { type: 'OPEN'; id: string }
  | { type: 'CLOSE' }
  | { type: 'SET_PLACEMENT'; value: string }
  | { type: 'SET_REF_ITEM'; value: string }
  | { type: 'PROMOTE_START' }
  | { type: 'PROMOTE_END' };

function promoteReducer(state: PromoteState, action: PromoteAction): PromoteState {
  switch (action.type) {
    case 'OPEN': return { ...state, resourceId: action.id, placement: 'end', refItemId: '' };
    case 'CLOSE': return { resourceId: null, placement: 'end', refItemId: '', isPromoting: false };
    case 'SET_PLACEMENT': return { ...state, placement: action.value };
    case 'SET_REF_ITEM': return { ...state, refItemId: action.value };
    case 'PROMOTE_START': return { ...state, isPromoting: true };
    case 'PROMOTE_END': return { ...state, isPromoting: false };
  }
}

type RelocateState = {
  resourceId: string | null;
  mode: 'curriculum' | 'attachment' | null;
  placement: string;
  refItemId: string;
  isSaving: boolean;
};
type RelocateAction =
  | { type: 'OPEN_CURRICULUM'; id: string; placement?: string; refItemId?: string }
  | { type: 'OPEN_ATTACHMENT'; id: string; videoId?: string }
  | { type: 'CLOSE' }
  | { type: 'SET_PLACEMENT'; value: string }
  | { type: 'SET_REF_ITEM'; value: string }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' };

function relocateReducer(state: RelocateState, action: RelocateAction): RelocateState {
  switch (action.type) {
    case 'OPEN_CURRICULUM':
      return {
        resourceId: action.id,
        mode: 'curriculum',
        placement: action.placement ?? 'after',
        refItemId: action.refItemId ?? '',
        isSaving: false,
      };
    case 'OPEN_ATTACHMENT':
      return {
        resourceId: action.id,
        mode: 'attachment',
        placement: 'after',
        refItemId: action.videoId ?? '',
        isSaving: false,
      };
    case 'CLOSE':
      return { resourceId: null, mode: null, placement: 'after', refItemId: '', isSaving: false };
    case 'SET_PLACEMENT':
      return { ...state, placement: action.value };
    case 'SET_REF_ITEM':
      return { ...state, refItemId: action.value };
    case 'SAVE_START':
      return { ...state, isSaving: true };
    case 'SAVE_END':
      return { ...state, isSaving: false };
  }
}

interface ResourceListContentProps {
  resources: CourseResourceWithItem[];
  moduleId: string;
  items: MasterCourseItemsRow[];
  deleteState: DeleteState;
  promoteState: PromoteState;
  relocateState: RelocateState;
  dispatchDelete: React.Dispatch<DeleteAction>;
  dispatchPromote: React.Dispatch<PromoteAction>;
  dispatchRelocate: React.Dispatch<RelocateAction>;
  handleDownload: (resource: CourseResourceWithItem) => Promise<void>;
  handleUnattach: (resourceId: string) => Promise<void>;
  handleDelete: (resourceId: string) => Promise<void>;
  handlePromote: () => Promise<void>;
  handleRelocate: () => Promise<void>;
  onEdit?: (resource: CourseResourceWithItem) => void;
}

function ResourceListContent({
  resources, moduleId, items, deleteState, promoteState, relocateState,
  dispatchDelete, dispatchPromote, dispatchRelocate, handleDownload, handleUnattach, handleDelete, handlePromote, handleRelocate, onEdit,
}: ResourceListContentProps) {
  const moduleItems = items
    .filter((item) => item.module_id === moduleId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const moduleVideos = moduleItems.filter((item) => item.item_type === 'video');
  const relocateResource = relocateState.resourceId
    ? resources.find((r) => r.id === relocateState.resourceId) ?? null
    : null;
  const relocateCurriculumItem = relocateResource
    ? items.find((item) => item.resource_id === relocateResource.id) ?? null
    : null;
  const placementRefOptions = moduleItems.filter(
    (item) => item.id !== relocateCurriculumItem?.id,
  );

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted/50 mb-2.5">
          <FileText className="size-5 text-muted-foreground/60" />
        </div>
        <p className="text-[13px] font-medium text-muted-foreground">No resources yet</p>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">Add notes, PDFs, or link existing resources</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-border/40 bg-background/50 overflow-hidden">
        {resources.map((resource, index) => {
          const curriculumItem = items.find((item) => item.resource_id === resource.id) ?? null;
          const isVideoAttachment =
            resource.resource_scope === 'lesson_attachment' &&
            (!!resource.parent_item_id || !!resource.attached_item_title);
          const placementLabel = curriculumItem
            ? getResourcePlacementLabel(curriculumItem, moduleItems)
            : null;
          const isAfterPlacement = !!placementLabel?.startsWith('After:');

          return (
          <div
            key={resource.id}
            className={`group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/30 ${
              index < resources.length - 1 ? 'border-b border-border/30' : ''
            }`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
              {TYPE_ICONS[resource.resource_type] ?? <FileText className="size-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium text-foreground">{resource.title}</p>
                <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_BADGE_STYLES[resource.resource_type] ?? 'bg-muted text-muted-foreground'}`}>
                  {TYPE_LABELS[resource.resource_type] ?? resource.resource_type}
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  className="inline-flex max-w-full items-center rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Click to copy resource id"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(resource.id);
                      toast.success('Resource id copied');
                    } catch {
                      toast.error('Could not copy id');
                    }
                  }}
                >
                  <span className="truncate">id {resource.id.slice(0, 8)}</span>
                </button>
                {resource.size_bytes ? (
                  <span className="text-[11px] text-muted-foreground">{(resource.size_bytes / 1024).toFixed(0)} KB</span>
                ) : null}
                {isVideoAttachment ? (
                  <button
                    type="button"
                    className="inline-flex max-w-[240px] items-center gap-1 rounded-md border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-500/10 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400"
                    title="Click to change linked video"
                    onClick={() =>
                      dispatchRelocate({
                        type: 'OPEN_ATTACHMENT',
                        id: resource.id,
                        videoId: resource.parent_item_id ?? moduleVideos[0]?.id ?? '',
                      })
                    }
                  >
                    <Link2 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      Attached to: {resource.attached_item_title?.trim() || 'video'}
                    </span>
                  </button>
                ) : null}
                {curriculumItem && placementLabel ? (
                  <button
                    type="button"
                    className={`inline-flex max-w-[240px] items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      isAfterPlacement
                        ? 'border-sky-500/20 bg-sky-500/5 text-sky-700 hover:bg-sky-500/10 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400'
                        : 'border-violet-500/20 bg-violet-500/5 text-violet-700 hover:bg-violet-500/10 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400'
                    }`}
                    title={`${placementLabel} — click to edit`}
                    onClick={() => {
                      const meta = (curriculumItem.metadata ?? {}) as Record<string, unknown>;
                      const linked =
                        (typeof meta.linked_video_id === 'string' && meta.linked_video_id) ||
                        (typeof meta.linked_item_id === 'string' && meta.linked_item_id) ||
                        '';
                      const sorted = moduleItems;
                      const idx = sorted.findIndex((i) => i.id === curriculumItem.id);
                      const prevId = idx > 0 ? sorted[idx - 1]?.id ?? '' : '';
                      dispatchRelocate({
                        type: 'OPEN_CURRICULUM',
                        id: resource.id,
                        placement: meta.placement === 'end' ? 'end' : meta.placement === 'before_item' ? 'before' : 'after',
                        refItemId: linked || prevId || moduleVideos[0]?.id || '',
                      });
                    }}
                  >
                    <Link2 className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{placementLabel}</span>
                  </button>
                ) : null}
                {!isVideoAttachment && !curriculumItem ? (
                  <span className="inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Not linked
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit?.(resource)}
                aria-label={`Edit ${resource.title}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              {curriculumItem ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    const meta = (curriculumItem.metadata ?? {}) as Record<string, unknown>;
                    const linked =
                      (typeof meta.linked_video_id === 'string' && meta.linked_video_id) ||
                      (typeof meta.linked_item_id === 'string' && meta.linked_item_id) ||
                      '';
                    dispatchRelocate({
                      type: 'OPEN_CURRICULUM',
                      id: resource.id,
                      placement: meta.placement === 'end' ? 'end' : meta.placement === 'before_item' ? 'before' : 'after',
                      refItemId: linked || moduleVideos[0]?.id || '',
                    });
                  }}
                  aria-label={`Edit placement for ${resource.title}`}
                  title="Edit curriculum placement"
                >
                  <Link2 className="size-3.5" />
                </Button>
              ) : null}
              {isVideoAttachment ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    dispatchRelocate({
                      type: 'OPEN_ATTACHMENT',
                      id: resource.id,
                      videoId: resource.parent_item_id ?? moduleVideos[0]?.id ?? '',
                    })
                  }
                  aria-label={`Change video link for ${resource.title}`}
                  title="Change linked video"
                >
                  <Link2 className="size-3.5" />
                </Button>
              ) : null}
              {resource.storage_path && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleDownload(resource)}
                  aria-label={`Download ${resource.title}`}
                >
                  <Download className="size-3.5" />
                </Button>
              )}
              {resource.resource_scope === 'lesson_attachment' && resource.parent_item_id && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleUnattach(resource.id)}
                  aria-label={`Detach from ${resource.attached_item_title ?? 'video'}`}
                  title="Detach from video"
                >
                  <Unlink className="size-3.5" />
                </Button>
              )}
              {resource.resource_scope !== 'module_item' && !curriculumItem && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => dispatchPromote({ type: 'OPEN', id: resource.id })}
                  aria-label={`Publish ${resource.title} as curriculum item`}
                  title="Publish as curriculum item"
                >
                  <BookOpen className="size-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 text-muted-foreground hover:text-destructive"
                disabled={deleteState.deletingId === resource.id}
                onClick={() => dispatchDelete({ type: 'CONFIRM', id: resource.id, title: resource.title })}
                aria-label={`Delete ${resource.title}`}
              >
                {deleteState.deletingId === resource.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteState.confirmId} onOpenChange={() => dispatchDelete({ type: 'CANCEL' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteState.confirmTitle}</strong>? This will permanently remove it from the course.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteState.confirmId && handleDelete(deleteState.confirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!promoteState.resourceId}
        onOpenChange={(v) => {
          if (!v) dispatchPromote({ type: 'CLOSE' });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Publish as Curriculum Item</DialogTitle>
            <DialogDescription>
              This resource will appear as a separate lesson in the course curriculum that students can navigate to independently.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Placement *</Label>
              <RadioGroup value={promoteState.placement} onValueChange={(v) => dispatchPromote({ type: 'SET_PLACEMENT', value: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="end" id="promote-end" />
                  <Label htmlFor="promote-end" className="font-normal cursor-pointer">End of module</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="before" id="promote-before" />
                  <Label htmlFor="promote-before" className="font-normal cursor-pointer">Before item</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="after" id="promote-after" />
                  <Label htmlFor="promote-after" className="font-normal cursor-pointer">After item</Label>
                </div>
              </RadioGroup>
            </div>

            {promoteState.placement !== 'end' && (
              <div className="space-y-1.5">
                <Label>Select Item *</Label>
                <Select value={promoteState.refItemId} onValueChange={(v) => dispatchPromote({ type: 'SET_REF_ITEM', value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {items.length === 0 ? (
                      <SelectItem value="none" disabled>No items in this module</SelectItem>
                    ) : (
                      items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => dispatchPromote({ type: 'CLOSE' })} disabled={promoteState.isPromoting}>Cancel</Button>
            <Button
              disabled={promoteState.placement !== 'end' && !promoteState.refItemId || promoteState.isPromoting}
              onClick={handlePromote}
            >
              {promoteState.isPromoting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!relocateState.resourceId}
        onOpenChange={(v) => {
          if (!v) dispatchRelocate({ type: 'CLOSE' });
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {relocateState.mode === 'attachment' ? 'Change Linked Video' : 'Edit Curriculum Placement'}
            </DialogTitle>
            <DialogDescription>
              {relocateState.mode === 'attachment'
                ? 'Attach this resource under a different video lesson.'
                : 'Move this resource before/after another lesson, or to the end of the module — same as quizzes.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {relocateState.mode === 'attachment' ? (
              <div className="space-y-1.5">
                <Label>Video *</Label>
                <Select
                  value={relocateState.refItemId}
                  onValueChange={(v) => dispatchRelocate({ type: 'SET_REF_ITEM', value: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a video" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {moduleVideos.length === 0 ? (
                      <SelectItem value="none" disabled>No videos in this module</SelectItem>
                    ) : (
                      moduleVideos.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Placement *</Label>
                  <RadioGroup
                    value={relocateState.placement}
                    onValueChange={(v) => dispatchRelocate({ type: 'SET_PLACEMENT', value: v })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="after" id="relocate-after" />
                      <Label htmlFor="relocate-after" className="font-normal cursor-pointer">After item</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="before" id="relocate-before" />
                      <Label htmlFor="relocate-before" className="font-normal cursor-pointer">Before item</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="end" id="relocate-end" />
                      <Label htmlFor="relocate-end" className="font-normal cursor-pointer">End of module</Label>
                    </div>
                  </RadioGroup>
                </div>

                {relocateState.placement !== 'end' && (
                  <div className="space-y-1.5">
                    <Label>Select Item *</Label>
                    <Select
                      value={relocateState.refItemId}
                      onValueChange={(v) => dispatchRelocate({ type: 'SET_REF_ITEM', value: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an item" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {placementRefOptions.length === 0 ? (
                          <SelectItem value="none" disabled>No items in this module</SelectItem>
                        ) : (
                          placementRefOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item_type === 'video' ? `🎬 ${item.title}` : item.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => dispatchRelocate({ type: 'CLOSE' })}
              disabled={relocateState.isSaving}
            >
              Cancel
            </Button>
            <Button
              disabled={
                relocateState.isSaving ||
                (relocateState.mode === 'attachment' && !relocateState.refItemId) ||
                (relocateState.mode === 'curriculum' &&
                  relocateState.placement !== 'end' &&
                  !relocateState.refItemId)
              }
              onClick={handleRelocate}
            >
              {relocateState.isSaving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Save placement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ResourceList({
  resources,
  courseId: _courseId,
  moduleId,
  items,
  context: _context = 'pillar',
  bootcampId: _bootcampId,
  onEdit,
  onRefresh,
}: ResourceListProps) {
  const router = useRouter();
  const [deleteState, dispatchDelete] = useReducer(deleteReducer, { deletingId: null, confirmId: null, confirmTitle: '' } as DeleteState);
  const [promoteState, dispatchPromote] = useReducer(promoteReducer, { resourceId: null, placement: 'end', refItemId: '', isPromoting: false } as PromoteState);
  const [relocateState, dispatchRelocate] = useReducer(relocateReducer, {
    resourceId: null,
    mode: null,
    placement: 'after',
    refItemId: '',
    isSaving: false,
  } as RelocateState);

  const handleDelete = useCallback(
    async (resourceId: string) => {
      dispatchDelete({ type: 'DELETE_START', id: resourceId });
      try {
        const fd = new FormData();
        fd.append('resource_id', resourceId);
        const res = await deleteResourceAction(fd);
        if (res.ok) {
          toast.success('Resource deleted');
          onRefresh?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to delete resource');
        }
      } finally {
        dispatchDelete({ type: 'DELETE_END' });
      }
    },
    [onRefresh, router],
  );

  const handleDownload = useCallback(async (resource: CourseResourceWithItem) => {
    if (resource.storage_path) {
      const res = await getResourceSignedUrlAction(resource.storage_path);
      if (res.ok && res.data) {
        window.open(res.data.signedUrl, '_blank');
      }
    } else if (resource.external_url) {
      window.open(resource.external_url, '_blank');
    }
  }, []);

  const handleUnattach = useCallback(
    async (resourceId: string) => {
      try {
        const fd = new FormData();
        fd.append('resource_id', resourceId);
        const res = await unattachResourceAction(fd);
        if (res.ok) {
          toast.success('Resource detached from video');
          onRefresh?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to detach resource');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    },
    [onRefresh, router],
  );

  const handlePromote = useCallback(async () => {
    if (!promoteState.resourceId) return;
    dispatchPromote({ type: 'PROMOTE_START' });
    try {
      const fd = new FormData();
      fd.append('resource_id', promoteState.resourceId);
      fd.append('placement', promoteState.placement);
      if (promoteState.placement !== 'end' && promoteState.refItemId) {
        fd.append('reference_item_id', promoteState.refItemId);
      }
      const res = await promoteResourceToCurriculumAction(fd);
      if (res.ok) {
        toast.success('Resource published as curriculum item');
        dispatchPromote({ type: 'CLOSE' });
        onRefresh?.();
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to publish resource');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      dispatchPromote({ type: 'PROMOTE_END' });
    }
  }, [promoteState.resourceId, promoteState.placement, promoteState.refItemId, onRefresh, router]);

  const handleRelocate = useCallback(async () => {
    if (!relocateState.resourceId || !relocateState.mode) return;
    dispatchRelocate({ type: 'SAVE_START' });
    try {
      if (relocateState.mode === 'attachment') {
        const fd = new FormData();
        fd.append('resource_id', relocateState.resourceId);
        fd.append('item_id', relocateState.refItemId);
        const res = await linkExistingResourceToLessonAction(fd);
        if (res.ok) {
          toast.success('Resource linked to video');
          dispatchRelocate({ type: 'CLOSE' });
          onRefresh?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to change video link');
        }
      } else {
        const fd = new FormData();
        fd.append('resource_id', relocateState.resourceId);
        fd.append('placement', relocateState.placement);
        if (relocateState.placement !== 'end' && relocateState.refItemId) {
          fd.append('reference_item_id', relocateState.refItemId);
        }
        const res = await relocateCurriculumResourceAction(fd);
        if (res.ok) {
          toast.success('Placement updated');
          dispatchRelocate({ type: 'CLOSE' });
          onRefresh?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to update placement');
        }
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      dispatchRelocate({ type: 'SAVE_END' });
    }
  }, [
    relocateState.resourceId,
    relocateState.mode,
    relocateState.placement,
    relocateState.refItemId,
    onRefresh,
    router,
  ]);

  return (
    <ResourceListContent
      resources={resources}
      moduleId={moduleId}
      items={items}
      deleteState={deleteState}
      promoteState={promoteState}
      relocateState={relocateState}
      dispatchDelete={dispatchDelete}
      dispatchPromote={dispatchPromote}
      dispatchRelocate={dispatchRelocate}
      handleDownload={handleDownload}
      handleUnattach={handleUnattach}
      handleDelete={handleDelete}
      handlePromote={handlePromote}
      handleRelocate={handleRelocate}
      onEdit={onEdit}
    />
  );
}
