'use client';

import { useState, useCallback, useTransition, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, FileText, File, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  createStandaloneResourceAction,
  promoteResourceToCurriculumAction,
} from '@/app/(app)/master-courses/[courseId]/course-resources-actions';
import type { MasterCourseItemsRow, CourseResourceFileType, CourseResourcesRow } from '@/types/database';

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  markdown: <FileText className="size-4 text-blue-500" />,
  pdf: <File className="size-4 text-red-500" />,
  external_link: <Link2 className="size-4 text-purple-500" />,
};

interface StandaloneResourceInsertDialogProps {
  courseId: string;
  moduleId: string;
  items: MasterCourseItemsRow[];
  resources: CourseResourcesRow[];
  context?: 'pillar' | 'bootcamp';
  bootcampId?: string;
  children?: React.ReactNode;
  onCreated?: () => void;
}

type ResourceFormState = {
  mode: 'new' | 'existing';
  selectedResourceId: string;
  title: string;
  description: string;
  resourceType: CourseResourceFileType;
  placement: string;
  referenceItemId: string;
  contentMarkdown: string;
  externalUrl: string;
};

type ResourceFormAction =
  | { type: 'RESET' }
  | { type: 'SET_MODE'; value: 'new' | 'existing' }
  | { type: 'SET_SELECTED_RESOURCE'; value: string }
  | { type: 'SET_TITLE'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_RESOURCE_TYPE'; value: CourseResourceFileType }
  | { type: 'SET_PLACEMENT'; value: string }
  | { type: 'SET_REFERENCE_ITEM'; value: string }
  | { type: 'SET_CONTENT_MARKDOWN'; value: string }
  | { type: 'SET_EXTERNAL_URL'; value: string };

const initialFormState: ResourceFormState = {
  mode: 'new',
  selectedResourceId: '',
  title: '',
  description: '',
  resourceType: 'pdf',
  placement: 'end',
  referenceItemId: '',
  contentMarkdown: '',
  externalUrl: '',
};

function resourceFormReducer(state: ResourceFormState, action: ResourceFormAction): ResourceFormState {
  switch (action.type) {
    case 'RESET': return initialFormState;
    case 'SET_MODE': return { ...state, mode: action.value };
    case 'SET_SELECTED_RESOURCE': return { ...state, selectedResourceId: action.value };
    case 'SET_TITLE': return { ...state, title: action.value };
    case 'SET_DESCRIPTION': return { ...state, description: action.value };
    case 'SET_RESOURCE_TYPE': return { ...state, resourceType: action.value };
    case 'SET_PLACEMENT': return { ...state, placement: action.value };
    case 'SET_REFERENCE_ITEM': return { ...state, referenceItemId: action.value };
    case 'SET_CONTENT_MARKDOWN': return { ...state, contentMarkdown: action.value };
    case 'SET_EXTERNAL_URL': return { ...state, externalUrl: action.value };
  }
}

interface ResourceInsertFormContentProps {
  mode: string;
  dispatchForm: React.Dispatch<ResourceFormAction>;
  title: string;
  description: string;
  resourceType: CourseResourceFileType;
  contentMarkdown: string;
  externalUrl: string;
  selectedResourceId: string;
  availableResources: CourseResourcesRow[];
  placement: string;
  referenceItemId: string;
  items: MasterCourseItemsRow[];
  canSubmit: boolean;
  isPending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}

function ResourceInsertFormContent({
  mode, dispatchForm, title, description, resourceType, contentMarkdown, externalUrl,
  selectedResourceId, availableResources, placement, referenceItemId, items,
  canSubmit, isPending, onCancel, onSubmit, submitLabel,
}: ResourceInsertFormContentProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => dispatchForm({ type: 'SET_MODE', value: 'new' })}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                mode === 'new'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create New
            </button>
            <button
              type="button"
              onClick={() => dispatchForm({ type: 'SET_MODE', value: 'existing' })}
              disabled={availableResources.length === 0}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                mode === 'existing'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              Use Existing ({availableResources.length})
            </button>
          </div>
        </div>

        {mode === 'existing' && (
          <div className="space-y-1.5">
            <Label>Select Resource *</Label>
            <Select value={selectedResourceId} onValueChange={(v) => dispatchForm({ type: 'SET_SELECTED_RESOURCE', value: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an uploaded resource" />
              </SelectTrigger>
              <SelectContent position="popper">
                {availableResources.length === 0 ? (
                  <SelectItem value="none" disabled>No available resources</SelectItem>
                ) : (
                  availableResources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex items-center gap-2">
                        {RESOURCE_ICONS[r.resource_type]}
                        <span>{r.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({r.resource_type === 'pdf' ? 'PDF' : r.resource_type === 'markdown' ? 'Note' : 'Link'})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'new' && (
          <>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => dispatchForm({ type: 'SET_TITLE', value: e.target.value })} placeholder="Resource title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => dispatchForm({ type: 'SET_DESCRIPTION', value: e.target.value })} placeholder="Optional description" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Resource Type *</Label>
              <Select value={resourceType} onValueChange={(v) => dispatchForm({ type: 'SET_RESOURCE_TYPE', value: v as CourseResourceFileType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="markdown">Markdown Note</SelectItem>
                  <SelectItem value="external_link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {resourceType === 'markdown' && (
              <div className="space-y-1.5">
                <Label>Markdown Content</Label>
                <Textarea value={contentMarkdown} onChange={(e) => dispatchForm({ type: 'SET_CONTENT_MARKDOWN', value: e.target.value })} placeholder="# Heading&#10;&#10;Write your notes here..." rows={8} className="font-mono text-sm" />
              </div>
            )}
            {resourceType === 'external_link' && (
              <div className="space-y-1.5">
                <Label>URL *</Label>
                <Input value={externalUrl} onChange={(e) => dispatchForm({ type: 'SET_EXTERNAL_URL', value: e.target.value })} placeholder="https://..." type="url" />
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label>Placement *</Label>
          <RadioGroup value={placement} onValueChange={(v) => dispatchForm({ type: 'SET_PLACEMENT', value: v })}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="end" id="placement-end" />
              <Label htmlFor="placement-end" className="font-normal cursor-pointer">End of module</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="before" id="placement-before" />
              <Label htmlFor="placement-before" className="font-normal cursor-pointer">Before item</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="after" id="placement-after" />
              <Label htmlFor="placement-after" className="font-normal cursor-pointer">After item</Label>
            </div>
          </RadioGroup>
        </div>

        {placement !== 'end' && (
          <div className="space-y-1.5">
            <Label>Select Item *</Label>
            <Select value={referenceItemId} onValueChange={(v) => dispatchForm({ type: 'SET_REFERENCE_ITEM', value: v })}>
              <SelectTrigger><SelectValue placeholder="Choose an item" /></SelectTrigger>
              <SelectContent position="popper">
                {items.length === 0 ? (
                  <SelectItem value="none" disabled>No items in this module</SelectItem>
                ) : (
                  items.map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button disabled={!canSubmit || isPending} onClick={onSubmit}>
          {isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

export function StandaloneResourceInsertDialog({
  courseId,
  moduleId,
  items,
  resources,
  context: _context = 'pillar',
  bootcampId: _bootcampId,
  children,
  onCreated,
}: StandaloneResourceInsertDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [form, dispatchForm] = useReducer(resourceFormReducer, initialFormState);
  const { mode, selectedResourceId, title, description, resourceType, placement, referenceItemId, contentMarkdown, externalUrl } = form;

  const availableResources = resources;

  const reset = () => {
    dispatchForm({ type: 'RESET' });
  };

  const handleCreateNew = useCallback(() => {
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('master_course_id', courseId);
        fd.append('module_id', moduleId);
        fd.append('title', title);
        fd.append('description', description);
        fd.append('resource_type', resourceType);
        fd.append('placement', placement);
        if (placement !== 'end' && referenceItemId) {
          fd.append('reference_item_id', referenceItemId);
        }
        if (resourceType === 'markdown' && contentMarkdown) {
          fd.append('content_markdown', contentMarkdown);
        }
        if (resourceType === 'external_link' && externalUrl) {
          fd.append('external_url', externalUrl);
        }

        const res = await createStandaloneResourceAction(fd);
        if (res.ok) {
          toast.success('Resource created as curriculum item');
          setOpen(false);
          reset();
          onCreated?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to create resource');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }, [courseId, moduleId, title, description, resourceType, placement, referenceItemId, contentMarkdown, externalUrl, onCreated, router]);

  const handleUseExisting = useCallback(() => {
    if (!selectedResourceId) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append('resource_id', selectedResourceId);
        fd.append('placement', placement);
        if (placement !== 'end' && referenceItemId) {
          fd.append('reference_item_id', referenceItemId);
        }

        const res = await promoteResourceToCurriculumAction(fd);
        if (res.ok) {
          toast.success('Resource published as curriculum item');
          setOpen(false);
          reset();
          onCreated?.();
          router.refresh();
        } else {
          toast.error(res.error ?? 'Failed to publish resource');
        }
      } catch {
        toast.error('An unexpected error occurred');
      }
    });
  }, [selectedResourceId, placement, referenceItemId, onCreated, router]);

  const canSubmit =
    placement === 'end' || referenceItemId
      ? mode === 'new'
        ? !!(title.trim() &&
          (resourceType !== 'external_link' || externalUrl.trim()))
        : !!selectedResourceId
      : false;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 size-3.5" />
            Add as Curriculum Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add as Curriculum Item</DialogTitle>
          <DialogDescription>
            Add a standalone lesson to the course curriculum. Create a new resource or use one you already uploaded.
          </DialogDescription>
        </DialogHeader>
        <ResourceInsertFormContent
          mode={mode}
          dispatchForm={dispatchForm}
          title={title}
          description={description}
          resourceType={resourceType}
          contentMarkdown={contentMarkdown}
          externalUrl={externalUrl}
          selectedResourceId={selectedResourceId}
          availableResources={availableResources}
          placement={placement}
          referenceItemId={referenceItemId}
          items={items}
          canSubmit={canSubmit}
          isPending={isPending}
          onCancel={() => setOpen(false)}
          onSubmit={mode === 'new' ? handleCreateNew : handleUseExisting}
          submitLabel={mode === 'new' ? 'Create & Add' : 'Add to Curriculum'}
        />
      </DialogContent>
    </Dialog>
  );
}
