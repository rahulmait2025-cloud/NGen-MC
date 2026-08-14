'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  listNoteCollectionsAction,
  archiveNoteCollectionAction,
  unarchiveNoteCollectionAction,
  listNoteCourseLinksAction,
  listMasterCoursesForSelectorAction,
  getNoteDeletePreviewAction,
  deleteNoteCollectionDeepAction,
} from './notes-actions';
import type { DeepDeletePreviewInfo } from '@/components/notes/course-linked/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  FileText,
  Archive,
  ArchiveRestore,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface NoteCollection {
  id: string;
  title: string;
  slug: string;
  visibility_scope: string;
  pricing_model: string;
  price_minor: number | null;
  publish_status: string;
  source_type: string | null;
  catalog_visibility: string | null;
  created_at: string;
  archived_at: string | null;
}

interface NoteCourseLink {
  id: string;
  note_collection_id: string;
  course_id: string;
  module_id: string | null;
  item_id: string | null;
}

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

function formatPrice(priceMinor: number | null): string {
  if (priceMinor == null) return '—';
  return `₹${priceMinor.toLocaleString('en-IN')}`;
}

function PublishBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    published: {
      label: 'Published',
      className:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    },
    unpublished: {
      label: 'Unpublished',
      className: 'bg-muted text-muted-foreground',
    },
    draft: {
      label: 'Draft',
      className: 'bg-muted text-muted-foreground/70',
    },
  };
  const { label, className } = config[status] ?? config.draft;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function VisibilityBadge({ scope }: { scope: string }) {
  const config: Record<string, { label: string; className: string }> = {
    global: {
      label: 'Global',
      className: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
    },
    selected_colleges: {
      label: 'Selected',
      className: 'text-violet-600 dark:text-violet-400 bg-violet-500/10',
    },
    private: {
      label: 'Private',
      className: 'text-muted-foreground bg-muted',
    },
  };
  const { label, className } = config[scope] ?? config.private;
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function SourceTypeBadge({ sourceType, catalogVisibility }: { sourceType: string | null; catalogVisibility: string | null }) {
  if (sourceType === 'course_linked') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10">
        Course-linked
      </span>
    );
  }
  if (catalogVisibility === 'hidden_course_attached') {
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground bg-muted">
        Hidden
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
      Standalone
    </span>
  );
}

