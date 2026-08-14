'use client';

import { useState, useCallback, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  File,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getCourseResourcesAction,
  createMarkdownResourceAction,
  uploadPdfResourceAction,
  uploadMarkdownFileAction,
  updateResourceAction,
} from '@/app/(app)/master-courses/[courseId]/course-resources-actions';
import { ResourceList } from './resource-list';
import { MarkdownResourceEditor } from './markdown-resource-editor';
import { ResourceUploadDropzone } from './resource-upload-dropzone';
import { StandaloneResourceInsertDialog } from './standalone-resource-insert-dialog';
import { AttachResourceDialog } from './attach-resource-dialog';
import type { CourseResourceWithItem, MasterCourseItemsRow } from '@/types/database';

interface CourseResourceManagerProps {
  courseId: string;
  moduleId: string;
  moduleTitle?: string;
  items: MasterCourseItemsRow[];
  context?: 'pillar' | 'bootcamp';
  bootcampId?: string;
  /** Notify parent when module resources change (for video-side link badges). */
  onResourcesChange?: (resources: CourseResourceWithItem[]) => void;
}

type ViewMode = 'list' | 'new-markdown' | 'upload-pdf' | 'upload-markdown-file';

type ResourceDataState = { resources: CourseResourceWithItem[]; loading: boolean };
type ResourceDataAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_END'; resources: CourseResourceWithItem[] };

function resourceDataReducer(state: ResourceDataState, action: ResourceDataAction): ResourceDataState {
  switch (action.type) {
    case 'LOAD_START': return { ...state, loading: true };
    case 'LOAD_END': return { resources: action.resources, loading: false };
  }
}

type ResourceUIState = { viewMode: ViewMode; editingResource: CourseResourceWithItem | null };
type ResourceUIAction =
  | { type: 'SET_VIEW'; viewMode: ViewMode }
  | { type: 'SET_EDIT'; resource: CourseResourceWithItem | null; viewMode?: ViewMode };

function resourceUIReducer(state: ResourceUIState, action: ResourceUIAction): ResourceUIState {
  switch (action.type) {
    case 'SET_VIEW': return { ...state, viewMode: action.viewMode };
    case 'SET_EDIT': return { editingResource: action.resource, viewMode: action.viewMode ?? state.viewMode };
  }
}

