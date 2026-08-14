'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertCircle } from 'lucide-react';
import { DeepDeletePreviewInfo } from './types';

// ─── 1. CreateNoteDialog ────────────────────────────────────────────────────
interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  moduleTitle: string;
  noteTitle: string;
  noteSlug: string;
  noteDescription: string;
  creating: boolean;
  onTitleChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onCreate: () => void;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  itemTitle,
  moduleTitle,
  noteTitle,
  noteSlug,
  noteDescription,
  creating,
  onTitleChange,
  onSlugChange,
  onDescriptionChange,
  onCreate,
}: CreateNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Notes</DialogTitle>
          <DialogDescription>
            Create and link notes for &quot;{itemTitle}&quot; in module &quot;{moduleTitle}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="note-title">Note Title *</Label>
            <Input
              id="note-title"
              value={noteTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. Introduction to C - Notes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-slug">Slug *</Label>
            <Input
              id="note-slug"
              value={noteSlug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="auto-generated-from-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-description">Short Description (optional)</Label>
            <Textarea
              id="note-description"
              value={noteDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
              placeholder="Brief description of these notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={onCreate}
            disabled={creating || !noteTitle.trim() || !noteSlug.trim()}
          >
            {creating ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Creating...
              </>
            ) : (
              'Create and Link Notes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 2. UnlinkConfirmDialog ─────────────────────────────────────────────────
interface UnlinkConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteTitle: string;
  unlinking: boolean;
  onConfirm: () => void;
}

export function UnlinkConfirmDialog({
  open,
  onOpenChange,
  noteTitle,
  unlinking,
  onConfirm,
}: UnlinkConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlink Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to unlink &quot;{noteTitle}&quot; from this item? The note collection
            will not be deleted, but it will no longer be linked to this course item.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={unlinking}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={unlinking}>
            {unlinking ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Unlinking...
              </>
            ) : (
              'Unlink Note'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 3. ManageExcalidrawDialog ──────────────────────────────────────────────
interface ManageExcalidrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  itemTitle: string;
  moduleTitle: string;
  title: string;
  subtitle: string;
  url: string;
  saving: boolean;
  onTitleChange: (val: string) => void;
  onSubtitleChange: (val: string) => void;
  onUrlChange: (val: string) => void;
  onSave: () => void;
}

export function ManageExcalidrawDialog({
  open,
  onOpenChange,
  mode,
  itemTitle,
  moduleTitle,
  title,
  subtitle,
  url,
  saving,
  onTitleChange,
  onSubtitleChange,
  onUrlChange,
  onSave,
}: ManageExcalidrawDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Excalidraw' : 'Add Excalidraw'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Edit Excalidraw whiteboard for "${itemTitle}".`
              : `Add an Excalidraw whiteboard for "${itemTitle}" in module "${moduleTitle}".`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="excalidraw-title">Title *</Label>
            <Input
              id="excalidraw-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="e.g. C Variables Diagram"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excalidraw-subtitle">Subtitle (optional)</Label>
            <Input
              id="excalidraw-subtitle"
              value={subtitle}
              onChange={(e) => onSubtitleChange(e.target.value)}
              placeholder="e.g. Visual explanation"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excalidraw-url">Excalidraw URL *</Label>
            <Input
              id="excalidraw-url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="https://excalidraw.com/..."
            />
            <p className="text-xs text-muted-foreground">
              Paste the Excalidraw board URL. Students will see the scene contents rendered in the player.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || !title.trim() || !url.trim()}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Saving...
              </>
            ) : mode === 'edit' ? (
              'Update Excalidraw'
            ) : (
              'Add Excalidraw'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 4. RemoveExcalidrawDialog ──────────────────────────────────────────────
interface RemoveExcalidrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  removing: boolean;
  onConfirm: () => void;
}

export function RemoveExcalidrawDialog({
  open,
  onOpenChange,
  title,
  removing,
  onConfirm,
}: RemoveExcalidrawDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Excalidraw</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove &quot;{title}&quot; from this item? This will only remove
            the resource link, not the Excalidraw board itself.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={removing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={removing}>
            {removing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Removing...
              </>
            ) : (
              'Remove Excalidraw'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 5. UnpublishAllConfirmDialog ───────────────────────────────────────────
interface UnpublishAllConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unpublishing: boolean;
  onConfirm: () => void;
}

export function UnpublishAllConfirmDialog({
  open,
  onOpenChange,
  unpublishing,
  onConfirm,
}: UnpublishAllConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unpublish All from LMS</DialogTitle>
          <DialogDescription>
            This will hide all linked notes and Excalidraw resources for this course from students.
            Existing links will remain. Students will no longer see these resources in the course player.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={unpublishing}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={unpublishing}>
            {unpublishing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Unpublishing...
              </>
            ) : (
              'Unpublish All'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 6. DeepDeleteNoteDialog ────────────────────────────────────────────────
interface DeepDeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingPreview: boolean;
  preview: DeepDeletePreviewInfo | null;
  confirmText: string;
  deleting: boolean;
  onConfirmTextChange: (val: string) => void;
  onConfirm: () => void;
}

export function DeepDeleteNoteDialog({
  open,
  onOpenChange,
  loadingPreview,
  preview,
  confirmText,
  deleting,
  onConfirmTextChange,
  onConfirm,
}: DeepDeleteNoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertCircle className="size-5 shrink-0" />
            Delete Note Collection Permanently
          </DialogTitle>
          <DialogDescription>
            This is a destructive operation. This note collection will be permanently deleted from the workspace and student LMS access will be immediately revoked.
          </DialogDescription>
        </DialogHeader>

        {loadingPreview ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
            <Loader2 className="size-4 animate-spin" /> Fetching dependency details...
          </div>
        ) : preview ? (
          <div className="space-y-4 text-sm py-2">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <div className="font-semibold text-foreground">{preview.title}</div>
              <div className="text-xs text-muted-foreground">Source: {preview.sourceType || 'Standalone'}</div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Linked Scopes</div>
              {preview.linkedScopes && preview.linkedScopes.length > 0 ? (
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto border rounded-md p-2 bg-background">
                  {preview.linkedScopes.map((scope, index) => (
                    <div key={scope.linkId || index} className="text-xs space-y-0.5 border-b last:border-0 pb-1 last:pb-0 mb-1 last:mb-0">
                      <div className="font-medium text-foreground">Course: {scope.courseTitle} {scope.courseCode ? `(${scope.courseCode})` : ''}</div>
                      {scope.moduleTitle && <div className="text-muted-foreground/90">Module: {scope.moduleTitle}</div>}
                      {scope.itemTitle && <div className="text-muted-foreground">Video: {scope.itemTitle}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No active course links.</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Entities To Be Destroyed</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Note Modules:</span>
                  <span className="font-semibold">{preview.moduleCount}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Note Pages:</span>
                  <span className="font-semibold">{preview.pageCount}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Course Links:</span>
                  <span className="font-semibold">{preview.linkCount}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Excalidraw Rows:</span>
                  <span className="font-semibold text-red-600">{preview.excalidrawResourceCount}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                * Associated cover images/files in storage will also be purged. Master courses, videos, and student progress are unaffected.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="delete-confirm-input" className="text-xs font-semibold text-red-600">
                Type <span className="font-bold underline">DELETE</span> to confirm permanent deletion:
              </Label>
              <Input
                id="delete-confirm-input"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => onConfirmTextChange(e.target.value)}
                className="border-red-300 focus-visible:ring-red-500 font-semibold"
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={deleting || loadingPreview || confirmText !== 'DELETE'}
            onClick={onConfirm}
          >
            {deleting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" /> Deleting...
              </>
            ) : (
              'Permanently Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
