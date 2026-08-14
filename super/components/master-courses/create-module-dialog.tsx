'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  createModuleInsideCourseAction,
  updateModuleInsideCourseAction,
} from '@/app/(app)/master-courses/actions';
import {
  createBootcampModuleAction,
  updateBootcampModuleAction,
} from '@/app/(app)/bootcamps/actions';
import type { MasterCourseModulesRow } from '@/types/database';

interface CreateModuleDialogProps {
  /** Pillar context (default) — uses createModuleInsideCourseAction. */
  context?: 'pillar' | 'bootcamp';
  /** Pillar parent (required when context='pillar'). */
  pillarId?: string;
  /** Bootcamp parent (required when context='bootcamp'). */
  bootcampId?: string;
  courseId: string;
  module?: MasterCourseModulesRow;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function CreateModuleDialog({
  context = 'pillar',
  pillarId,
  bootcampId,
  courseId,
  module,
  trigger,
  children,
}: CreateModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isEdit = !!module;

  const [values, setValues] = useState(() => ({
    title: module?.title || '',
    description: module?.description || '',
    sort_order: module?.sort_order ?? 0,
    visible_to_students: module?.visible_to_students ?? true,
  }));

  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
    setErrors({});

    const formData = new FormData();
    if (context === 'pillar') {
      if (pillarId) formData.append('pillar_id', pillarId);
    } else {
      if (bootcampId) formData.append('bootcamp_id', bootcampId);
    }
    formData.append('course_id', courseId);
    if (isEdit) formData.append('module_id', module!.id);

    Object.entries(values).forEach(([key, value]) => {
      // Let the server assign the next gap (latest sort_order + 10). Sending 0
      // prevented auto-increment and duplicated "0." for every new module.
      if (!isEdit && key === 'sort_order') return;
      formData.append(key, String(value));
    });

    try {
      const result =
        context === 'bootcamp'
          ? isEdit
            ? await updateBootcampModuleAction(formData)
            : await createBootcampModuleAction(formData)
          : isEdit
            ? await updateModuleInsideCourseAction(formData)
            : await createModuleInsideCourseAction(formData);

      if (result.ok) {
        toast.success(isEdit ? 'Module updated' : 'Module created');
        setOpen(false);
        if (!isEdit) {
          setValues({
            title: '',
            description: '',
            sort_order: 0,
            visible_to_students: true,
          });
        }
        router.refresh();
      } else {
        toast.error(result.error ?? 'An error occurred');
      }
    } catch {
      toast.error('An unexpected error occurred');
    }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || trigger || (
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Add Module
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border border-border/60 shadow-xl rounded-xl">
        <DialogHeader className="space-y-2 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Plus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                {isEdit ? 'Edit Module' : 'Create Module'}
              </DialogTitle>
              <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
                {isEdit
                  ? 'Update module title and visibility settings.'
                  : context === 'bootcamp'
                    ? 'Establish a new module inside this bootcamp course. A TPStreams module folder is auto-synced under Bootcamp → Course → Module.'
                    : 'Establish a new module with automated TPStreams folder synchronization.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-6">
          <div className="space-y-2">
            <Label htmlFor="module-title" className="text-sm font-semibold text-foreground ml-1">Module Title</Label>
            <Input
              id="module-title"
              placeholder="e.g. Introduction to React"
              className="h-12 border-border/60 focus-visible:border-primary/40 font-medium text-base"
              value={values.title}
              onChange={(e) => setValues(prev => ({ ...prev, title: e.target.value }))}
              required
            />
            {errors.title && <p className="text-xs font-semibold text-destructive mt-1.5 ml-1 flex items-center gap-1.5 before:content-[''] before:size-1 before:bg-destructive before:rounded-full">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-description" className="text-sm font-semibold text-foreground ml-1">Learning Objectives</Label>
            <Textarea
              id="module-description"
              placeholder="What will students learn in this module?"
              className="border-border/60 focus-visible:border-primary/40 min-h-[100px] font-medium leading-relaxed resize-none"
              value={values.description}
              onChange={(e) => setValues(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="module-sort" className="text-sm font-semibold text-foreground ml-1">Sequence Order</Label>
              <Input
                id="module-sort"
                type="number"
                min={0}
                className="h-11 border-border/60 focus-visible:border-primary/40 font-semibold"
                value={values.sort_order}
                onChange={(e) => setValues(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4 bg-muted/20 hover:border-primary/30 transition-colors cursor-pointer group">
            <Label htmlFor="module-visible" className="text-[13px] font-medium cursor-pointer group-hover:text-primary transition-colors">
              Public Visibility
            </Label>
            <Switch
              id="module-visible"
              checked={values.visible_to_students}
              onCheckedChange={(v) => setValues(prev => ({ ...prev, visible_to_students: v }))}
            />
          </div>

          {!isEdit && (
            <div className="bg-primary/[0.04] p-4 rounded-xl border border-primary/15 text-primary/80">
              <p className="text-[11px] font-semibold opacity-60 mb-0.5">TPStreams Automation</p>
              <p className="text-[12px] font-medium leading-relaxed">
                {context === 'bootcamp'
                  ? 'A dedicated storage directory will be synchronized under Bootcamp → Course → Module for this module\'s video assets.'
                  : 'A dedicated storage directory will be synchronized under the parent course for this module\'s video assets.'}
              </p>
            </div>
          )}

          <DialogFooter className="gap-3 sm:gap-0 pt-4 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending} className="font-medium text-muted-foreground hover:text-foreground">
              Discard
            </Button>
            <Button type="submit" disabled={isPending} className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/10 transition-colors rounded-lg">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Confirm & Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