export function CourseResourceManager({
  courseId,
  moduleId,
  moduleTitle: _moduleTitle,
  items,
  context = 'pillar',
  bootcampId,
  onResourcesChange,
}: CourseResourceManagerProps) {
  const router = useRouter();
  const [{ resources, loading }, dispatchData] = useReducer(resourceDataReducer, { resources: [] as CourseResourceWithItem[], loading: true });
  const [{ viewMode, editingResource }, dispatchUI] = useReducer(resourceUIReducer, { viewMode: 'list' as ViewMode, editingResource: null } as ResourceUIState);
  const [expanded, setExpanded] = useState(true);

  const fetchResources = useCallback(async () => {
    dispatchData({ type: 'LOAD_START' });
    try {
      const res = await getCourseResourcesAction(courseId);
      if (res.ok && Array.isArray(res.data)) {
        const moduleScoped = (res.data as CourseResourceWithItem[]).filter((r) => r.module_id === moduleId);
        dispatchData({
          type: 'LOAD_END',
          resources: moduleScoped,
        });
        onResourcesChange?.(moduleScoped);
      } else {
        dispatchData({ type: 'LOAD_END', resources: [] });
        onResourcesChange?.([]);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
      dispatchData({ type: 'LOAD_END', resources: [] });
      onResourcesChange?.([]);
    }
  }, [courseId, moduleId, onResourcesChange]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const moduleResources = resources.filter((r) => r.module_id === moduleId);
  const moduleItems = items.filter((i) => i.module_id === moduleId);

  const handleCreateMarkdown = useCallback(
    async (title: string, content: string) => {
      const fd = new FormData();
      fd.append('master_course_id', courseId);
      fd.append('module_id', moduleId);
      fd.append('title', title);
      fd.append('content_markdown', content);
      const res = await createMarkdownResourceAction(fd);
      if (res.ok) {
        toast.success('Markdown note created');
        dispatchUI({ type: 'SET_VIEW', viewMode: 'list' });
        fetchResources();
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to create');
      }
    },
    [courseId, moduleId, fetchResources, router],
  );

  const handleUploadPdf = useCallback(
    async (file: File, title: string) => {
      const fd = new FormData();
      fd.append('master_course_id', courseId);
      fd.append('module_id', moduleId);
      fd.append('title', title);
      fd.append('file', file);
      const res = await uploadPdfResourceAction(fd);
      if (res.ok) {
        toast.success('PDF uploaded');
        dispatchUI({ type: 'SET_VIEW', viewMode: 'list' });
        fetchResources();
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to upload');
      }
    },
    [courseId, moduleId, fetchResources, router],
  );

  const handleUploadMarkdownFile = useCallback(
    async (file: File, title: string) => {
      const fd = new FormData();
      fd.append('master_course_id', courseId);
      fd.append('module_id', moduleId);
      fd.append('title', title);
      fd.append('file', file);
      const res = await uploadMarkdownFileAction(fd);
      if (res.ok) {
        toast.success('Markdown file uploaded');
        dispatchUI({ type: 'SET_VIEW', viewMode: 'list' });
        fetchResources();
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to upload');
      }
    },
    [courseId, moduleId, fetchResources, router],
  );

  const handleEditMarkdown = useCallback(
    async (title: string, content: string) => {
      if (!editingResource) return;
      const fd = new FormData();
      fd.append('resource_id', editingResource.id);
      fd.append('title', title);
      fd.append('content_markdown', content);
      const res = await updateResourceAction(fd);
      if (res.ok) {
        toast.success('Resource updated');
        dispatchUI({ type: 'SET_EDIT', resource: null, viewMode: 'list' });
        fetchResources();
        router.refresh();
      } else {
        toast.error(res.error ?? 'Failed to update');
      }
    },
    [editingResource, fetchResources, router],
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="size-3.5 text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-foreground">Resources & Notes</span>
          {moduleResources.length > 0 && (
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {moduleResources.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
          {/* Action bar */}
          {viewMode === 'list' && (
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-[12px] font-medium">
                    <Plus className="mr-1.5 size-3.5" />
                    New Resource
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuItem onClick={() => dispatchUI({ type: 'SET_VIEW', viewMode: 'new-markdown' })} className="gap-2.5 py-2">
                    <FileText className="size-4 text-blue-500" />
                    <div>
                      <p className="font-medium text-[12px]">Markdown Note</p>
                      <p className="text-[11px] text-muted-foreground">Write notes inline</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dispatchUI({ type: 'SET_VIEW', viewMode: 'upload-pdf' })} className="gap-2.5 py-2">
                    <File className="size-4 text-red-500" />
                    <div>
                      <p className="font-medium text-[12px]">Upload PDF</p>
                      <p className="text-[11px] text-muted-foreground">Upload a PDF file</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => dispatchUI({ type: 'SET_VIEW', viewMode: 'upload-markdown-file' })} className="gap-2.5 py-2">
                    <FileText className="size-4 text-purple-500" />
                    <div>
                      <p className="font-medium text-[12px]">Upload .md File</p>
                      <p className="text-[11px] text-muted-foreground">Upload markdown file</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-5 w-px bg-border/40" />

              <AttachResourceDialog
                resources={moduleResources}
                items={moduleItems}
                courseId={courseId}
                onAttached={() => {
                  fetchResources();
                  router.refresh();
                }}
              />

              <StandaloneResourceInsertDialog
                courseId={courseId}
                moduleId={moduleId}
                items={moduleItems}
                resources={moduleResources}
                context={context}
                bootcampId={bootcampId}
                onCreated={() => {
                  fetchResources();
                  router.refresh();
                }}
              />
            </div>
          )}

          {/* Editor views */}
          {viewMode === 'new-markdown' && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5">
              <MarkdownResourceEditor
                onSave={handleCreateMarkdown}
                onCancel={() => dispatchUI({ type: 'SET_VIEW', viewMode: 'list' })}
              />
            </div>
          )}

          {viewMode === 'upload-pdf' && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5">
              <ResourceUploadDropzone
                accept=".pdf"
                maxSizeMB={25}
                onUpload={handleUploadPdf}
                onCancel={() => dispatchUI({ type: 'SET_VIEW', viewMode: 'list' })}
              />
            </div>
          )}

          {viewMode === 'upload-markdown-file' && (
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3.5">
              <ResourceUploadDropzone
                accept=".md,.txt"
                maxSizeMB={2}
                onUpload={handleUploadMarkdownFile}
                onCancel={() => dispatchUI({ type: 'SET_VIEW', viewMode: 'list' })}
              />
            </div>
          )}

          {editingResource && viewMode === 'list' && (
            <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3.5 space-y-3">
              <p className="text-[11px] font-semibold text-primary">
                Editing: {editingResource.title}
              </p>
              {editingResource.resource_type === 'markdown' ? (
                <MarkdownResourceEditor
                  initialTitle={editingResource.title}
                  initialContent={editingResource.content_markdown ?? ''}
                  onSave={handleEditMarkdown}
                  onCancel={() => dispatchUI({ type: 'SET_EDIT', resource: null })}
                  saveLabel="Update"
                />
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Title</Label>
                    <Input
                      defaultValue={editingResource.title}
                      id="edit-resource-title"
                      placeholder="Resource title"
                      className="h-8 text-sm bg-background"
                      autoFocus
                    />
                  </div>
                  {editingResource.resource_type === 'external_link' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">URL</Label>
                      <Input
                        defaultValue={editingResource.external_url ?? ''}
                        id="edit-resource-url"
                        placeholder="https://example.com"
                        className="h-8 text-sm bg-background"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={async () => {
                        const titleVal = (document.getElementById('edit-resource-title') as HTMLInputElement | null)?.value?.trim();
                        if (!titleVal) {
                          toast.error('Title is required');
                          return;
                        }

                        const fd = new FormData();
                        fd.append('resource_id', editingResource.id);
                        fd.append('title', titleVal);

                        if (editingResource.resource_type === 'external_link') {
                          const urlVal = (document.getElementById('edit-resource-url') as HTMLInputElement | null)?.value?.trim();
                          if (urlVal) {
                            fd.append('external_url', urlVal);
                          }
                        }

                        try {
                          const res = await updateResourceAction(fd);
                          if (res.ok) {
                            toast.success('Resource updated');
                            dispatchUI({ type: 'SET_EDIT', resource: null });
                            fetchResources();
                            router.refresh();
                          } else {
                            toast.error(res.error ?? 'Failed to update resource');
                          }
                        } catch {
                          toast.error('An unexpected error occurred');
                        }
                      }}
                    >
                      Update
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs px-3"
                      onClick={() => dispatchUI({ type: 'SET_EDIT', resource: null })}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resource list */}
          {viewMode === 'list' && !editingResource && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResourceList
                  resources={moduleResources}
                  courseId={courseId}
                  moduleId={moduleId}
                  items={moduleItems}
                  context={context}
                  bootcampId={bootcampId}
                  onEdit={(r) => {
                    dispatchUI({ type: 'SET_EDIT', resource: r });
                  }}
                  onRefresh={fetchResources}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