function PricingCell({
  pricingModel,
  priceMinor,
}: {
  pricingModel: string;
  priceMinor: number | null;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium capitalize text-foreground">
        {pricingModel || 'free'}
      </span>
      {priceMinor != null && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatPrice(priceMinor)}
        </span>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [collections, setCollections] = useState<NoteCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [courseLinksByNote, setCourseLinksByNote] = useState<Record<string, NoteCourseLink[]>>({});
  const [courseOptions, setCourseOptions] = useState<Record<string, string>>({});

  // Deep deletion flow state
  const [deepDeleteDialogOpen, setDeepDeleteDialogOpen] = useState(false);
  const [deepDeletingTarget, setDeepDeletingTarget] = useState<string | null>(null);
  const [deepDeletePreview, setDeepDeletePreview] = useState<DeepDeletePreviewInfo | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [deepDeleting, setDeepDeleting] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const [colResult, courseResult] = await Promise.all([
        listNoteCollectionsAction(),
        listMasterCoursesForSelectorAction(),
      ]);

      if (colResult.ok && Array.isArray(colResult.data)) {
        setCollections(colResult.data);

        // Build course name lookup
        if (courseResult.ok && Array.isArray(courseResult.data)) {
          const lookup: Record<string, string> = {};
          for (const c of courseResult.data as CourseOption[]) {
            lookup[c.id] = c.title;
          }
          setCourseOptions(lookup);
        }

        // Fetch course links for course-linked collections
        const courseLinkedIds = colResult.data
          .filter((c: NoteCollection) => c.source_type === 'course_linked')
          .map((c: NoteCollection) => c.id);

        if (courseLinkedIds.length > 0) {
          const linkResults = await Promise.all(
            courseLinkedIds.map((id: string) => listNoteCourseLinksAction(id)),
          );
          const linksMap: Record<string, NoteCourseLink[]> = {};
          for (let i = 0; i < courseLinkedIds.length; i++) {
            const res = linkResults[i];
            if (res.ok && Array.isArray(res.data)) {
              linksMap[courseLinkedIds[i]] = res.data as NoteCourseLink[];
            }
          }
          setCourseLinksByNote(linksMap);
        }
      } else {
        toast.error(colResult.error || 'Failed to load collections');
      }
    } catch {
      toast.error('Failed to load note collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  async function handleArchive(id: string) {
    setArchivingId(id);
    try {
      const result = await archiveNoteCollectionAction(id);
      if (result.ok) {
        toast.success('Collection archived');
        await fetchCollections();
      } else {
        toast.error(result.error || 'Failed to archive');
      }
    } catch {
      toast.error('Failed to archive collection');
    } finally {
      setArchivingId(null);
    }
  }

  async function handleUnarchive(id: string) {
    setArchivingId(id);
    try {
      const result = await unarchiveNoteCollectionAction(id);
      if (result.ok) {
        toast.success('Collection restored');
        await fetchCollections();
      } else {
        toast.error(result.error || 'Failed to restore');
      }
    } catch {
      toast.error('Failed to restore collection');
    } finally {
      setArchivingId(null);
    }
  }

  const openDeepDeleteDialog = useCallback(async (noteCollectionId: string) => {
    setDeepDeletingTarget(noteCollectionId);
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
        toast.success('Note collection and related course resources deleted permanently');
        setDeepDeleteDialogOpen(false);
        setDeepDeletingTarget(null);
        setDeepDeletePreview(null);
        await fetchCollections();
      } else {
        toast.error(res.error || 'Failed to delete note collection');
      }
    } catch {
      toast.error('Something went wrong during deletion');
    } finally {
      setDeepDeleting(false);
    }
  }, [deepDeletingTarget, confirmDeleteText, fetchCollections]);

  const archivedCount = collections.filter((c) => c.archived_at).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Actions Row */}
      {!loading && collections.length > 0 && (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href="/notes/new">
              <Plus className="size-4 mr-1.5" />
              Add Notes Collection
            </Link>
          </Button>
        </div>
      )}

      {/* Archived note */}
      {archivedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2.5 border border-border/40">
          <Archive className="size-3.5" />
          <span>
            {archivedCount} archived{' '}
            {archivedCount === 1 ? 'collection' : 'collections'} hidden from
            view.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading collections…
            </div>
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">
              No note collections yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs">
              Create your first notes collection to start adding handwritten or
              scanned notes.
            </p>
            <Button asChild size="sm" className="mt-5">
              <Link href="/notes/new">
                <Plus className="size-4 mr-1.5" />
                Create Collection
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[1.4fr_1fr_80px_90px_80px_90px_110px] gap-4 px-5 py-2.5 bg-muted/50 border-b border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Title
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Slug
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Source
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Visibility
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Pricing
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                Actions
              </span>
            </div>

            {/* Table Rows */}
            {collections.map((collection, index) => (
              <div
                key={collection.id}
                className={`grid grid-cols-[1.4fr_1fr_80px_90px_80px_90px_110px] gap-4 px-5 py-3.5 items-center transition-colors hover:bg-muted/40 ${
                  index < collections.length - 1
                    ? 'border-b border-border/40'
                    : ''
                }`}
              >
                {/* Title */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/notes/${collection.id}/edit`}
                        className="block text-sm font-medium text-foreground truncate hover:underline"
                      >
                        {collection.title}
                      </Link>
                      {collection.archived_at && (
                        <span className="text-[11px] text-muted-foreground/70">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slug */}
                <div className="text-xs text-muted-foreground font-mono truncate min-w-0">
                  {collection.slug}
                </div>

                {/* Source */}
                <div className="min-w-0">
                  <SourceTypeBadge
                    sourceType={collection.source_type}
                    catalogVisibility={collection.catalog_visibility}
                  />
                  {collection.source_type === 'course_linked' && courseLinksByNote[collection.id] && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {courseLinksByNote[collection.id].map((link) => (
                        <span key={link.id} className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {courseOptions[link.course_id] ?? link.course_id?.slice(0, 8)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visibility */}
                <div>
                  <VisibilityBadge scope={collection.visibility_scope} />
                </div>

                {/* Pricing */}
                <div>
                  <PricingCell
                    pricingModel={collection.pricing_model}
                    priceMinor={collection.price_minor}
                  />
                </div>

                {/* Status */}
                <div>
                  <PublishBadge status={collection.publish_status} />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/notes/${collection.id}/edit`}
                    className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="size-3.5" />
                    <span className="ml-1">Edit</span>
                  </Link>

                  {collection.archived_at ? (
                    <button
                      onClick={() => handleUnarchive(collection.id)}
                      disabled={archivingId === collection.id}
                      className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition-colors disabled:opacity-50"
                      title="Restore"
                    >
                      <ArchiveRestore className="size-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(collection.id)}
                      disabled={archivingId === collection.id}
                      className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 transition-colors disabled:opacity-50"
                      title="Archive"
                    >
                      <Archive className="size-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => openDeepDeleteDialog(collection.id)}
                    className="inline-flex items-center justify-center rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Deep Delete Note Confirmation Dialog */}
      <Dialog open={deepDeleteDialogOpen} onOpenChange={setDeepDeleteDialogOpen}>
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
          ) : deepDeletePreview ? (
            <div className="space-y-4 text-sm py-2">
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <div className="font-semibold text-foreground">{deepDeletePreview.title}</div>
                <div className="text-xs text-muted-foreground">Source: {deepDeletePreview.sourceType || 'Standalone'}</div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Linked Scopes</div>
                {deepDeletePreview.linkedScopes && deepDeletePreview.linkedScopes.length > 0 ? (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto border rounded-md p-2 bg-background">
                    {deepDeletePreview.linkedScopes.map((scope, index) => (
                      <div key={scope.linkId || index} className="text-xs space-y-0.5 border-b last:border-b-0 pb-1 last:pb-0 mb-1 last:mb-0">
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
                    <span className="font-semibold">{deepDeletePreview.moduleCount}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Note Pages:</span>
                    <span className="font-semibold">{deepDeletePreview.pageCount}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Course Links:</span>
                    <span className="font-semibold">{deepDeletePreview.linkCount}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-muted-foreground">Excalidraw Rows:</span>
                    <span className="font-semibold text-red-600">{deepDeletePreview.excalidrawResourceCount}</span>
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
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  className="border-red-300 focus-visible:ring-red-500 font-semibold"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeepDeleteDialogOpen(false);
                setDeepDeletingTarget(null);
                setDeepDeletePreview(null);
              }}
              disabled={deepDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deepDeleting || loadingPreview || confirmDeleteText !== 'DELETE'}
              onClick={handleDeepDelete}
            >
              {deepDeleting ? (
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
    </div>
  );
}
